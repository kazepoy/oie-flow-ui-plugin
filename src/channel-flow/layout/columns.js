// SPDX-License-Identifier: MPL-2.0
// Columns view: everything reads top to bottom. The sender, the source, then one
// column per chain side by side, then the postprocessing block. Suits several
// short chains.
import { box, place, SIZE } from "./geometry.js";
import { vertical } from "./edges.js";
import { chainEdges, emitterBox, lastEnabled, sceneSize, tileEdges } from "./parts.js";

const LEFT_ROOM = 40;  // left of the diagram, for the reply arrow
const LANE = 20;

/** @param {(block: any, orientation: string) => any} measureBlock measures a block (geometry.js) */
export function columnsScene(model, measureBlock) {
  const { margin, emitterWidth, emitterHeight, gapX, gapY, noteWidth, noteHeight } = SIZE;
  const left = margin + LEFT_ROOM;
  const source = measureBlock(model.source, "column");
  const end = measureBlock(model.end, "column");
  const chainMeasures = model.chains.map(chain => chain.map(block => measureBlock(block, "column")));
  const columnWidth = source.width;
  const chainsWidth = chainMeasures.length * columnWidth + Math.max(0, chainMeasures.length - 1) * gapX;
  const contentWidth = Math.max(columnWidth, emitterWidth, chainsWidth, noteWidth * 2);
  const axis = left + contentWidth / 2;
  let y = margin;

  const lifecycle = place(measureBlock(model.lifecycle, "row"), left, y);
  y = lifecycle.box.b + gapY;
  const emitter = emitterBox(axis - emitterWidth / 2, y);
  y = emitter.b + gapY * 0.8;
  const placedSource = place(source, axis - source.width / 2, y);
  y = placedSource.box.b + gapY;

  const chainsTop = y;
  const startX = axis - chainsWidth / 2;
  let bottom = chainsTop;
  const chains = chainMeasures.map((chain, index) => {
    let yy = chainsTop;
    return chain.map(measured => {
      const item = place(measured, startX + index * (columnWidth + gapX), yy);
      yy = item.box.b + gapY;
      bottom = Math.max(bottom, item.box.b);
      return item;
    });
  });
  const notes = [];
  if (!chains.length) {
    notes.push({ key: "noDestinations", box: box(axis + 24, chainsTop, noteWidth, noteHeight) });
    bottom = chainsTop + noteHeight;
  }
  const placedEnd = place(end, axis - end.width / 2, bottom + gapY);
  const all = chains.flat();

  /* ---- arrows */
  const s = placedSource.box;
  const e = placedEnd.box;
  const edges = [
    { points: vertical(emitter, s), kind: "message" },
    ...[lifecycle, placedSource, ...all, placedEnd].flatMap(tileEdges),
    ...chains.flatMap(chain => chainEdges(chain, vertical, "right"))
  ];
  const forkY = s.b + gapY / 2;
  const joinY = (bottom + e.t) / 2;
  chains.forEach((chain, index) => {
    const first = chain[0].box;
    edges.push({
      points: [[s.cx, s.b], [s.cx, forkY], [first.cx, forkY], [first.cx, first.t]],
      kind: chain[0].block.off ? "off" : "message",
      label: index === 0 && chains.length > 1 ? { key: "parallel" } : undefined,
      labelAt: [s.cx, (s.b + forkY) / 2], labelSide: "right"
    });
    const last = chain[lastEnabled(chain)];
    const b = last.box;
    const side = b.r + LANE;
    edges.push({
      kind: last.block.off ? "off" : "message",
      points: last === chain.at(-1)
        ? [[b.cx, b.b], [b.cx, joinY], [e.cx, joinY], [e.cx, e.t]]
        : [[b.r, b.cy], [side, b.cy], [side, joinY], [e.cx, joinY], [e.cx, e.t]]
    });
  });
  if (!chains.length) edges.push({ points: [[s.cx, s.b], [s.cx, e.t]], kind: "message" });

  const boxes = [lifecycle.box, emitter, s, e, ...all.map(item => item.box), ...notes.map(note => note.box)];
  if (model.replies) {
    const reply = placedEnd.tiles.find(tile => tile.tile.kind === "reply").box;
    const x = Math.min(...boxes.map(b => b.l)) - LANE;
    edges.push({
      points: [[e.l, reply.cy], [x, reply.cy], [x, emitter.cy], [emitter.l, emitter.cy]],
      kind: "reply", label: { key: "replied" }
    });
  }

  return {
    ...sceneSize(boxes),
    blocks: [lifecycle, placedSource, ...all, placedEnd], emitter, bands: [], notes, edges,
    anchor: { x: emitter.cx, y: margin, centered: true }
  };
}
