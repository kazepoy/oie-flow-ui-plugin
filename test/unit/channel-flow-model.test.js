// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { endpointOf, flowModel, hasScript, pickLayout } from "../../src/channel-flow/model/flow-model.js";
import { availablePickerTags, pickerGroups, tagColor } from "../../src/channel-flow/model/picker.js";
import { channel, destination, elementLabel } from "./fixtures.js";

test("the model lists components in processing order, with data types and the response", () => {
  const model = flowModel(channel([destination(1, { name: "LIS" })], { response: "d1", sourceSteps: ["Normalize"], rules: ["Not a test"] }), elementLabel);
  assert.deepEqual(model.source.tiles.map(tile => tile.kind), ["connector", "attachments", "preprocessor", "filter", "transformer"]);
  assert.deepEqual(model.chains[0][0].tiles.map(tile => tile.kind), ["filter", "transformer", "connector", "response"]);
  assert.equal(model.source.types, "HL7V2 → XML");
  assert.equal(model.source.tiles[0].detail, "0.0.0.0:6661");
  assert.deepEqual(model.source.tiles[4].items, [{ index: 0, name: "Normalize", type: "JS", disabled: false }]);
  assert.equal(model.source.tiles[3].items[0].name, "Not a test");
  assert.deepEqual(model.end.tiles[1].reply, { kind: "destination", metaDataId: 1, name: "LIS" });
  assert.equal(model.end.tiles[1].detail, "after");
  assert.equal(model.replies, true);
  assert.equal(model.sender.kind, "external");
});

test("scripts that only hold the default template are empty", () => {
  const model = flowModel(channel([destination(1)]), elementLabel);
  assert.deepEqual([model.lifecycle.tiles[0].empty, model.lifecycle.tiles[1].empty, model.source.tiles[2].empty, model.end.tiles[0].empty], [true, true, true, false]);
  assert.equal(hasScript("// comment\nreturn;"), false);
  assert.equal(hasScript("return message;", true), false);
  assert.equal(hasScript("logger.info(1);"), true);
});

test("a polled source has no sender waiting for a response", () => {
  const model = flowModel(channel([destination(1)], { polled: true, response: "d1" }), elementLabel);
  assert.equal(model.sender.kind, "polled");
  assert.equal(model.replies, false);
});

test("endpoints hide credentials and query strings", () => {
  assert.equal(endpointOf({ properties: { host: "http://user:secret@ehr.example/api?token=1" } }), "http://ehr.example/api");
  assert.equal(endpointOf({ properties: { remoteAddress: "lis.example", remotePort: "6661" } }), "lis.example:6661");
  assert.equal(endpointOf({ properties: { listenerConnectorProperties: { host: "0.0.0.0", port: "80" }, contextPath: "/hie" } }), "0.0.0.0:80/hie");
});

test("Auto picks Line, Columns or Bands from the channel's shape", () => {
  const shape = (...chains) => flowModel(channel(chains.flat().map(([id, waits]) => destination(id, { waitForPrevious: waits }))), elementLabel);
  assert.equal(pickLayout(shape([[1, true]], [[2, true]])), "line");
  assert.equal(pickLayout(shape([[1, true]], [[2, false]])), "columns");
  assert.equal(pickLayout(shape([[1, true], [2, true], [3, true]])), "bands");
  assert.equal(pickLayout(shape([[1, true]], [[2, false]], [[3, false]], [[4, false]], [[5, false]])), "bands");
});

test("the picker lists channels by group, ungrouped last, and filters them", () => {
  const names = new Map([["a", "LAB · Orders"], ["b", "ADT · Inbound"], ["c", "OPS · Heartbeat"]]);
  const groups = [{ id: "g", name: "Laboratory", channels: { channel: [{ id: "a" }] } }];
  assert.deepEqual(pickerGroups(names, groups, "", "Default Group").map(group => [group.name, group.channels.map(c => c.name)]),
    [["Laboratory", ["LAB · Orders"]], ["Default Group", ["ADT · Inbound", "OPS · Heartbeat"]]]);
  assert.deepEqual(pickerGroups(names, groups, "ops", "Default Group").map(group => group.name), ["Default Group"]);
});

test("the picker attaches sorted tags, filters by name or tag, and hides tags of unseen channels", () => {
  const names = new Map([["a", "LAB · Orders"], ["b", "ADT · Inbound"], ["c", "OPS · Heartbeat"]]);
  const groups = [{ id: "g", name: "Laboratory", channels: { channel: [{ id: "a" }] } }];
  const tags = [
    { id: "t2", name: "HL7v2", channelIds: { string: ["a", "b"] }, backgroundColor: { red: 30, green: 144, blue: 255, alpha: 255 } },
    { id: "t1", name: "Critical", channelIds: { string: "a" } },
    { id: "t3", name: "Hidden", channelIds: { string: "secret" } }
  ];
  assert.equal(tagColor(tags[0]), "rgb(30, 144, 255)");
  assert.equal(tagColor(tags[1]), null);
  assert.deepEqual(availablePickerTags(names, tags).map(t => t.name), ["Critical", "HL7v2"]);

  const all = pickerGroups(names, groups, "", "Default Group", { tags });
  assert.deepEqual(all[0].channels[0].tags.map(t => t.name), ["Critical", "HL7v2"]);
  assert.deepEqual(all[1].channels.find(c => c.id === "c").tags, []);

  // Text filter matches both channel name and tag name.
  assert.deepEqual(pickerGroups(names, groups, "hl7", "Default Group", { tags }).map(g => [g.name, g.channels.map(c => c.id)]),
    [["Laboratory", ["a"]], ["Default Group", ["b"]]]);
  // Tag filter combines with text filter.
  assert.deepEqual(pickerGroups(names, groups, "inbound", "Default Group", { tags, tagId: "t2" }).map(g => g.channels.map(c => c.id)),
    [["b"]]);
  assert.deepEqual(pickerGroups(names, groups, "inbound", "Default Group", { tags, tagId: "t1" }), []);
});
