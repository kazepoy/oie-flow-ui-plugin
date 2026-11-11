// SPDX-License-Identifier: MPL-2.0
// Bands view: three bands from top to bottom (source processing, destination
// processing, postprocessing and response), one block per line. Suits channels
// with many destinations or long chains: the diagram grows downwards, not sideways.
import { box, place, SIZE } from "./geometry.js";
import { horizontal } from "./edges.js";
import { chainLink, emitterBox, lastEnabled, sceneSize, tileEdges } from "./parts.js";

const INDENT = 48;     // chains start right of the band's edge, room for the fork
const LANE = 24;
const STEP_X = 40;     // "waits for" arrows run down the left of the blocks

/** @param {(block: any, orientation: string) => any} measureBlock measures a block (geometry.js) */
export function bandsScene(model, measureBlock) {
  const { margin, emitterWidth, emitterHeight, gapX, gapY, stackGap, bandPadding, bandTitle, noteWidth, noteHeight, chainLabel } = SIZE;
  const inner = margin + bandPadding;
  const chainsX = inner + INDENT;
  let y = margin;

  const lifecycle = place(measureBlock(model.lifecycle, "row"), margin, y);
  y = lifecycle.box.b + gapY;

  // Source processing
  const sourceTop = y;
  const sourceMeasure = measureBlock(model.source, "row");
  y += bandTitle + bandPadding;
  const emitter = emitterBox(inner, y + (sourceMeasure.height - emitterHeight) / 2);
  const source = place(sourceMeasure, inner + emitterWidth + gapX, y);
  const sourceBottom = source.box.b + bandPadding;
  y = sourceBottom + gapY;

  // Destination processing: each chain titled, its blocks one under the other.
  const destinationTop = y;
  y += bandTitle + bandPadding;
  const notes = [];
  const chains = model.chains.map((chain, index) => {
    notes.push({ key: model.chains.length > 1 ? "chainParallel" : "chain", params: { number: index + 1 },
      box: box(chainsX, y, noteWidth, chainLabel), kind: "label" });
    y += chainLabel;
    const placed = chain.map(block => {
      const item = place(measureBlock(block, "row"), chainsX, y);
      y = item.box.b + stackGap;
      return item;
    });
    return placed;
  });
  if (!chains.length) {
    notes.push({ key: "noDestinations", box: box(chainsX, y, noteWidth, noteHeight) });
    y += noteHeight + stackGap;
  }
  const destinationBottom = y - stackGap + bandPadding;
  y = destinationBottom + gapY;

  // Postprocessing and response
  const endTop = y;
  const end = place(measureBlock(model.end, "row"), chainsX, y + bandTitle + bandPadding);
  const endBottom = end.box.b + bandPadding;

  const all = chains.flat();
  const contentRight = Math.max(lifecycle.box.r, source.box.r, end.box.r, ...all.map(item => item.box.r + LANE + 24));
  const bandWidth = contentRight + bandPadding - margin;
  const bands = [
    { key: "source", box: box(margin, sourceTop, bandWidth, sourceBottom - sourceTop) },
    { key: "destinations", box: box(margin, destinationTop, bandWidth, destinationBottom - destinationTop) },
    { key: "postprocessing", box: box(margin, endTop, bandWidth, endBottom - endTop) }
  ];

  /* ---- arrows */
  const s = source.box;
  const e = end.box;
  const edges = [
    { points: horizontal(emitter, s), kind: "message" },
    ...[lifecycle, source, ...all, end].flatMap(tileEdges)
  ];
  for (const chain of chains) {
    chain.slice(1).forEach((placed, index) => {
      const previous = chain[index].box;
      const x = previous.l + STEP_X;
      edges.push({ points: [[x, previous.b], [x, placed.box.t]], ...chainLink(chain, index + 1), labelSide: "right" });
    });
  }
  const forkX = s.r + LANE;
  const forkY = (sourceBottom + destinationTop) / 2;
  const trunkX = chainsX - LANE;
  const joinX = Math.max(...all.map(item => item.box.r), chainsX) + LANE + 8;
  const joinY = (destinationBottom + endTop) / 2;
  const entryX = e.l - LANE;
  for (const chain of chains) {
    const first = chain[0];
    edges.push({
      points: [[s.r, s.cy], [forkX, s.cy], [forkX, forkY], [trunkX, forkY], [trunkX, first.box.cy], [first.box.l, first.box.cy]],
      kind: first.block.off ? "off" : "message"
    });
    const last = chain[lastEnabled(chain)];
    const b = last.box;
    edges.push({
      points: [[b.r, b.cy], [joinX, b.cy], [joinX, joinY], [entryX, joinY], [entryX, e.cy], [e.l, e.cy]],
      kind: last.block.off ? "off" : "message"
    });
  }
  if (!chains.length) {
    edges.push({ points: [[s.r, s.cy], [forkX, s.cy], [forkX, joinY], [entryX, joinY], [entryX, e.cy], [e.l, e.cy]], kind: "message" });
  }

  const boxes = [lifecycle.box, emitter, ...bands.map(band => band.box)];
  if (model.replies) {
    const reply = end.tiles.find(tile => tile.tile.kind === "reply").box;
    const below = endBottom + LANE;
    const x = margin - LANE + 4;
    edges.push({
      points: [[reply.cx, e.b], [reply.cx, below], [x, below], [x, emitter.cy], [emitter.l, emitter.cy]],
      kind: "reply", label: { key: "replied" }, labelAt: [(reply.cx + x) / 2, below], labelSide: "below"
    });
  }

  return {
    ...sceneSize(boxes, 0, model.replies ? LANE + 10 : 0),
    blocks: [lifecycle, source, ...all, end], emitter, bands, notes, edges,
    anchor: { x: margin, y: margin }
  };
}
