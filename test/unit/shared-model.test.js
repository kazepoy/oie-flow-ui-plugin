// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitChains } from "../../src/shared/model/chains.js";
import { addStats, emptyStats, statsOf } from "../../src/shared/model/stats.js";
import { asList, isTrue } from "../../src/shared/model/xstream.js";

const read = { enabled: d => d.enabled !== false, waits: d => d.wait !== false };
const ids = chains => chains.map(chain => chain.map(d => d.id));

test("destinations form chains as in the engine", () => {
  assert.deepEqual(ids(splitChains([{ id: 1 }, { id: 2 }, { id: 3, wait: false }, { id: 4 }], read)), [[1, 2], [3, 4]]);
  assert.deepEqual(ids(splitChains([{ id: 1, wait: false }, { id: 2, wait: false }], read)), [[1], [2]]);
});

test("a disabled destination never starts a chain and stays where declared", () => {
  assert.deepEqual(ids(splitChains([{ id: 1 }, { id: 2, wait: false, enabled: false }, { id: 3 }], read)), [[1, 2, 3]]);
  assert.deepEqual(ids(splitChains([{ id: 1, enabled: false }, { id: 2 }], read)), [[1, 2]]);
  assert.deepEqual(ids(splitChains([{ id: 1, enabled: false }, { id: 2, enabled: false }], read)), [[1, 2]]);
  assert.deepEqual(ids(splitChains([], read)), []);
});

test("statistics are read from the engine's status map, the queue apart", () => {
  const status = {
    queued: 3,
    statistics: { entry: [
      { "com.mirth.connect.donkey.model.message.Status": "RECEIVED", long: 10 },
      { "com.mirth.connect.donkey.model.message.Status": "ERROR", long: 2 },
      { "com.mirth.connect.donkey.model.message.Status": "QUEUED", long: 99 }
    ] },
    lifetimeStatistics: { entry: { "com.mirth.connect.donkey.model.message.Status": "RECEIVED", long: 50 } }
  };
  assert.deepEqual(statsOf(status), { RECEIVED: 10, FILTERED: 0, QUEUED: 3, SENT: 0, ERROR: 2 });
  assert.equal(statsOf(status, true).RECEIVED, 50);
  assert.deepEqual(statsOf(undefined), emptyStats());
  assert.equal(addStats(statsOf(status), statsOf(status)).ERROR, 4);
});

test("XStream lists and booleans read the same whatever their shape", () => {
  assert.deepEqual(asList({ channel: [1, 2] }, "channel"), [1, 2]);
  assert.deepEqual(asList({ channel: 1 }, "channel"), [1]);
  assert.deepEqual(asList("", "channel"), []);
  assert.deepEqual(asList(null), []);
  assert.equal(isTrue("false"), false);
  assert.equal(isTrue(undefined), true);
});
