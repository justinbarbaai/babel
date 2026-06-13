// MBCapture — Market Bubble's window-capture helper.
//
// Holds a persistent ScreenCaptureKit STREAM per X-broadcast Chrome window
// (the OBS technique). One-shot SCScreenshotManager captures fail for windows
// on inactive Spaces; SCStream with a desktop-independent window filter keeps
// delivering frames for windows on other desktops and fullscreen Spaces.
// Minimized windows stop producing frames at the OS level — the bridge sees
// the frame age grow and flags it.
//
// Loop: every cycle, reconcile streams against the current window list and
// write each window's latest frame to /tmp/mbcap/<windowID>.png (atomic
// rename) plus meta.json. The Python bridge consumes both.
//
// Tunables live in ~/.mbcap.json so they can change WITHOUT rebuilding —
// every rebuild changes the ad-hoc signature and macOS revokes the Screen
// Recording grant. Keys: cycleSecs, minW, minH, appName, titleMarkers.
import AppKit
import Foundation
import ScreenCaptureKit
import CoreGraphics
import CoreImage
import CoreMedia
import CoreVideo
import ImageIO
import UniformTypeIdentifiers

let OUT = "/tmp/mbcap"

struct Config {
    var cycleSecs: Double = 3
    var minW: Double = 700
    var minH: Double = 450
    var appName = "Chrome"
    var titleMarkers = ["/ x", "· x"]
}
func loadConfig() -> Config {
    var c = Config()
    let path = NSHomeDirectory() + "/.mbcap.json"
    guard let data = FileManager.default.contents(atPath: path),
          let j = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return c }
    if let v = j["cycleSecs"] as? Double { c.cycleSecs = max(1, v) }
    if let v = j["minW"] as? Double { c.minW = v }
    if let v = j["minH"] as? Double { c.minH = v }
    if let v = j["appName"] as? String { c.appName = v }
    if let v = j["titleMarkers"] as? [String] { c.titleMarkers = v.map { $0.lowercased() } }
    return c
}

func log(_ s: String) {
    FileHandle.standardError.write(("[mbcapture] " + s + "\n").data(using: .utf8)!)
}

func writePNG(_ img: CGImage, _ path: String) -> Bool {
    guard let dest = CGImageDestinationCreateWithURL(
        URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil) else { return false }
    CGImageDestinationAddImage(dest, img, nil)
    return CGImageDestinationFinalize(dest)
}

func isXPage(_ title: String, _ cfg: Config) -> Bool {
    let t = title.lowercased()
    return cfg.titleMarkers.contains { t.contains($0) }
}

let ciContext = CIContext()

// One persistent SCStream per tracked window; keeps the most recent frame.
final class Grabber: NSObject, SCStreamOutput, SCStreamDelegate {
    let windowID: CGWindowID
    var title: String
    var frame: CGRect
    var stream: SCStream?
    var latest: CGImage?
    var lastFrameAt: Date?
    var dead = false
    private let lock = NSLock()

    init(window: SCWindow) {
        self.windowID = window.windowID
        self.title = window.title ?? ""
        self.frame = window.frame
        super.init()
    }

    func start(window: SCWindow) async {
        let filter = SCContentFilter(desktopIndependentWindow: window)
        let cfg = SCStreamConfiguration()
        // Size the buffer to SCK's own content geometry — guessing (frame × 2)
        // letterboxes the window into a corner of the buffer and breaks the
        // bridge's column math downstream.
        let scale = CGFloat(filter.pointPixelScale)
        cfg.width = Int(filter.contentRect.width * scale)
        cfg.height = Int(filter.contentRect.height * scale)
        cfg.minimumFrameInterval = CMTime(value: 1, timescale: 2) // ≤2 fps; OCR needs stills, not video
        cfg.showsCursor = false
        cfg.pixelFormat = kCVPixelFormatType_32BGRA
        cfg.queueDepth = 3
        let s = SCStream(filter: filter, configuration: cfg, delegate: self)
        do {
            try s.addStreamOutput(self, type: .screen, sampleHandlerQueue: DispatchQueue(label: "mbcap.\(windowID)"))
            try await s.startCapture()
            stream = s
            log("stream started for \(windowID) (\(title.prefix(50)))")
        } catch {
            dead = true
            log("stream start FAILED for \(windowID): \(error.localizedDescription)")
        }
    }

    func stop() {
        let s = stream
        stream = nil
        s?.stopCapture { _ in }
    }

    func snapshot() -> (CGImage, Date)? {
        lock.lock(); defer { lock.unlock() }
        guard let img = latest, let at = lastFrameAt else { return nil }
        return (img, at)
    }

    // SCStreamOutput
    func stream(_ stream: SCStream, didOutputSampleBuffer sb: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, sb.isValid else { return }
        guard let attachments = CMSampleBufferGetSampleAttachmentsArray(sb, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let statusRaw = attachments.first?[SCStreamFrameInfo.status] as? Int,
              let status = SCFrameStatus(rawValue: statusRaw), status == .complete else { return }
        guard let pb = CMSampleBufferGetImageBuffer(sb) else { return }
        let ci = CIImage(cvPixelBuffer: pb)
        guard let cg = ciContext.createCGImage(ci, from: ci.extent) else { return }
        lock.lock()
        latest = cg
        lastFrameAt = Date()
        lock.unlock()
    }

    // SCStreamDelegate
    func stream(_ stream: SCStream, didStopWithError error: Error) {
        log("stream for \(windowID) stopped: \(error.localizedDescription)")
        dead = true
    }
}

var grabbers: [CGWindowID: Grabber] = [:]

func cycle(_ cfg: Config) async {
    do {
        // onScreenWindowsOnly:false = include windows on other Spaces,
        // fullscreen Spaces, and minimized windows.
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
        var wanted: [CGWindowID: SCWindow] = [:]
        for w in content.windows {
            guard let app = w.owningApplication, app.applicationName.contains(cfg.appName) else { continue }
            guard w.frame.width >= cfg.minW, w.frame.height >= cfg.minH else { continue }
            guard isXPage(w.title ?? "", cfg) else { continue }   // only X pages — never private browsing
            wanted[w.windowID] = w
        }

        // Reconcile: drop streams for closed/dead windows, start new ones.
        for (id, g) in grabbers where wanted[id] == nil || g.dead {
            g.stop()
            grabbers.removeValue(forKey: id)
            try? FileManager.default.removeItem(atPath: "\(OUT)/\(id).png")
            log("dropped stream for \(id)")
        }
        for (id, w) in wanted {
            if let g = grabbers[id] {
                g.title = w.title ?? g.title
                // Window resized a lot (e.g. went fullscreen) → restart stream at new size.
                if abs(g.frame.width - w.frame.width) > 100 || abs(g.frame.height - w.frame.height) > 100 {
                    log("window \(id) resized \(Int(g.frame.width))x\(Int(g.frame.height)) → \(Int(w.frame.width))x\(Int(w.frame.height)); restarting stream")
                    g.stop()
                    grabbers.removeValue(forKey: id)
                    let ng = Grabber(window: w)
                    grabbers[id] = ng
                    await ng.start(window: w)
                }
            } else {
                let g = Grabber(window: w)
                grabbers[id] = g
                await g.start(window: w)
            }
        }

        // Write latest frames + meta.
        var meta: [[String: Any]] = []
        for (id, g) in grabbers {
            guard let (img, at) = g.snapshot() else { continue }
            let path = "\(OUT)/\(id).png"
            if writePNG(img, path + ".tmp") {
                try? FileManager.default.removeItem(atPath: path)
                try? FileManager.default.moveItem(atPath: path + ".tmp", toPath: path)
                meta.append([
                    "id": Int(id), "title": g.title,
                    "x": g.frame.origin.x, "y": g.frame.origin.y,
                    "w": g.frame.width, "h": g.frame.height,
                    "onScreen": wanted[id]?.isOnScreen ?? false,
                    "t": at.timeIntervalSince1970,
                ])
            }
        }
        let data = try JSONSerialization.data(withJSONObject: meta)
        try data.write(to: URL(fileURLWithPath: OUT + "/meta.json.tmp"))
        try? FileManager.default.removeItem(atPath: OUT + "/meta.json")
        try? FileManager.default.moveItem(atPath: OUT + "/meta.json.tmp", toPath: OUT + "/meta.json")
    } catch {
        log("shareable content error: \(error.localizedDescription) — Screen Recording permission for MBCapture?")
        // Permission denied → don't hammer TCC (each attempt can re-prompt).
        // Wait a minute before asking again.
        tccBackoff = 60
    }
}
var tccBackoff: Double = 0

try? FileManager.default.createDirectory(atPath: OUT, withIntermediateDirectories: true)
log("MBCapture v2 (persistent streams) starting — writing to \(OUT)")
// SCK needs a real window-server connection; NSApplication provides it.
let app = NSApplication.shared
app.setActivationPolicy(.prohibited) // headless — no dock icon, no UI
Task {
    while true {
        let cfg = loadConfig() // re-read each cycle: edit ~/.mbcap.json live
        await cycle(cfg)
        let delay = max(cfg.cycleSecs, tccBackoff)
        tccBackoff = 0
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
    }
}
app.run()
