// SPDX-License-Identifier: MPL-2.0
// A scene is everything to draw for one layout, with absolute positions:
//   { width, height, blocks, emitter, bands, notes, edges, anchor }
// blocks: placed blocks (geometry.js place) · emitter: the sender's box
// bands: background bands (Bands view) · notes: free texts (chain titles, "No destinations")
// edges: arrows { points, kind, label?: { key, params }, labelAt?, labelSide? }
// anchor: where the message enters, for the starting view.
import { measureBlock } from "./geometry.js";
import { lineScene } from "./line.js";
import { columnsScene } from "./columns.js";
import { bandsScene } from "./bands.js";

export const LAYOUTS = ["line", "columns", "bands"];

/**
 * @param {"line" | "columns" | "bands"} layout
 * @param {any} model
 * @param {{ visibleSteps?: number }} [options] steps shown per tile (0: all)
 */
export function layoutScene(layout, model, options = {}) {
  const { visibleSteps = 5 } = options;
  const measure = (block, orientation) => measureBlock(block, orientation, visibleSteps);
  if (layout === "columns") return columnsScene(model, measure);
  if (layout === "bands") return bandsScene(model, measure);
  return lineScene(model, measure);
}
