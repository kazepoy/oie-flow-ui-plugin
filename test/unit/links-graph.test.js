// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLinksGraph, connectedSubgraph } from "../../src/flows-monitoring/links-graph.js";
import { layoutLinksGraph } from "../../src/flows-monitoring/links-layout.js";
import { channelLinks } from "../../src/flows-monitoring/model.js";

const connector = (metaDataId, name, extraStats = [], queued = 0) => ({
  metaDataId,
  name,
  state: "STARTED",
  queued,
  statusType: metaDataId === 0 ? "SOURCE_CONNECTOR" : "DESTINATION_CONNECTOR",
  statistics: { entry: [{ string: metaDataId === 0 ? "RECEIVED" : "SENT", long: 5 }, ...extraStats] }
});

const status = (channelId, name, { state = "STARTED", received = 5, destinations = [connector(1, "Send")] } = {}) => ({
  channelId,
  name,
  state,
  statistics: { entry: [{ string: "RECEIVED", long: received }] },
  childStatuses: { dashboardStatus: [connector(0, "Source", [{ string: "RECEIVED", long: received }]), ...destinations] }
});

const writerChannel = (id, targets) => ({
  id,
  destinationConnectors: {
    connector: targets.map((targetId, index) => ({
      metaDataId: index + 1,
      enabled: true,
      transportName: "Channel Writer",
      properties: { channelId: targetId }
    }))
  }
});

const overlaps = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

test("buildLinksGraph filters unlinked channels by default and preserves all when linkedOnly is false", () => {
  const statuses = [status("a", "Alpha"), status("b", "Beta"), status("c", "Standalone", { received: 12 })];
  const groups = [
    { id: "g1", name: "Group A", channels: { channel: [{ id: "a" }] } },
    { id: "g2", name: "Group B", channels: { channel: [{ id: "b" }] } },
    { id: "g3", name: "Group C", channels: { channel: [{ id: "c" }] } }
  ];
  const links = channelLinks([writerChannel("a", ["b"])]);

  const onlyLinked = buildLinksGraph({
    statuses,
    groups,
    links,
    defaultGroupName: "Default",
    hiddenTargetName: "Hidden"
  });
  assert.deepEqual(onlyLinked.nodes.map(n => n.id), ["a", "b"]);
  assert.deepEqual(onlyLinked.groups.map(g => g.id), ["g1", "g2"]);
  assert.equal(onlyLinked.edges.length, 1);
  assert.equal(onlyLinked.totals.RECEIVED, 10);

  const all = buildLinksGraph({
    statuses,
    groups,
    links,
    linkedOnly: false,
    defaultGroupName: "Default",
    hiddenTargetName: "Hidden"
  });
  assert.deepEqual(all.nodes.map(n => n.id).sort(), ["a", "b", "c"]);
  assert.equal(all.groups.length, 3);
  assert.equal(all.totals.RECEIVED, 22);
});

test("buildLinksGraph creates hidden stubs for undeployed targets or filtered callers without inflating totals", () => {
  const statuses = [
    status("a", "HIS Inbound", { received: 3, destinations: [connector(1, "To Broadcast"), connector(2, "To Missing")] }),
    status("b", "Broadcast", { received: 7 })
  ];
  const groups = [{ id: "g1", name: "Clinical", channels: { channel: [{ id: "a" }, { id: "b" }] } }];
  const links = channelLinks([writerChannel("a", ["b", "missing-id"])]);

  const full = buildLinksGraph({ statuses, groups, links, defaultGroupName: "Default", hiddenTargetName: "Hidden target" });
  const hiddenNode = full.nodes.find(n => n.id === "missing-id");
  assert.ok(hiddenNode?.hidden);
  assert.equal(hiddenNode.name, "Hidden target");
  assert.equal(full.totals.RECEIVED, 10);

  const filteredOnCallee = buildLinksGraph({
    statuses,
    groups,
    links,
    filter: "Broadcast",
    defaultGroupName: "Default",
    hiddenTargetName: "Hidden target"
  });
  assert.equal(filteredOnCallee.edges.length, 1);
  assert.equal(filteredOnCallee.nodes.find(n => n.id === "a")?.hidden, true);
  assert.equal(filteredOnCallee.totals.RECEIVED, 7);
});

test("buildLinksGraph classifies edge kinds by error, queued, off, then message", () => {
  const statuses = [
    status("src", "Source", {
      destinations: [
        connector(1, "ErrDest", [{ string: "ERROR", long: 2 }]),
        connector(2, "QueueDest", [], 4),
        connector(3, "StoppedTargetDest"),
        connector(4, "OkDest")
      ]
    }),
    status("tErr", "TargetErr"),
    status("tQueue", "TargetQueue"),
    status("tStopped", "TargetStopped", { state: "STOPPED" }),
    status("tOk", "TargetOk")
  ];
  const links = channelLinks([writerChannel("src", ["tErr", "tQueue", "tStopped", "tOk"])]);
  const graph = buildLinksGraph({ statuses, groups: [], links, defaultGroupName: "Default", hiddenTargetName: "Hidden" });
  const kindByDest = new Map(graph.edges.map(e => [e.destinationName, e.kind]));
  assert.equal(kindByDest.get("ErrDest"), "error");
  assert.equal(kindByDest.get("QueueDest"), "queued");
  assert.equal(kindByDest.get("StoppedTargetDest"), "off");
  assert.equal(kindByDest.get("OkDest"), "message");
});

test("connectedSubgraph isolates causal upstream and downstream paths and handles cycles", () => {
  const edges = [
    { id: "a->c", from: "a", to: "c" },
    { id: "b->c", from: "b", to: "c" },
    { id: "c->d", from: "c", to: "d" },
    { id: "x->y", from: "x", to: "y" },
    { id: "y->x", from: "y", to: "x" }
  ];
  const fromA = connectedSubgraph(edges, "a");
  assert.deepEqual([...fromA.nodeIds].sort(), ["a", "c", "d"]);
  assert.equal(fromA.edgeIds.has("b->c"), false);
  assert.equal(fromA.edgeIds.has("a->c"), true);
  assert.equal(fromA.edgeIds.has("c->d"), true);

  const fromC = connectedSubgraph(edges, "c");
  assert.deepEqual([...fromC.nodeIds].sort(), ["a", "b", "c", "d"]);

  const cycle = connectedSubgraph(edges, "x");
  assert.deepEqual([...cycle.nodeIds].sort(), ["x", "y"]);
  assert.deepEqual([...cycle.edgeIds].sort(), ["x->y", "y->x"]);
});

test("layoutLinksGraph places groups and nodes topologically with no overlaps across DAGs and cycles", () => {
  const statuses = [
    status("z1", "Ingress"),
    status("z2", "Router"),
    status("a1", "Processor"),
    status("b1", "Loop A"),
    status("c1", "Self")
  ];
  const groups = [
    { id: "gz", name: "Zeta Ingress", channels: { channel: [{ id: "z1" }, { id: "z2" }] } },
    { id: "ga", name: "Alpha Processing", channels: { channel: [{ id: "a1" }] } },
    { id: "gb", name: "Beta Loop", channels: { channel: [{ id: "b1" }] } },
    { id: "gc", name: "Self Group", channels: { channel: [{ id: "c1" }] } }
  ];
  const links = channelLinks([
    writerChannel("z1", ["z2"]),
    writerChannel("z2", ["a1"]),
    writerChannel("a1", ["b1"]),
    writerChannel("b1", ["a1"]),
    writerChannel("c1", ["c1"])
  ]);
  const graph = buildLinksGraph({ statuses, groups, links, defaultGroupName: "Default", hiddenTargetName: "Hidden" });
  const scene = layoutLinksGraph(graph);

  assert.equal(scene.anchor.x, 0);
  assert.equal(scene.anchor.centered, false);
  assert.equal(scene.bands.length, 4);
  assert.equal(scene.blocks.length, 5);

  const gZeta = scene.groups.find(g => g.id === "gz");
  const gAlpha = scene.groups.find(g => g.id === "ga");
  assert.ok(gZeta.box.r < gAlpha.box.l, "downstream group must sit to the right of upstream group");

  const nZ1 = scene.nodes.find(n => n.id === "z1");
  const nZ2 = scene.nodes.find(n => n.id === "z2");
  assert.ok(nZ1.box.r < nZ2.box.l, "intra-group target sits to the right of source");

  for (let i = 0; i < scene.groups.length; i++) {
    for (let j = i + 1; j < scene.groups.length; j++) {
      assert.equal(overlaps(scene.groups[i].box, scene.groups[j].box), false);
    }
  }
  for (let i = 0; i < scene.nodes.length; i++) {
    for (let j = i + 1; j < scene.nodes.length; j++) {
      assert.equal(overlaps(scene.nodes[i].box, scene.nodes[j].box), false);
    }
  }
  for (const edge of scene.edges) {
    assert.ok(edge.points.length >= 2);
    assert.ok(Array.isArray(edge.labelPos));
    assert.ok(edge.points.every(([x, y]) => x >= 0 && y >= 0 && x <= scene.width && y <= scene.height));
  }
});

test("layoutLinksGraph keeps edge label pills clear of node cards and sibling labels", () => {
  const statuses = [
    status("a1", "ADT HIS inbound", { destinations: [connector(1, "Broadcast to departments")] }),
    status("a2", "PHARM Prescriptions", { destinations: [connector(1, "Broadcast to departments")] }),
    status("b1", "ADT Broadcast to departments")
  ];
  const groups = [
    { id: "g1", name: "Patient Care", channels: { channel: [{ id: "a1" }, { id: "a2" }, { id: "b1" }] } }
  ];
  const links = channelLinks([writerChannel("a1", ["b1"]), writerChannel("a2", ["b1"])]);
  const scene = layoutLinksGraph(buildLinksGraph({
    statuses,
    groups,
    links,
    defaultGroupName: "Default",
    hiddenTargetName: "Hidden"
  }));
  const pillBox = ([cx, cy]) => ({ l: cx - 76, r: cx + 76, t: cy - 11, b: cy + 11 });
  const labelBoxes = scene.edges.map(e => pillBox(e.labelPos));
  for (const lb of labelBoxes) {
    for (const node of scene.nodes) {
      assert.equal(overlaps(lb, node.box), false, `label overlaps node ${node.name}`);
    }
    for (const group of scene.groups) {
      const hdr = { l: group.box.l, r: group.box.r, t: group.box.t, b: group.box.t + 28 };
      assert.equal(overlaps(lb, hdr), false, `label overlaps group header ${group.name}`);
    }
  }
  for (let i = 0; i < labelBoxes.length; i++) {
    for (let j = i + 1; j < labelBoxes.length; j++) {
      assert.equal(overlaps(labelBoxes[i], labelBoxes[j]), false, "sibling edge labels must not overlap");
    }
  }
});

test("layoutLinksGraph returns a bounded empty scene when there are no nodes", () => {
  const empty = layoutLinksGraph({ groups: [], nodes: [], edges: [] });
  assert.ok(empty.width > 0 && empty.height > 0);
  assert.deepEqual(empty.anchor, { x: 0, y: 0, centered: false });
  assert.equal(empty.edges.length, 0);
});

test("buildLinksGraph and layoutLinksGraph handle a 6-channel 3-group graph with a cycle and cross-group fan-in", () => {
  const statuses = [
    status("adt-in", "ADT · HIS inbound", { destinations: [connector(1, "Broadcast to departments")] }),
    status("adt-bc", "ADT · Broadcast to departments", { destinations: [connector(1, "EHR"), connector(2, "Sync patient to HIE")] }),
    status("lab-ord", "LAB · Orders to LIS (ORM)", { destinations: [connector(1, "Laboratory (LIS)"), connector(2, "Report order status")] }),
    status("lab-res", "LAB · Results from LIS (ORU)", { destinations: [connector(1, "Validate results"), connector(2, "Critical values check"), connector(3, "Publish results to HIE")] }),
    status("lab-crit", "LAB · Critical values", { destinations: [connector(1, "Page on-call biologist"), connector(2, "Order confirm panel")] }),
    status("hie", "HIE · Regional exchange API", { destinations: [connector(1, "Check consent")] })
  ];
  const groups = [
    { id: "g-bill", name: "Billing & Partners", channels: { channel: [{ id: "hie" }] } },
    { id: "g-lab", name: "Laboratory", channels: { channel: [{ id: "lab-ord" }, { id: "lab-res" }, { id: "lab-crit" }] } },
    { id: "g-pat", name: "Patient Care", channels: { channel: [{ id: "adt-in" }, { id: "adt-bc" }] } }
  ];
  const links = channelLinks([
    writerChannel("adt-in", ["adt-bc"]),
    writerChannel("adt-bc", ["hie"]),
    writerChannel("lab-ord", ["lab-res"]),
    writerChannel("lab-res", ["lab-crit", "hie"]),
    writerChannel("lab-crit", ["lab-ord"])
  ]);
  const graph = buildLinksGraph({
    statuses,
    groups,
    links,
    defaultGroupName: "Default",
    hiddenTargetName: "Hidden"
  });

  assert.equal(graph.nodes.length, 6);
  assert.equal(graph.edges.length, 6);
  assert.equal(graph.groups.length, 3);

  // Focus walks through the cycle without infinite looping and still separates branches.
  assert.deepEqual([...connectedSubgraph(graph.edges, "lab-crit").nodeIds].sort(), ["hie", "lab-crit", "lab-ord", "lab-res"]);
  assert.deepEqual([...connectedSubgraph(graph.edges, "adt-in").nodeIds].sort(), ["adt-bc", "adt-in", "hie"]);
  assert.deepEqual([...connectedSubgraph(graph.edges, "hie").nodeIds].sort(), ["adt-bc", "adt-in", "hie", "lab-crit", "lab-ord", "lab-res"]);

  const scene = layoutLinksGraph(graph);
  assert.deepEqual(scene.groups.map(g => g.name), ["Laboratory", "Patient Care", "Billing & Partners"]);

  const backEdges = scene.edges.filter(e => e.back);
  assert.equal(backEdges.length, 1);
  assert.equal(backEdges[0].from, "lab-res");
  assert.equal(backEdges[0].to, "lab-crit");

  const pillBox = ([cx, cy]) => ({ l: cx - 76, r: cx + 76, t: cy - 11, b: cy + 11 });
  const labelBoxes = scene.edges.map(e => pillBox(e.labelPos));
  for (const edge of scene.edges) {
    assert.ok(edge.points.length >= 2);
    assert.ok(edge.points.every(([x, y]) => x >= 0 && y >= 0 && x <= scene.width && y <= scene.height),
      `edge ${edge.from}->${edge.to} stays within bounds`);
  }
  for (let i = 0; i < scene.groups.length; i++) {
    for (let j = i + 1; j < scene.groups.length; j++) {
      assert.equal(overlaps(scene.groups[i].box, scene.groups[j].box), false);
    }
  }
  for (let i = 0; i < scene.nodes.length; i++) {
    for (let j = i + 1; j < scene.nodes.length; j++) {
      assert.equal(overlaps(scene.nodes[i].box, scene.nodes[j].box), false);
    }
  }
  for (const lb of labelBoxes) {
    for (const node of scene.nodes) {
      assert.equal(overlaps(lb, node.box), false, `label overlaps node ${node.name}`);
    }
    for (const group of scene.groups) {
      const hdr = { l: group.box.l, r: group.box.r, t: group.box.t, b: group.box.t + 28 };
      assert.equal(overlaps(lb, hdr), false, `label overlaps group header ${group.name}`);
    }
  }
  for (let i = 0; i < labelBoxes.length; i++) {
    for (let j = i + 1; j < labelBoxes.length; j++) {
      assert.equal(overlaps(labelBoxes[i], labelBoxes[j]), false, "sibling edge labels must not overlap");
    }
  }
});

test("buildLinksGraph exposes source details and layoutLinksGraph expands nodes cleanly when details is enabled", () => {
  const statuses = [
    status("a", "ADT · HIS inbound", { destinations: [connector(1, "Broadcast")] }),
    status("b", "ADT · Broadcast", { destinations: [connector(1, "EHR")] })
  ];
  const groups = [{ id: "g1", name: "Patient Care", channels: { channel: [{ id: "a" }, { id: "b" }] } }];
  const links = channelLinks([writerChannel("a", ["b"])]);
  const details = new Map([
    ["a", new Map([[0, { transport: "TCP Listener", endpoint: "0.0.0.0:6661" }]])],
    ["b", new Map([[0, { transport: "Channel Reader", endpoint: "" }]])]
  ]);
  const graph = buildLinksGraph({
    statuses,
    groups,
    links,
    details,
    defaultGroupName: "Default",
    hiddenTargetName: "Hidden"
  });
  assert.deepEqual(graph.nodes.find(n => n.id === "a")?.source, {
    metaDataId: 0,
    name: "Source",
    state: "STARTED",
    queueEnabled: false,
    stats: { RECEIVED: 10, FILTERED: 0, QUEUED: 0, SENT: 0, ERROR: 0 },
    transport: "TCP Listener",
    endpoint: "0.0.0.0:6661"
  });

  const compact = layoutLinksGraph(graph, { details: false });
  const detailed = layoutLinksGraph(graph, { details: true });
  assert.ok(detailed.nodes[0].box.height > compact.nodes[0].box.height);
  assert.equal(overlaps(detailed.nodes[0].box, detailed.nodes[1].box), false);
  const pillBox = ([cx, cy]) => ({ l: cx - 76, r: cx + 76, t: cy - 11, b: cy + 11 });
  for (const edge of detailed.edges) {
    for (const node of detailed.nodes) {
      assert.equal(overlaps(pillBox(edge.labelPos), node.box), false);
    }
  }
});
