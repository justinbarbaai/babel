import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count > 1,
      let img = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("[]"); exit(0)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try? handler.perform([req])
var lines: [[String: Any]] = []
for obs in (req.results ?? []) {
    guard let top = obs.topCandidates(1).first else { continue }
    let bb = obs.boundingBox  // normalized, origin bottom-left
    lines.append(["text": top.string, "y": Double(1.0 - bb.origin.y), "x": Double(bb.origin.x)])
}
lines.sort { ($0["y"] as! Double) < ($1["y"] as! Double) }
let data = try! JSONSerialization.data(withJSONObject: lines)
print(String(data: data, encoding: .utf8)!)
