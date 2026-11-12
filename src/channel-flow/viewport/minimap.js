// SPDX-License-Identifier: MPL-2.0
// Minimap geometry and pointer navigation: pure functions, tested without a browser.

/** @typedef {import("./viewport.js").View} View */
/** @typedef {import("./viewport.js").Size} Size */
/** @typedef {{ width: number, height: number, scale: number }} MinimapSize */
/** @typedef {{ x: number, y: number, width: number, height: number }} Rect */

export const MINIMAP_MAX = { width: 200, height: 136 };
const MIN_LENS_VISIBLE = 10;

/**
 * Pixel size and scale of the minimap canvas for a scene.
 * @param {Size} scene
 * @param {Size} [max]
 * @returns {MinimapSize}
 */
export function minimapLayout(scene, max = MINIMAP_MAX) {
  const width = Math.max(1, scene.width);
  const height = Math.max(1, scene.height);
  const scale = Math.min(max.width / width, max.height / height);
  return {
    width: Math.max(1, Number((width * scale).toFixed(2))),
    height: Math.max(1, Number((height * scale).toFixed(2))),
    scale
  };
}

/**
 * True when the entire scene is already visible inside the viewport.
 * @param {Size} scene
 * @param {View} view
 * @param {Size} viewport
 */
export function isSceneVisible(scene, view, viewport) {
  if (viewport.width <= 0 || viewport.height <= 0) return true;
  const eps = 2;
  return view.x >= -eps
    && view.y >= -eps
    && view.x + scene.width * view.s <= viewport.width + eps
    && view.y + scene.height * view.s <= viewport.height + eps;
}

/**
 * Visible viewport rectangle in minimap canvas pixels (unclamped).
 * @param {View} view
 * @param {Size} viewport
 * @param {MinimapSize} map
 * @returns {Rect}
 */
export function minimapLens(view, viewport, map) {
  const s = view.s || 1;
  return {
    x: (-view.x / s) * map.scale,
    y: (-view.y / s) * map.scale,
    width: (viewport.width / s) * map.scale,
    height: (viewport.height / s) * map.scale
  };
}

/**
 * Keeps a small edge of the lens inside the minimap even if panned off-scene.
 * @param {Rect} lens
 * @param {MinimapSize} map
 * @returns {Rect}
 */
export function clampLens(lens, map) {
  const minX = Math.min(0, -lens.width + Math.min(MIN_LENS_VISIBLE, lens.width));
  const maxX = Math.max(0, map.width - Math.min(MIN_LENS_VISIBLE, lens.width));
  const minY = Math.min(0, -lens.height + Math.min(MIN_LENS_VISIBLE, lens.height));
  const maxY = Math.max(0, map.height - Math.min(MIN_LENS_VISIBLE, lens.height));
  return {
    x: Math.min(maxX, Math.max(minX, lens.x)),
    y: Math.min(maxY, Math.max(minY, lens.y)),
    width: lens.width,
    height: lens.height
  };
}

/**
 * True when a pointer at (mx, my) in minimap canvas pixels hits the lens.
 * @param {number} mx
 * @param {number} my
 * @param {Rect} lens
 */
export function lensHit(mx, my, lens) {
  return mx >= lens.x && mx <= lens.x + lens.width && my >= lens.y && my <= lens.y + lens.height;
}

/**
 * Centres the viewport on the scene point under (mx, my) on the minimap, kept within the scene.
 * @param {Size} scene
 * @param {View} view
 * @param {Size} viewport
 * @param {number} mx
 * @param {number} my
 * @param {MinimapSize} map
 * @returns {View}
 */
export function viewAtMinimap(scene, view, viewport, mx, my, map) {
  const axis = (coord, sceneLen, viewportLen) => {
    const scaled = sceneLen * view.s;
    if (scaled <= viewportLen) return (viewportLen - scaled) / 2;
    const target = viewportLen / 2 - (coord / map.scale) * view.s;
    return Math.min(0, Math.max(viewportLen - scaled, target));
  };
  return {
    s: view.s,
    x: axis(mx, scene.width, viewport.width),
    y: axis(my, scene.height, viewport.height)
  };
}

/**
 * Starts a minimap pointer interaction: grabs the lens in place if hit,
 * otherwise jumps the view to the clicked point.
 * @param {Size} scene
 * @param {View} view
 * @param {Size} viewport
 * @param {number} mx
 * @param {number} my
 * @param {MinimapSize} map
 * @returns {{ view: View | null, grabOffset: { dx: number, dy: number } }}
 */
export function minimapDragStart(scene, view, viewport, mx, my, map) {
  const lens = minimapLens(view, viewport, map);
  if (lensHit(mx, my, lens)) {
    return {
      view: null,
      grabOffset: { dx: mx - (lens.x + lens.width / 2), dy: my - (lens.y + lens.height / 2) }
    };
  }
  return {
    view: viewAtMinimap(scene, view, viewport, mx, my, map),
    grabOffset: { dx: 0, dy: 0 }
  };
}

/**
 * Updates the view while dragging on the minimap.
 * @param {Size} scene
 * @param {View} view
 * @param {Size} viewport
 * @param {number} mx
 * @param {number} my
 * @param {MinimapSize} map
 * @param {{ dx: number, dy: number }} grabOffset
 * @returns {View}
 */
export function minimapDragMove(scene, view, viewport, mx, my, map, grabOffset) {
  return viewAtMinimap(scene, view, viewport, mx - grabOffset.dx, my - grabOffset.dy, map);
}

