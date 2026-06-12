import CoreGraphics
import Foundation
// List Chrome normal windows with id + bounds + title. Titles come from
// kCGWindowName, which the window server only reveals to processes with the
// Screen Recording permission — Terminal already has it for the captures, so
// no new prompt. Title = the page title (contains the broadcaster's name on
// X broadcast pages), giving us direct window→stream attribution.
let info = (CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]]) ?? []
var out: [[String: Any]] = []
for w in info {
    guard let owner = w[kCGWindowOwnerName as String] as? String, owner == "Google Chrome" else { continue }
    guard let layer = w[kCGWindowLayer as String] as? Int, layer == 0 else { continue }
    guard let num = w[kCGWindowNumber as String] as? Int, num != 0 else { continue }
    guard let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
    let title = (w[kCGWindowName as String] as? String) ?? ""
    out.append(["id": num, "x": b["X"] ?? 0, "y": b["Y"] ?? 0,
                "w": b["Width"] ?? 0, "h": b["Height"] ?? 0, "title": title])
}
print(String(data: try! JSONSerialization.data(withJSONObject: out), encoding: .utf8)!)
