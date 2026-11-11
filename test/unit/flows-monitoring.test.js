// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelLane, channelLinks, connectorDetails, groupLanes, openGroups, waitsOf } from "../../src/flows-monitoring/model.js";

const connector = (metaDataId, name, received = 0) => ({
  metaDataId, name, state: "STARTED", statusType: metaDataId === 0 ? "SOURCE_CONNECTOR" : "DESTINATION_CONNECTOR",
  statistics: { entry: [{ string: metaDataId === 0 ? "RECEIVED" : "SENT", long: received }] }
});
const status = (channelId, name, destinations = 2) => ({
  channelId, name, state: "STARTED",
  statistics: { entry: [{ string: "RECEIVED", long: 5 }] },
  childStatuses: { dashboardStatus: [connector(0, "Source", 5), ...Array.from({ length: destinations }, (_, i) => connector(i + 1, `D${i + 1}`, 5))] }
});

test("chains come from the channel configuration: statuses always say waitForPrevious = false", () => {
  const waits = waitsOf({ destinationConnectors: { connector: [{ metaDataId: 1, waitForPrevious: true }, { metaDataId: 2, waitForPrevious: "false" }] } });
  assert.deepEqual([...waits], [[1, true], [2, false]]);
  const lane = channelLane(status("a", "A", 3), { waits: new Map([[1, true], [2, true], [3, false]]) });
  assert.deepEqual(lane.chains.map(chain => chain.map(c => c.metaDataId)), [[1, 2], [3]]);
  assert.equal(lane.source.stats.RECEIVED, 5);
  assert.equal(lane.chains[0][0].stats.SENT, 5);
});

test("without its configuration, the chains are unknown: destinations stay in order, in one row", () => {
  const lane = channelLane(status("a", "A", 2));
  assert.equal(lane.chainsKnown, false);
  assert.deepEqual(lane.chains.map(chain => chain.map(c => c.metaDataId)), [[1, 2]]);
  assert.equal(channelLane(status("a", "A", 2), { waits: new Map() }).chainsKnown, true);
});

test("lanes are grouped by name, the channels in no group under the default group, last", () => {
  const statuses = [status("b", "Beta"), status("a", "Alpha"), status("z", "Zulu")];
  const groups = [{ id: "g2", name: "Zeta", channels: { channel: [{ id: "a" }] } }, { id: "g1", name: "Eta", channels: { channel: [{ id: "b" }, { id: "missing" }] } }, { id: "g3", name: "Empty", channels: "" }];
  const result = groupLanes(statuses, groups, { defaultGroupName: "Default Group" });
  assert.deepEqual(result.map(group => [group.name, group.lanes.map(lane => lane.name)]), [["Eta", ["Beta"]], ["Zeta", ["Alpha"]], ["Default Group", ["Zulu"]]]);
  assert.equal(result[0].stats.RECEIVED, 5);
});

test("the filter keeps matching channels only", () => {
  const result = groupLanes([status("a", "LAB · Orders"), status("b", "ADT · Inbound")], [], { filter: "lab", defaultGroupName: "Default" });
  assert.deepEqual(result[0].lanes.map(lane => lane.name), ["LAB · Orders"]);
});

test("groups open as set by the user, else by the setting; a filter opens them all", () => {
  const groups = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual([...openGroups(groups, {}, "first", false)], ["a"]);
  assert.deepEqual([...openGroups(groups, {}, "all", false)], ["a", "b", "c"]);
  assert.deepEqual([...openGroups(groups, {}, "none", false)], []);
  assert.deepEqual([...openGroups(groups, { a: false, c: true }, "first", false)], ["c"]);
  assert.deepEqual([...openGroups(groups, { a: false }, "none", true)], ["a", "b", "c"]);
});

test("Channel Writer destinations link channels, both ways", () => {
  const links = channelLinks([
    { id: "a", destinationConnectors: { connector: [
      { metaDataId: 1, transportName: "Channel Writer", enabled: true, properties: { channelId: "b" } },
      { metaDataId: 2, transportName: "Channel Writer", enabled: false, properties: { channelId: "c" } },
      { metaDataId: 3, transportName: "TCP Sender", enabled: true, properties: {} },
      { metaDataId: 4, transportName: "Channel Writer", enabled: true, properties: { channelId: "none" } }
    ] } }
  ]);
  const lane = channelLane(status("a", "A", 4), { waits: new Map(), links });
  assert.deepEqual(lane.chains.flat().map(c => c.linkTo), ["b", null, null, null]);
  assert.deepEqual(channelLane(status("b", "B", 1), { links }).calledBy, [{ channelId: "a", metaDataId: 1 }]);
});


test("each card knows its connector's type and address, from the configuration", () => {
  const details = connectorDetails({
    sourceConnector: { transportName: "TCP Listener", properties: { listenerConnectorProperties: { host: "0.0.0.0", port: "8181" } } },
    destinationConnectors: { connector: [{ metaDataId: 1, transportName: "HTTP Sender", properties: { host: "http://ehr.example/api?token=x" } }] }
  });
  assert.deepEqual([...details], [[0, { transport: "TCP Listener", endpoint: "0.0.0.0:8181" }], [1, { transport: "HTTP Sender", endpoint: "http://ehr.example/api" }]]);
  const lane = channelLane(status("a", "A", 1), { waits: new Map(), details });
  assert.equal(lane.source.transport, "TCP Listener");
  assert.equal(lane.chains[0][0].endpoint, "http://ehr.example/api");
  assert.equal(channelLane(status("a", "A", 1)).source.transport, "", "unknown without the configuration");
});
