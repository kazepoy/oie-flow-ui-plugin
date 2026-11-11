// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitView, MAX_SCALE, MIN_SCALE, panBy, startView, zoomAround } from "../../src/channel-flow/viewport/viewport.js";
import { isMouseWheel, wheelAction } from "../../src/channel-flow/viewport/gestures.js";
import { keyAction } from "../../src/channel-flow/viewport/keyboard.js";

const viewport = { width: 1000, height: 600 };

test("zooming keeps the point under the pointer still, within the limits", () => {
  const view = { s: 1, x: 100, y: 50 };
  const zoomed = zoomAround(view, 2, 400, 300);
  // The scene point under (400, 300) is the same before and after.
  assert.equal((400 - view.x) / view.s, (400 - zoomed.x) / zoomed.s);
  assert.equal((300 - view.y) / view.s, (300 - zoomed.y) / zoomed.s);
  assert.equal(zoomAround(view, 100, 0, 0).s, MAX_SCALE);
  assert.equal(zoomAround(view, 0.001, 0, 0).s, MIN_SCALE);
  assert.deepEqual(panBy(view, 10, -5), { s: 1, x: 90, y: 55 });
});

test("fit shows the whole scene, never above 100 %", () => {
  const large = fitView({ width: 3000, height: 1000 }, viewport);
  assert.ok(large.s < 1 && 3000 * large.s <= viewport.width);
  assert.equal(fitView({ width: 200, height: 100 }, viewport).s, 1);
});

test("the starting view is 100 % from where the message enters", () => {
  // A small scene is centred.
  assert.deepEqual(startView({ width: 400, height: 200 }, viewport, { x: 40, y: 40 }), { s: 1, x: 300, y: 200 });
  // A large one starts at its top left corner.
  assert.deepEqual(startView({ width: 3000, height: 2000 }, viewport, { x: 40, y: 40 }), { s: 1, x: 0, y: 0 });
  // Columns: the sender in the middle, without leaving blank space.
  assert.deepEqual(startView({ width: 3000, height: 2000 }, viewport, { x: 1500, y: 40, centered: true }), { s: 1, x: -1000, y: 0 });
  assert.deepEqual(startView({ width: 3000, height: 2000 }, viewport, { x: 100, y: 40, centered: true }), { s: 1, x: 0, y: 0 });
});

test("a trackpad and a mouse wheel move, a pinch and Ctrl + wheel zoom; a setting makes the wheel zoom", () => {
  const trackpad = { deltaX: 3, deltaY: 12, deltaMode: 0, wheelDeltaY: -14 };
  const mouse = { deltaX: 0, deltaY: 100, deltaMode: 0, wheelDeltaY: -120 };
  assert.equal(isMouseWheel(trackpad), false);
  assert.equal(isMouseWheel(mouse), true);
  assert.equal(isMouseWheel({ deltaX: 0, deltaY: 3, deltaMode: 1 }), true);
  assert.deepEqual(wheelAction(trackpad, "zoom"), { kind: "pan", dx: 3, dy: 12 });
  assert.equal(wheelAction({ ...trackpad, ctrlKey: true }, "zoom").kind, "zoom");
  assert.ok(wheelAction({ ...trackpad, ctrlKey: true, deltaY: -10 }).factor > 1, "pinching out zooms in");
  assert.equal(wheelAction(mouse, "zoom").kind, "zoom");
  assert.ok(wheelAction(mouse, "zoom").factor < 1, "wheel down zooms out");
  assert.deepEqual(wheelAction(mouse, "scroll"), { kind: "pan", dx: 0, dy: 100 });
  assert.deepEqual(wheelAction(mouse), { kind: "pan", dx: 0, dy: 100 }, "moving is the default");
  assert.equal(wheelAction({ ...mouse, ctrlKey: true }).kind, "zoom");
  assert.deepEqual(wheelAction({ ...mouse, shiftKey: true }, "zoom"), { kind: "pan", dx: 100, dy: 0 });
  assert.equal(wheelAction({ ...mouse, metaKey: true }, "scroll").kind, "zoom");
});

test("keys move, zoom, fit and go back to the start", () => {
  assert.deepEqual(keyAction({ key: "ArrowRight" }), { kind: "pan", dx: 60, dy: 0 });
  assert.deepEqual(keyAction({ key: "ArrowUp", shiftKey: true }), { kind: "pan", dx: 0, dy: -240 });
  assert.equal(keyAction({ key: "+" }).factor > 1, true);
  assert.equal(keyAction({ key: "-" }).factor < 1, true);
  assert.deepEqual(keyAction({ key: "0" }), { kind: "fit" });
  assert.deepEqual(keyAction({ key: "1" }), { kind: "start" });
  assert.equal(keyAction({ key: "1", metaKey: true }), null);
  assert.equal(keyAction({ key: "a" }), null);
});
