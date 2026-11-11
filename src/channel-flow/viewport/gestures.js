// SPDX-License-Identifier: MPL-2.0
// What a wheel event means. Browsers send the same "wheel" event for very
// different gestures:
//   trackpad, two fingers      small pixel deltas, often on both axes  → move
//   trackpad, pinch            ctrlKey set by Chrome, Edge and Firefox  → zoom
//   mouse wheel                whole notches (wheelDelta multiple of 120) or lines
//                              → move, as everywhere; or zoom if the user prefers (setting "wheel")
//   ⌘ / Ctrl + mouse wheel     → zoom, whatever the setting
//   Shift + mouse wheel        → move sideways
// Safari reports a pinch with its own gesture events, handled by the viewport.

const LINE = 16;    // pixels per line, for deltaMode 1
const PAGE = 400;   // pixels per page, for deltaMode 2

/** True for a mouse wheel notch rather than a trackpad scroll. */
export function isMouseWheel(event) {
  if (event.deltaMode === 1) return true;
  const notch = event.wheelDeltaY ?? event.wheelDelta;
  return !event.deltaX && !!notch && Math.abs(notch) % 120 === 0;
}

/**
 * @param {WheelEvent | any} event
 * @param {"zoom" | "scroll"} wheelSetting what a mouse wheel does
 * @returns {{ kind: "zoom", factor: number } | { kind: "pan", dx: number, dy: number }}
 */
export function wheelAction(event, wheelSetting = "scroll") {
  const unit = event.deltaMode === 1 ? LINE : event.deltaMode === 2 ? PAGE : 1;
  const dx = event.deltaX * unit;
  const dy = event.deltaY * unit;
  const mouse = isMouseWheel(event);
  if (event.ctrlKey || event.metaKey) {
    // A pinch sends small deltas; Ctrl + mouse wheel sends whole notches.
    return { kind: "zoom", factor: Math.exp(-dy * (mouse ? 0.002 : 0.01)) };
  }
  if (mouse) {
    if (event.shiftKey) return { kind: "pan", dx: dy, dy: 0 };
    if (wheelSetting === "zoom") return { kind: "zoom", factor: Math.exp(-dy * 0.002) };
  }
  return { kind: "pan", dx, dy };
}
