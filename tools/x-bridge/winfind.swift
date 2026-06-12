import CoreGraphics
import Foundation
// List Chrome normal windows with id + on-screen bounds. Bounds need no special
// permission, so we match the broadcast window by position (robust + title-free).
let info = (CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]]) ?? []
var out: [[String: Any]] = []
for w in info {
    guard let owner = w[kCGWindowOwnerName as String] as? String, owner == "Google Chrome" else { continue }
    guard let layer = w[kCGWindowLayer as String] as? Int, layer == 0 else { continue }
    guard let num = w[kCGWindowNumber as String] as? Int, num != 0 else { continue }
    guard let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
    out.append(["id": num, "x": b["X"] ?? 0, "y": b["Y"] ?? 0, "w": b["Width"] ?? 0, "h": b["Height"] ?? 0])
}
print(String(data: try! JSONSerialization.data(withJSONObject: out), encoding: .utf8)!)
