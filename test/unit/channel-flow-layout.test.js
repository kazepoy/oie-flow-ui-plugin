// SPDX-License-Identifier: MPL-2.0
// Rules every layout must keep, checked on channels of different shapes:
// nothing overlaps, every arrow is made of horizontal and vertical segments, no
// arrow goes through a tile, arrows between blocks go round the blocks, and
// everything fits in the scene.
import { test } from "node:test";
import assert from "node:assert/strict";
import { flowModel } from "../../src/channel-flow/model/flow-model.js";
import { layoutScene, LAYOUTS } from "../../src/channel-flow/layout/scene.js";
import { shownSteps, tileHeight, VISIBLE_STEPS, SIZE } from "../../src/channel-flow/layout/geometry.js";
import { arrowPaths } from "../../src/channel-flow/layout/edges.js";
import { channel, destination, elementLabel } from "./fixtures.js";

const SHAPES = {
  "no destinations": channel([]),
  "one destination, reply": channel([destination(1)], { response: "d1" }),
  "three parallel chains": channel([destination(1), destination(2, { waitForPrevious: false }), destination(3, { waitForPrevious: false })], { response: "d2" }),
  "chain with a disabled destination": channel([destination(1), destination(2, { enabled: false }), destination(3)]),
  "disabled last": channel([destination(1), destination(2, { enabled: false })], { response: "Auto-generate (After source transformer)" }),
  "seven destinations, long steps": channel([
    destination(1, { steps: ["a", "b", "c", "d", "e", "f", "g"] }), destination(2, { waitForPrevious: false }), destination(3),
    destination(4, { waitForPrevious: false }), destination(5, { enabled: false }), destination(6), destination(7, { waitForPrevious: false })
  ], { response: "d4", sourceSteps: ["1", "2", "3", "4", "5", "6"] })
};

/** A box shrunk by 1 px: touching its border is allowed, entering it is not. */
const inner = box => ({ l: box.l + 1, t: box.t + 1, r: box.r - 1, b: box.b - 1 });

function crosses([x1, y1], [x2, y2], box) {
  const b = inner(box);
  if (x1 === x2) return x1 > b.l && x1 < b.r && Math.max(y1, y2) > b.t && Math.min(y1, y2) < b.b;
  return y1 > b.t && y1 < b.b && Math.max(x1, x2) > b.l && Math.min(x1, x2) < b.r;
}

const overlaps = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const within = (point, box) => point[0] >= box.l && point[0] <= box.r && point[1] >= box.t && point[1] <= box.b;

for (const [shape, config] of Object.entries(SHAPES)) {
  const model = flowModel(config, elementLabel);
  for (const layout of LAYOUTS) for (const visibleSteps of [5, 0]) {
    test(`${layout} · ${shape} · ${visibleSteps || "all"} steps`, () => {
      const scene = layoutScene(layout, model, { visibleSteps });
      const blocks = scene.blocks.map(placed => placed.box);
      const tiles = scene.blocks.flatMap(placed => placed.tiles.map(tile => tile.box));
      const solids = [...blocks, scene.emitter, ...scene.notes.filter(note => note.kind !== "label").map(note => note.box)];

      // Nothing overlaps.
      solids.forEach((a, i) => solids.slice(i + 1).forEach(b => assert.ok(!overlaps(a, b), `${JSON.stringify(a)} overlaps ${JSON.stringify(b)}`)));

      for (const edge of scene.edges) {
        // Horizontal and vertical segments only.
        edge.points.slice(1).forEach(([x, y], i) => {
          const [px, py] = edge.points[i];
          assert.ok(x === px || y === py, `diagonal segment in ${edge.kind} arrow`);
        });
        // Inside the scene.
        edge.points.forEach(([x, y]) => assert.ok(x >= 0 && y >= 0 && x <= scene.width && y <= scene.height, "arrow outside the scene"));
        // Never through a tile.
        edge.points.slice(1).forEach((point, i) => tiles.forEach(tile =>
          assert.ok(!crosses(edge.points[i], point, tile), `${edge.kind} arrow crosses a tile`)));
        // Between blocks: round the blocks (an arrow between tiles stays in its block).
        const ownBlock = blocks.find(block => edge.points.every(point => within(point, block)));
        if (!ownBlock) {
          edge.points.slice(1).forEach((point, i) => solids.forEach(box =>
            assert.ok(!crosses(edge.points[i], point, box), `${edge.kind} arrow ${JSON.stringify(edge.points)} crosses ${JSON.stringify(box)}`)));
        }
        assert.match(arrowPaths(edge).head, /^M[\d.-]+,[\d.-]+ L/);
      }
      solids.forEach(box => assert.ok(box.r <= scene.width && box.b <= scene.height, "box outside the scene"));
      assert.equal(scene.edges.some(edge => edge.kind === "reply"), model.replies);
    });
  }
}

test("a tile grows with its steps, up to five and a +N more line", () => {
  const steps = count => ({ kind: "transformer", items: Array.from({ length: count }, (_, index) => ({ index })) });
  const head = 2 * (SIZE.tilePadding + SIZE.border) + SIZE.tileHead;
  assert.equal(tileHeight(steps(0)), head + SIZE.line);
  assert.equal(tileHeight(steps(2)), head + 2 * SIZE.chip + SIZE.chipGap);
  assert.equal(tileHeight(steps(VISIBLE_STEPS + 3)), tileHeight(steps(VISIBLE_STEPS + 1)));
  assert.ok(tileHeight(steps(VISIBLE_STEPS + 1)) > tileHeight(steps(VISIBLE_STEPS)));
  // The setting changes the limit; 0 shows every step.
  assert.deepEqual(shownSteps(7, 3), { shown: 3, more: 4 });
  assert.deepEqual(shownSteps(7, 0), { shown: 7, more: 0 });
  assert.equal(tileHeight(steps(7), 0), head + 7 * SIZE.chip + 6 * SIZE.chipGap);
});

test("a destination waits for the last enabled one before it", () => {
  const scene = layoutScene("line", flowModel(SHAPES["chain with a disabled destination"], elementLabel));
  const labels = scene.edges.filter(edge => edge.label).map(edge => [edge.label.key, edge.label.params?.id]);
  assert.deepEqual(labels.filter(([key]) => key === "waitsFor" || key === "disabled"), [["disabled", undefined], ["waitsFor", 1]]);
});
