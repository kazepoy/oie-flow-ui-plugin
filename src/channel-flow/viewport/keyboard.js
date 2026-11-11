// SPDX-License-Identifier: MPL-2.0
// Keys of the diagram, when it has the focus:
//   arrows      move (Shift: faster)
//   + / -       zoom in / out
//   0           fit the whole diagram
//   1           100 %, from the start of the flow

const STEP = 60;
const FAST_STEP = 240;

/**
 * @param {KeyboardEvent | any} event
 * @returns {{ kind: "pan", dx: number, dy: number } | { kind: "zoom", factor: number }
 *          | { kind: "fit" } | { kind: "start" } | null}
 */
export function keyAction(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const step = event.shiftKey ? FAST_STEP : STEP;
  switch (event.key) {
    case "ArrowLeft": return { kind: "pan", dx: -step, dy: 0 };
    case "ArrowRight": return { kind: "pan", dx: step, dy: 0 };
    case "ArrowUp": return { kind: "pan", dx: 0, dy: -step };
    case "ArrowDown": return { kind: "pan", dx: 0, dy: step };
    case "+":
    case "=": return { kind: "zoom", factor: 1.25 };
    case "-":
    case "_": return { kind: "zoom", factor: 0.8 };
    case "0": return { kind: "fit" };
    case "1": return { kind: "start" };
    default: return null;
  }
}
