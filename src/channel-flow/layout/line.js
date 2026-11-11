// SPDX-License-Identifier: MPL-2.0
// Line view: everything reads left to right. The source is on top, each chain is a
// row below it, the postprocessing block on the right of the chains. Suits
// channels with few destinations.
import { box, place, SIZE } from "./geometry.js";
import { horizontal } from "./edges.js";
import { chainEdges, emitterBox, lastEnabled, sceneSize, tileEdges } from "./parts.js";

const INDENT = 48;     // chains start right of the source's left edge, room for the fork
const LANE = 24;       // distance of a routing line from the boxes it passes

/** @param {(block: any, orientation: string) => any} measureBlock measures a block (geometry.js) */
export function lineScene(model, measureBlock) {
  const { margin, emitterWidth, emitterHeight, gapX, gapY, stackGap, noteWidth, noteHeight } = SIZE;
  const sourceX = margin + emitterWidth + gapX;
  let y = margin;

  const lifecycle = place(measureBlock(model.lifecycle, "row"), sourceX, y);
  y = lifecycle.box.b + gapY;

  const sourceMeasure = measureBlock(model.source, "row");
  const emitter = emitterBox(margin, y + (sourceMeasure.height - emitterHeight) / 2);
  const source = place(sourceMeasure, sourceX, y);
  y = source.box.b + gapY;

  const chainsX = sourceX + INDENT;
  const chainsTop = y;
  const chains = model.chains.map(chain => {
    let x = chainsX;
    const placed = chain.map(block => {
      const item = place(measureBlock(block, "row"), x, y);
      x = item.box.r + gapX;
      return item;
    });
    y = Math.max(...placed.map(item => item.box.b)) + stackGap;
    return placed;
  });
  const notes = [];
  if (!chains.length) {
    notes.push({ key: "noDestinations", box: box(chainsX, y, noteWidth, noteHeight) });
    y += noteHeight + stackGap;
  }
  const chainsBottom = y - stackGap;
  const all = chains.flat();
  const rightmost = Math.max(source.box.r, ...all.map(item => item.box.r), ...notes.map(note => note.box.r));

  const endMeasure = measureBlock(model.end, "row");
  const endY = chainsTop + Math.max(0, (chainsBottom - chainsTop - endMeasure.height) / 2);
  const end = place(endMeasure, rightmost + gapX + LANE, endY);

  /* ---- arrows */
  const s = source.box;
  const e = end.box;
  const edges = [
    { points: horizontal(emitter, s), kind: "message" },
    ...[lifecycle, source, ...all, end].flatMap(tileEdges),
    ...chains.flatMap(chain => chainEdges(chain, horizontal))
  ];
  const forkX = s.r + LANE;
  const forkY = s.b + gapY / 2;
  const trunkX = chainsX - LANE;
  const joinX = e.l - LANE;
  chains.forEach((chain, index) => {
    const first = chain[0];
    edges.push({
      points: [[s.r, s.cy], [forkX, s.cy], [forkX, forkY], [trunkX, forkY], [trunkX, first.box.cy], [first.box.l, first.box.cy]],
      kind: first.block.off ? "off" : "message",
      label: index === 0 && chains.length > 1 ? { key: "parallel" } : undefined,
      labelAt: [trunkX, (chains[0][0].box.cy + chains.at(-1)[0].box.cy) / 2],
      labelSide: "left"
    });
    const last = chain[lastEnabled(chain)];
    const b = last.box;
    const below = b.b + stackGap / 2;
    edges.push({
      kind: last.block.off ? "off" : "message",
      points: last === chain.at(-1)
        ? [[b.r, b.cy], [joinX, b.cy], [joinX, e.cy], [e.l, e.cy]]
        : [[b.cx, b.b], [b.cx, below], [joinX, below], [joinX, e.cy], [e.l, e.cy]]
    });
  });
  if (!chains.length) edges.push({ points: [[s.r, s.cy], [joinX, s.cy], [joinX, e.cy], [e.l, e.cy]], kind: "message" });

  const boxes = [lifecycle.box, emitter, s, e, ...all.map(item => item.box), ...notes.map(note => note.box)];
  if (model.replies) {
    const reply = end.tiles.find(tile => tile.tile.kind === "reply").box;
    const right = Math.max(...boxes.map(b => b.r)) + LANE + 8;
    const top = s.t - gapY / 2;
    edges.push({
      points: [[e.r, reply.cy], [right, reply.cy], [right, top], [emitter.cx, top], [emitter.cx, emitter.t]],
      kind: "reply", label: { key: "replied" }
    });
  }

  return {
    ...sceneSize(boxes, model.replies ? LANE + 16 : 0),
    blocks: [lifecycle, source, ...all, end], emitter, bands: [], notes, edges,
    anchor: { x: margin, y: margin }
  };
}
