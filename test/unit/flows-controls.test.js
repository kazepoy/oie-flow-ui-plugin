// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelCommands, connectorCommands } from "../../src/flows-monitoring/controls.js";

test("a channel offers the commands of its state", () => {
  assert.deepEqual(channelCommands("STARTED"), ["pause", "stop"]);
  assert.deepEqual(channelCommands("PAUSED"), ["resume", "stop"]);
  assert.deepEqual(channelCommands("STOPPED"), ["start"]);
  assert.deepEqual(channelCommands("STOPPING"), []);
});

test("a stopped source can be started again: stopping it pauses the channel", () => {
  assert.deepEqual(connectorCommands("PAUSED", { state: "STOPPED" }, true), ["startConnector"]);
  assert.deepEqual(connectorCommands("STARTED", { state: "STARTED" }, true), ["stopConnector"]);
});

test("a destination stops alone only when its queue is enabled (OIE-12)", () => {
  assert.deepEqual(connectorCommands("STARTED", { state: "STARTED", queueEnabled: true }, false), ["stopConnector"]);
  assert.deepEqual(connectorCommands("STARTED", { state: "STARTED", queueEnabled: false }, false), []);
  assert.deepEqual(connectorCommands("PAUSED", { state: "STOPPED", queueEnabled: true }, false), ["startConnector"]);
  assert.deepEqual(connectorCommands("STOPPED", { state: "STOPPED" }, false), []);
});
