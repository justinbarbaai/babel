import Foundation
import Vision
import AppKit

func recognize(_ cg: CGImage) -> [[String: Any]] {
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    try? handler.perform([req])
    var lines: [[String: Any]] = []
    for obs in (req.results ?? []) {
        guard let top = obs.topCandidates(1).first else { continue }
        let bb = obs.boundingBox  // normalized, origin bottom-left
        lines.append(["text": top.string, "y": Double(1.0 - bb.origin.y), "x": Double(bb.origin.x),
                      "w": Double(bb.size.width)])
    }
    return lines
}

guard CommandLine.arguments.count > 1,
      let img = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("[]"); exit(0)
}

var lines: [[String: Any]] = []
if cg.width > 2200 {
    // Vision recognizes at a capped internal resolution — on very wide retina
    // frames the chat text comes back mangled. Tile into overlapping halves,
    // OCR each at full res, remap x to global, dedup the overlap band.
    let tiles: [(Double, Double)] = [(0.0, 0.62), (0.55, 1.0)]
    var seen = Set<String>()
    for (x0, x1) in tiles {
        let px0 = Int(Double(cg.width) * x0)
        let pw = Int(Double(cg.width) * (x1 - x0))
        guard let sub = cg.cropping(to: CGRect(x: px0, y: 0, width: pw, height: cg.height)) else { continue }
        for var l in recognize(sub) {
            l["x"] = x0 + (l["x"] as! Double) * (x1 - x0)
            l["w"] = (l["w"] as! Double) * (x1 - x0)
            let key = (l["text"] as! String) + String(format: "|%.2f", l["y"] as! Double)
            if seen.insert(key).inserted { lines.append(l) }
        }
    }
} else {
    lines = recognize(cg)
}
lines.sort { ($0["y"] as! Double) < ($1["y"] as! Double) }
let data = try! JSONSerialization.data(withJSONObject: lines)
print(String(data: data, encoding: .utf8)!)
