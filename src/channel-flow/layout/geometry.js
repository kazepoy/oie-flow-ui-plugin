// SPDX-License-Identifier: MPL-2.0
// Sizes of everything Channel Flow draws, in pixels at 100 %. The diagram is laid
// out from these numbers only, never by measuring the page, so it is the same at
// every zoom level and can be tested. channel-flow.css uses the same sizes.

export const SIZE = {
  margin: 40,          // around the whole diagram
  border: 1,           // border of tiles and blocks (inside their size)
  tileWidth: 176,
  tileGap: 26,         // between tiles of a block, room for an arrow
  tilePadding: 8,
  tileHead: 22,        // icon and label of a tile
  line: 18,            // one line of text in a tile
  chip: 22,            // one step in a tile
  chipGap: 4,
  blockPadding: 12,
  blockHead: 46,       // kind, name, data types
  emitterWidth: 150,
  emitterHeight: 64,
  gapX: 64,            // between blocks side by side
  gapY: 56,            // between rows of blocks
  stackGap: 40,        // between blocks stacked in a chain
  bandPadding: 18,
  bandTitle: 26,
  noteWidth: 170,
  noteHeight: 40,
  chainLabel: 26
};

/** Steps shown in a tile by default; the rest opens with "+N more" (setting visibleSteps). */
export const VISIBLE_STEPS = 5;

/** Steps a tile shows, and whether "+N more" follows. A limit of 0 shows them all. */
export function shownSteps(count, visibleSteps = VISIBLE_STEPS) {
  const shown = visibleSteps > 0 ? Math.min(count, visibleSteps) : count;
  return { shown, more: count - shown };
}

const STEP_KINDS = new Set(["filter", "transformer", "response"]);

export const isStepTile = tile => STEP_KINDS.has(tile.kind);

/** Height of a tile, from what it shows. */
export function tileHeight(tile, visibleSteps = VISIBLE_STEPS) {
  const { tilePadding, tileHead, line, chip, chipGap } = SIZE;
  let body;
  if (isStepTile(tile)) {
    const { shown, more } = shownSteps(tile.items.length, visibleSteps);
    body = shown === 0 ? line : shown * chip + (shown - 1) * chipGap + (more ? chipGap + chip : 0);
  } else if (tile.kind === "connector" || tile.kind === "reply") {
    body = 2 * line;
  } else {
    body = line;
  }
  return 2 * (tilePadding + SIZE.border) + tileHead + body;
}

/**
 * A block with its tiles in a row (orientation "row") or a column ("column").
 * Positions of tiles are relative to the block. In a row, tiles share one height.
 * @returns {{ block: any, orientation: string, width: number, height: number,
 *             tiles: { tile: any, x: number, y: number, width: number, height: number }[] }}
 */
export function measureBlock(block, orientation, visibleSteps = VISIBLE_STEPS) {
  const { blockPadding, blockHead, tileWidth, tileGap } = SIZE;
  const heights = block.tiles.map(tile => tileHeight(tile, visibleSteps));
  if (orientation === "row") {
    const height = Math.max(...heights);
    return {
      block, orientation,
      width: 2 * blockPadding + block.tiles.length * tileWidth + (block.tiles.length - 1) * tileGap,
      height: blockHead + 2 * blockPadding + height,
      tiles: block.tiles.map((tile, index) => ({
        tile, x: blockPadding + index * (tileWidth + tileGap), y: blockHead + blockPadding, width: tileWidth, height
      }))
    };
  }
  let y = blockHead + blockPadding;
  const tiles = block.tiles.map((tile, index) => {
    const placed = { tile, x: blockPadding, y, width: tileWidth, height: heights[index] };
    y += heights[index] + tileGap;
    return placed;
  });
  return { block, orientation, width: 2 * blockPadding + tileWidth, height: y - tileGap + blockPadding, tiles };
}

/** A box: left, top, right, bottom and centre, from a position and a size. */
export function box(x, y, width, height) {
  return { x, y, width, height, l: x, t: y, r: x + width, b: y + height, cx: x + width / 2, cy: y + height / 2 };
}

/**
 * Places a measured block. Returns it with absolute boxes for the block and its tiles.
 */
export function place(measured, x, y) {
  return {
    ...measured,
    box: box(x, y, measured.width, measured.height),
    tiles: measured.tiles.map(placed => ({ ...placed, box: box(x + placed.x, y + placed.y, placed.width, placed.height) }))
  };
}
