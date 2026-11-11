// SPDX-License-Identifier: MPL-2.0
// The view of the diagram: a scale s and an offset (x, y) of the scene in the
// viewport, in screen pixels. The scene is drawn translated by (x, y), then scaled.
// Pure functions, tested without a browser.

export const MIN_SCALE = 0.15;
export const MAX_SCALE = 3;
const MARGIN = 24;

/** @typedef {{ s: number, x: number, y: number }} View */
/** @typedef {{ width: number, height: number }} Size */

export const clampScale = scale => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Zooms by `factor` keeping the point (px, py) of the viewport still. @returns {View} */
export function zoomAround(view, factor, px, py) {
  const s = clampScale(view.s * factor);
  const ratio = s / view.s;
  return { s, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio };
}

/** @returns {View} */
export const panBy = (view, dx, dy) => ({ ...view, x: view.x - dx, y: view.y - dy });

/** The whole scene in the viewport, never above 100 %. @param {Size} scene @param {Size} viewport */
export function fitView(scene, viewport) {
  const s = clampScale(Math.min((viewport.width - 2 * MARGIN) / scene.width, (viewport.height - 2 * MARGIN) / scene.height, 1));
  return { s, x: (viewport.width - scene.width * s) / 2, y: Math.max(MARGIN, (viewport.height - scene.height * s) / 2) };
}

/**
 * The starting view: 100 %, from where the message enters. On each axis, a scene
 * that fits is centred; otherwise it starts at its top or left edge, or, when the
 * anchor is centred (Columns view), with the anchor in the middle.
 * @param {Size} scene
 * @param {Size} viewport
 * @param {{ x: number, y: number, centered?: boolean }} anchor
 */
export function startView(scene, viewport, anchor) {
  const axis = (sceneLength, viewportLength, anchorAt, centered) => {
    if (sceneLength <= viewportLength) return (viewportLength - sceneLength) / 2;
    if (!centered) return 0;
    const offset = viewportLength / 2 - anchorAt;
    return Math.min(0, Math.max(viewportLength - sceneLength, offset));
  };
  return {
    s: 1,
    x: axis(scene.width, viewport.width, anchor.x, anchor.centered),
    y: axis(scene.height, viewport.height, anchor.y, false)
  };
}

/** CSS transform of the scene for a view. */
export const transformOf = view => `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
