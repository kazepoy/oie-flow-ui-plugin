// SPDX-License-Identifier: MPL-2.0
// Pieces shared by the three layouts (line.js, columns.js, bands.js).
import { box, SIZE } from "./geometry.js";
import { horizontal, sequence, vertical } from "./edges.js";

export const emitterBox = (x, y) => box(x, y, SIZE.emitterWidth, SIZE.emitterHeight);

/** Arrows between the tiles of a block, in reading order. */
export function tileEdges(placed) {
  const route = placed.orientation === "row" ? horizontal : vertical;
  return sequence(placed.tiles.map(tile => tile.box), route, placed.block.off ? "off" : "message");
}

/** Index of the last enabled block of a chain (disabled ones never send). */
export function lastEnabled(chain) {
  let index = chain.length - 1;
  while (index > 0 && chain[index].block.off) index--;
  return index;
}

/**
 * Arrows between the blocks of a chain: the next destination waits for the
 * previous one, or is disabled.
 * @param {(from: any, to: any) => number[][]} route
 */
export function chainEdges(chain, route, labelSide = "above") {
  return chain.slice(1).map((placed, index) => ({
    points: route(chain[index].box, placed.box),
    ...chainLink(chain, index + 1),
    labelSide
  }));
}

/**
 * Kind and label of the link into chain[index]. A destination waits for the
 * last enabled one before it: the engine skips disabled destinations.
 */
export function chainLink(chain, index) {
  if (chain[index].block.off) return { kind: "off", label: { key: "disabled" } };
  let previous = index - 1;
  while (previous > 0 && chain[previous].block.off) previous--;
  return { kind: "wait", label: { key: "waitsFor", params: { id: chain[previous].block.metaDataId } } };
}

/** Size of the scene: everything placed, plus the margin. */
export function sceneSize(boxes, extraRight = 0, extraBottom = 0) {
  return {
    width: Math.ceil(Math.max(...boxes.map(b => b.r)) + SIZE.margin + extraRight),
    height: Math.ceil(Math.max(...boxes.map(b => b.b)) + SIZE.margin + extraBottom)
  };
}
