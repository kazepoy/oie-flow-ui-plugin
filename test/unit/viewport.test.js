// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitView, MAX_SCALE, MIN_SCALE, panBy, startView, zoomAround } from "../../src/channel-flow/viewport/viewport.js";
import { isMouseWheel, wheelAction } from "../../src/channel-flow/viewport/gestures.js";
import { keyAction } from "../../src/channel-flow/viewport/keyboard.js";
import { clampLens, isSceneVisible, minimapDragMove, minimapDragStart, minimapLayout, minimapLens, viewAtMinimap } from "../../src/channel-flow/viewport/minimap.js";

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

test("a trackpad and a mouse wheel move, a pinch and Ctrl + wheel zoom", () => {
  const trackpad = { deltaX: 3, deltaY: 12, deltaMode: 0, wheelDeltaY: -14 };
  const mouse = { deltaX: 0, deltaY: 100, deltaMode: 0, wheelDeltaY: -120 };
  assert.equal(isMouseWheel(trackpad), false);
  assert.equal(isMouseWheel(mouse), true);
  assert.equal(isMouseWheel({ deltaX: 0, deltaY: 3, deltaMode: 1 }), true);
  assert.deepEqual(wheelAction(trackpad), { kind: "pan", dx: 3, dy: 12 });
  assert.equal(wheelAction({ ...trackpad, ctrlKey: true }).kind, "zoom");
  assert.ok(wheelAction({ ...trackpad, ctrlKey: true, deltaY: -10 }).factor > 1, "pinching out zooms in");
  assert.deepEqual(wheelAction(mouse), { kind: "pan", dx: 0, dy: 100 });
  assert.equal(wheelAction({ ...mouse, ctrlKey: true }).kind, "zoom");
  assert.ok(wheelAction({ ...mouse, ctrlKey: true }).factor < 1, "Ctrl + wheel down zooms out");
  assert.equal(wheelAction({ ...mouse, metaKey: true }).kind, "zoom");
  assert.deepEqual(wheelAction({ ...mouse, shiftKey: true }), { kind: "pan", dx: 100, dy: 0 });
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

test("minimap fits the scene aspect ratio and detects when it is needed", () => {
  const wide = minimapLayout({ width: 4000, height: 1000 }, { width: 200, height: 100 });
  assert.deepEqual(wide, { width: 200, height: 50, scale: 0.05 });
  const tall = minimapLayout({ width: 1000, height: 4000 }, { width: 200, height: 100 });
  assert.deepEqual(tall, { width: 25, height: 100, scale: 0.025 });

  assert.equal(isSceneVisible({ width: 600, height: 400 }, { s: 1, x: 200, y: 100 }, viewport), true);
  assert.equal(isSceneVisible({ width: 600, height: 400 }, { s: 2, x: 0, y: 0 }, viewport), false);
  assert.equal(isSceneVisible({ width: 2000, height: 1000 }, { s: 1, x: 0, y: 0 }, viewport), false);
  assert.equal(isSceneVisible({ width: 2000, height: 1000 }, fitView({ width: 2000, height: 1000 }, viewport), viewport), true);
  assert.equal(isSceneVisible({ width: 2000, height: 1000 }, { s: 1, x: 0, y: 0 }, { width: 0, height: 0 }), true);
});

test("minimap lens reflects the visible part of the scene and stays reachable", () => {
  const map = minimapLayout({ width: 2000, height: 1200 }, { width: 200, height: 120 });
  assert.deepEqual(minimapLens({ s: 1, x: -200, y: -100 }, viewport, map), { x: 20, y: 10, width: 100, height: 60 });
  assert.deepEqual(minimapLens({ s: 2, x: -400, y: -200 }, viewport, map), { x: 20, y: 10, width: 50, height: 30 });
  // Panned far past the edge: a small edge stays visible on the minimap.
  const clamped = clampLens(minimapLens({ s: 1, x: 3000, y: -5000 }, viewport, map), map);
  assert.ok(clamped.x + clamped.width > 0 && clamped.y < map.height);
});

test("clicking or dragging the minimap moves the viewport within the scene", () => {
  const scene = { width: 2000, height: 1200 };
  const map = minimapLayout(scene, { width: 200, height: 120 }); // scale 0.1

  // Click outside the lens: centres on the clicked point, clamped to scene bounds.
  assert.deepEqual(viewAtMinimap(scene, { s: 1, x: 0, y: 0 }, viewport, 100, 60, map), { s: 1, x: -500, y: -300 });
  assert.deepEqual(viewAtMinimap(scene, { s: 1, x: 0, y: 0 }, viewport, 0, 0, map), { s: 1, x: 0, y: 0 });
  assert.deepEqual(viewAtMinimap(scene, { s: 1, x: 0, y: 0 }, viewport, 200, 120, map), { s: 1, x: -1000, y: -600 });

  // Narrow scene that fits horizontally stays centred on X when navigating on Y.
  const narrow = { width: 600, height: 2000 };
  const narrowMap = minimapLayout(narrow, { width: 200, height: 100 });
  assert.equal(viewAtMinimap(narrow, { s: 1, x: 200, y: 0 }, viewport, 5, 50, narrowMap).x, 200);

  // Grabbing inside the lens keeps the current view and drags 1:1 with the pointer.
  const initial = { s: 1, x: -200, y: -100 }; // lens at x=20..120, y=10..70
  const inside = minimapDragStart(scene, initial, viewport, 60, 30, map);
  assert.equal(inside.view, null);
  assert.deepEqual(minimapDragMove(scene, initial, viewport, 80, 45, map, inside.grabOffset), { s: 1, x: -400, y: -250 });

  // Clicking outside the lens jumps immediately and drags smoothly from there.
  const outside = minimapDragStart(scene, initial, viewport, 150, 90, map);
  assert.deepEqual(outside.view, { s: 1, x: -1000, y: -600 });
});
