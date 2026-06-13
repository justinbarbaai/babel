// clicker — post a single hardware-style left click at a screen point.
//
// Used to ENTER an X live broadcast: when a host goes live, a "LIVE" ring
// appears on their avatar on the (already-open) profile window; clicking it
// drops into the broadcast, which the bridge then captures. This is an
// OS-level mouse click — nothing programmatic touches X's page, so it's the
// most account-safe way to "enter the live" (X just sees a normal click).
//
// Coordinates are GLOBAL display points, top-left origin (same space as
// CGWindowList window bounds), so the agent computes:
//     screenPoint = windowOrigin + normalizedOcrPosition * windowSize
//
// Needs Accessibility permission (System Settings → Privacy & Security →
// Accessibility) to post synthetic events to other apps.
import Foundation
import CoreGraphics

let args = CommandLine.arguments
guard args.count >= 3, let x = Double(args[1]), let y = Double(args[2]) else {
    FileHandle.standardError.write("usage: clicker <x> <y>\n".data(using: .utf8)!)
    exit(2)
}
let pt = CGPoint(x: x, y: y)
let src = CGEventSource(stateID: .hidSystemState)

func post(_ type: CGEventType, _ button: CGMouseButton = .left) {
    CGEvent(mouseEventSource: src, mouseType: type, mouseCursorPosition: pt, mouseButton: button)?
        .post(tap: .cghidEventTap)
}

// move → settle → click (down+up). The move helps targets that reveal the
// hit area on hover.
post(.mouseMoved)
usleep(80_000)
post(.leftMouseDown)
usleep(50_000)
post(.leftMouseUp)
