// SPDX-License-Identifier: MPL-2.0
// Pure two-level compound layout for the cross-channel links map:
// topological columns across groups, internal columns inside each group frame,
// and corridor-routed orthogonal edges with obstacle avoidance.
import { box } from "../channel-flow/layout/geometry.js";
import { DEFAULT_GROUP_ID } from "./model.js";

const LINKS_SIZE = {
  nodeWidth: 304,
  nodeHeight: 102,
  nodeHeightDetails: 172,
  groupPadX: 24,
  groupPadTop: 64,
  groupPadBottom: 24,
  intraGapX: 200,
  intraGapY: 34,
  groupGapX: 196,
  groupGapY: 44,
  stagePad: 40
};

/** Assign longest-path topological ranks, ignoring DFS back-edges on cycles. */
function assignRanks(ids, adj) {
  const idSet = new Set(ids);
  const inDegree = new Map(ids.map(id => [id, 0]));
  for (const from of ids) {
    for (const to of adj.get(from) ?? []) {
      if (to !== from && idSet.has(to)) inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    }
  }
  const rootsFirst = [...ids].sort((a, b) => (inDegree.get(a) ?? 0) - (inDegree.get(b) ?? 0));
  const state = new Map();
  const order = [];
  const backEdges = new Set();

  const visit = id => {
    state.set(id, 1);
    for (const next of adj.get(id) ?? []) {
      if (!idSet.has(next)) continue;
      const nextState = state.get(next) ?? 0;
      if (next === id || nextState === 1) {
        backEdges.add(`${id}->${next}`);
      } else if (nextState === 0) {
        visit(next);
      }
    }
    state.set(id, 2);
    order.push(id);
  };

  for (const id of rootsFirst) {
    if ((state.get(id) ?? 0) === 0) visit(id);
  }
  order.reverse();

  const ranks = new Map(ids.map(id => [id, 0]));
  for (const id of order) {
    const base = ranks.get(id) ?? 0;
    for (const next of adj.get(id) ?? []) {
      if (!idSet.has(next) || backEdges.has(`${id}->${next}`)) continue;
      if ((ranks.get(next) ?? 0) < base + 1) ranks.set(next, base + 1);
    }
  }
  return { ranks, backEdges };
}

/** Group ids into rank buckets sorted deterministically. */
function rankColumns(ids, ranks, sortKey) {
  const cols = new Map();
  for (const id of ids) {
    const col = ranks.get(id) ?? 0;
    if (!cols.has(col)) cols.set(col, []);
    cols.get(col).push(id);
  }
  return [...cols.keys()]
    .sort((a, b) => a - b)
    .map(col => cols.get(col).sort(sortKey));
}

/** Order each column after column 0 by average upstream rank position (barycenter). */
function orderColumnsByBarycenter(columns, reverseAdj, nameOf) {
  const pos = new Map();
  const ordered = [];
  for (let c = 0; c < columns.length; c++) {
    const col = [...columns[c]];
    if (c > 0) {
      col.sort((a, b) => {
        const score = id => {
          const preds = (reverseAdj.get(id) ?? []).filter(p => pos.has(p));
          return preds.length ? preds.reduce((s, p) => s + pos.get(p), 0) / preds.length : Number.POSITIVE_INFINITY;
        };
        const diff = score(a) - score(b);
        return Number.isFinite(diff) && diff !== 0 ? diff : nameOf(a).localeCompare(nameOf(b));
      });
    }
    col.forEach((id, index) => pos.set(id, index));
    ordered.push(col);
  }
  return ordered;
}

/** Build undirected/directed adjacency maps from an edge list. */
function buildAdjacency(edges, keyOf) {
  const fwd = new Map();
  const rev = new Map();
  for (const edge of edges) {
    const from = keyOf(edge.from);
    const to = keyOf(edge.to);
    if (!from || !to || from === to) continue;
    if (!fwd.has(from)) fwd.set(from, new Set());
    if (!rev.has(to)) rev.set(to, new Set());
    fwd.get(from).add(to);
    rev.get(to).add(from);
  }
  const toArrays = map => new Map([...map.entries()].map(([k, set]) => [k, [...set]]));
  return { fwd: toArrays(fwd), rev: toArrays(rev) };
}

/** Compute local relative coordinates for every node inside a group frame. */
function layoutGroupInternals(group, nodeById, edges, nodeHeight) {
  const memberSet = new Set(group.nodeIds);
  const intraEdges = edges.filter(e => memberSet.has(e.from) && memberSet.has(e.to));
  const { fwd, rev } = buildAdjacency(intraEdges, id => id);
  const nameOf = id => nodeById.get(id)?.name ?? id;
  const sortedIds = [...group.nodeIds].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const { ranks } = assignRanks(sortedIds, fwd);
  const cols = orderColumnsByBarycenter(
    rankColumns(sortedIds, ranks, (a, b) => nameOf(a).localeCompare(nameOf(b))),
    rev,
    nameOf
  );
  const maxRows = Math.max(1, ...cols.map(col => col.length));
  const numCols = Math.max(1, cols.length);
  const width = LINKS_SIZE.groupPadX * 2 + numCols * LINKS_SIZE.nodeWidth + (numCols - 1) * LINKS_SIZE.intraGapX;
  const height = LINKS_SIZE.groupPadTop + maxRows * nodeHeight + (maxRows - 1) * LINKS_SIZE.intraGapY + LINKS_SIZE.groupPadBottom;

  const offsets = new Map();
  cols.forEach((col, c) => {
    const colHeight = col.length * nodeHeight + (col.length - 1) * LINKS_SIZE.intraGapY;
    const topOffset = LINKS_SIZE.groupPadTop + Math.round(((maxRows * nodeHeight + (maxRows - 1) * LINKS_SIZE.intraGapY) - colHeight) / 2);
    col.forEach((id, r) => {
      offsets.set(id, {
        x: LINKS_SIZE.groupPadX + c * (LINKS_SIZE.nodeWidth + LINKS_SIZE.intraGapX),
        y: topOffset + r * (nodeHeight + LINKS_SIZE.intraGapY)
      });
    });
  });

  return { ...group, width, height, offsets };
}

/** Pick vertical ports distributed evenly along node side edges. */
function portOffsets(edges, nodeBoxes, nodeHeight) {
  const byOut = new Map();
  const byIn = new Map();
  for (const edge of edges) {
    if (!byOut.has(edge.from)) byOut.set(edge.from, []);
    if (!byIn.has(edge.to)) byIn.set(edge.to, []);
    byOut.get(edge.from).push(edge);
    byIn.get(edge.to).push(edge);
  }
  const spread = (list, peerBoxOf) => {
    list.sort((a, b) => (peerBoxOf(a).cy - peerBoxOf(b).cy) || (Number(a.metaDataId) - Number(b.metaDataId)));
    const pad = Math.min(24, Math.floor(nodeHeight / 5));
    const span = nodeHeight - pad * 2;
    const result = new Map();
    list.forEach((edge, idx) => {
      result.set(edge.id, list.length === 1 ? nodeHeight / 2 : pad + (idx / (list.length - 1)) * span);
    });
    return result;
  };
  const outY = new Map();
  const inY = new Map();
  for (const [id, list] of byOut) {
    for (const [eid, y] of spread(list, e => nodeBoxes.get(e.to))) outY.set(eid, nodeBoxes.get(id).t + y);
  }
  for (const [id, list] of byIn) {
    for (const [eid, y] of spread(list, e => nodeBoxes.get(e.from))) inY.set(eid, nodeBoxes.get(id).t + y);
  }
  return { outY, inY };
}

/** True when horizontal segment (x1..x2, y) or vertical (x, y1..y2) intersects box b. */
const hitsH = (x1, x2, y, b) => Math.min(x1, x2) < b.r - 2 && Math.max(x1, x2) > b.l + 2 && y > b.t - 6 && y < b.b + 6;
const hitsV = (x, y1, y2, b) => x > b.l - 6 && x < b.r + 6 && Math.min(y1, y2) < b.b - 2 && Math.max(y1, y2) > b.t + 2;

/** Find a clear Y corridor avoiding every box spanning horizontally across [x1, x2]. */
function clearHorizontalY(x1, x2, preferredY, allBoxes, excludeIds) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const blockers = allBoxes.filter(b => !excludeIds.has(b.id) && b.box.l < maxX - 4 && b.box.r > minX + 4);
  if (!blockers.some(b => preferredY > b.box.t - 10 && preferredY < b.box.b + 10)) return preferredY;
  const candidates = [];
  for (const b of blockers) {
    candidates.push(b.box.t - 16, b.box.b + 16);
  }
  const safe = candidates.filter(y => !blockers.some(b => y > b.box.t - 10 && y < b.box.b + 10));
  if (!safe.length) return Math.min(...blockers.map(b => b.box.t)) - 22;
  safe.sort((a, b) => Math.abs(a - preferredY) - Math.abs(b - preferredY));
  return safe[0];
}

/** Compute orthogonal polyline for one edge while separating corridor tracks. */
function routeEdge(edge, sBox, tBox, sy, ty, allBoxes, trackIndex, trackCount) {
  const step = trackCount > 1 ? Math.min(12, Math.floor(40 / (trackCount - 1))) : 0;
  const offset = (trackIndex - (trackCount - 1) / 2) * step;
  if (edge.from === edge.to) {
    const rx = sBox.r + 22 + Math.abs(offset);
    const topY = sBox.t - 22;
    const lx = sBox.l - 22 - Math.abs(offset);
    return {
      points: [[sBox.r, sy], [rx, sy], [rx, topY], [lx, topY], [lx, ty], [tBox.l, ty]],
      back: true
    };
  }
  const sx = sBox.r;
  const tx = tBox.l;
  if (tx >= sx + 28) {
    const mx = Math.max(sx + 24, Math.min(tx - 24, (sx + tx) / 2 + offset));
    const exclude = new Set([edge.from, edge.to]);
    const blocked = allBoxes.some(b => !exclude.has(b.id) && (hitsH(sx, mx, sy, b.box) || hitsV(mx, sy, ty, b.box) || hitsH(mx, tx, ty, b.box)));
    if (!blocked) {
      const points = Math.abs(sy - ty) < 1 ? [[sx, sy], [tx, ty]] : [[sx, sy], [mx, sy], [mx, ty], [tx, ty]];
      return { points, back: false };
    }
    const g1 = sx + 22 + Math.max(0, offset);
    const g2 = tx - 22 + Math.min(0, offset);
    const midY = clearHorizontalY(g1, g2, (sy + ty) / 2, allBoxes, exclude);
    return { points: [[sx, sy], [g1, sy], [g1, midY], [g2, midY], [g2, ty], [tx, ty]], back: false };
  }
  const outX = sx + 22 + Math.max(0, offset);
  const inX = tx - 22 - Math.max(0, offset);
  const exclude = new Set([edge.from, edge.to]);
  const aisleY = clearHorizontalY(inX, outX, Math.min(sBox.t, tBox.t) - 24 - Math.abs(offset), allBoxes, exclude);
  return { points: [[sx, sy], [outX, sy], [outX, aisleY], [inX, aisleY], [inX, ty], [tx, ty]], back: true };
}

/** Estimate rendered pill half-dimensions matching `.ofu-links-edge-label` (max-width 152px). */
function labelHalfSize(edge, details = false) {
  const hasStat = (edge.stats?.ERROR ?? 0) > 0 || (edge.stats?.QUEUED ?? 0) > 0;
  const prefix = details ? `D${edge.metaDataId} `.length * 6.8 + 8 : 0;
  const textWidth = (edge.destinationName?.length ?? 8) * 6.8 + prefix + (hasStat ? 28 : 16);
  return {
    hw: Math.min(78, Math.max(36, Math.ceil(textWidth / 2))) + 2,
    hh: 13
  };
}

const overlapCount = (cx, cy, hw, hh, rects) => {
  const l = cx - hw;
  const r = cx + hw;
  const t = cy - hh;
  const b = cy + hh;
  let hits = 0;
  for (const rect of rects) {
    if (l < rect.r && r > rect.l && t < rect.b && b > rect.t) hits++;
  }
  return hits;
};

/** Ordered candidate [x, y] points along segments that stay clear of node borders. */
function labelCandidates(points) {
  const sample = (p1, p2, fractions) => fractions.map(f => [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f]);
  if (points.length === 2) {
    return sample(points[0], points[1], [0.5, 0.38, 0.62, 0.28, 0.72]);
  }
  const candidates = [];
  if (points.length === 4) {
    // Z-bend: anchor cleanly on the middle vertical trunk in the corridor between columns.
    candidates.push(...sample(points[1], points[2], [0.5, 0.35, 0.65, 0.22, 0.78]));
  } else {
    // Detour, back-edge or self-loop: prefer the longest horizontal interior span, then vertical spans.
    const interior = [];
    for (let i = 1; i < points.length - 2; i++) {
      const a = points[i];
      const b = points[i + 1];
      const horiz = Math.abs(a[1] - b[1]) <= 1;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      interior.push({ a, b, horiz, len });
    }
    interior.sort((u, v) => (Number(v.horiz) - Number(u.horiz)) || (v.len - u.len));
    for (const seg of interior) {
      candidates.push(...sample(seg.a, seg.b, [0.5, 0.38, 0.62, 0.26, 0.74, 0.14, 0.86]));
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    candidates.push(...sample(points[i], points[i + 1], [0.5, 0.75, 0.25]));
  }
  return candidates;
}

/** Pick a collision-free anchor on the wire, avoiding nodes, group headers and sibling labels. */
function edgeLabelAnchor(edge, points, obstacles, placedLabels, details = false) {
  const { hw, hh } = labelHalfSize(edge, details);
  const safeHw = Math.max(hw, 78);
  const candidates = labelCandidates(points);
  let best = candidates[0] ?? points[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < candidates.length; i++) {
    const [cx, cy] = candidates[i];
    const obsHits = overlapCount(cx, cy, safeHw, hh, obstacles);
    const exactObsHits = overlapCount(cx, cy, hw, hh, obstacles);
    const lblHits = overlapCount(cx, cy, hw + 2, hh + 2, placedLabels);
    if (obsHits === 0 && lblHits === 0) {
      placedLabels.push({ l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh });
      return [cx, cy];
    }
    const score = exactObsHits * 10000 + obsHits * 1000 + lblHits * 100 + i * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = [cx, cy];
    }
  }
  placedLabels.push({ l: best[0] - hw, r: best[0] + hw, t: best[1] - hh, b: best[1] + hh });
  return best;
}

/**
 * Compute full two-level diagram scene for `buildLinksGraph()` output.
 * @param {{ groups: any[], nodes: any[], edges: any[] }} graph
 * @param {{ details?: boolean }} [options]
 */
export function layoutLinksGraph(graph, { details = false } = {}) {
  if (!graph.nodes.length) {
    return {
      width: 640,
      height: 360,
      anchor: { x: 0, y: 0, centered: false },
      groups: [],
      nodes: [],
      edges: [],
      bands: [],
      blocks: []
    };
  }

  const nodeHeight = details ? LINKS_SIZE.nodeHeightDetails : LINKS_SIZE.nodeHeight;
  const nodeById = new Map(graph.nodes.map(node => [node.id, node]));
  const groupIds = graph.groups.map(group => group.id);
  const { fwd: gFwd, rev: gRev } = buildAdjacency(graph.edges, id => nodeById.get(id)?.groupId);
  const groupInfoById = new Map(graph.groups.map(g => [g.id, g]));
  const compareGroups = (a, b) => {
    if (a === DEFAULT_GROUP_ID && b !== DEFAULT_GROUP_ID) return 1;
    if (b === DEFAULT_GROUP_ID && a !== DEFAULT_GROUP_ID) return -1;
    return (groupInfoById.get(a)?.name ?? a).localeCompare(groupInfoById.get(b)?.name ?? b);
  };
  const { ranks: gRanks } = assignRanks(groupIds, gFwd);
  const groupColumns = orderColumnsByBarycenter(
    rankColumns(groupIds, gRanks, compareGroups),
    gRev,
    id => groupInfoById.get(id)?.name ?? id
  );

  const internals = new Map(graph.groups.map(group => [group.id, layoutGroupInternals(group, nodeById, graph.edges, nodeHeight)]));

  let cursorX = LINKS_SIZE.stagePad;
  const placedGroups = [];
  const nodeBoxes = new Map();
  let maxRight = 0;
  let maxBottom = 0;

  for (const col of groupColumns) {
    let cursorY = LINKS_SIZE.stagePad;
    const colWidth = Math.max(...col.map(id => internals.get(id).width));
    for (const gid of col) {
      const g = internals.get(gid);
      const gx = cursorX;
      const gy = cursorY;
      const gBox = box(gx, gy, g.width, g.height);
      placedGroups.push({ ...g, box: gBox });
      for (const nid of g.nodeIds) {
        const off = g.offsets.get(nid);
        nodeBoxes.set(nid, box(gx + off.x, gy + off.y, LINKS_SIZE.nodeWidth, nodeHeight));
      }
      maxRight = Math.max(maxRight, gBox.r);
      maxBottom = Math.max(maxBottom, gBox.b);
      cursorY += g.height + LINKS_SIZE.groupGapY;
    }
    cursorX += colWidth + LINKS_SIZE.groupGapX;
  }

  const allBoxes = graph.nodes.map(node => ({ id: node.id, box: nodeBoxes.get(node.id) }));
  const labelObstacles = [
    ...allBoxes.map(b => b.box),
    ...placedGroups.map(g => box(g.box.x, g.box.y, g.box.width, 32))
  ];
  const { outY, inY } = portOffsets(graph.edges, nodeBoxes, nodeHeight);
  const bucketMap = new Map();
  for (const edge of graph.edges) {
    const s = nodeBoxes.get(edge.from);
    const t = nodeBoxes.get(edge.to);
    const bucketKey = `${Math.round(s.cx / 160)}->${Math.round(t.cx / 160)}`;
    if (!bucketMap.has(bucketKey)) bucketMap.set(bucketKey, []);
    bucketMap.get(bucketKey).push(edge);
  }
  const trackOf = new Map();
  for (const list of bucketMap.values()) {
    list.sort((a, b) => ((outY.get(a.id) ?? 0) - (outY.get(b.id) ?? 0)) || a.id.localeCompare(b.id));
    list.forEach((edge, index) => trackOf.set(edge.id, { index, count: list.length }));
  }

  const placedLabels = [];
  const placedEdges = graph.edges.map(edge => {
    const sBox = nodeBoxes.get(edge.from);
    const tBox = nodeBoxes.get(edge.to);
    const track = trackOf.get(edge.id) ?? { index: 0, count: 1 };
    const { points, back } = routeEdge(edge, sBox, tBox, outY.get(edge.id), inY.get(edge.id), allBoxes, track.index, track.count);
    const labelPos = edgeLabelAnchor(edge, points, labelObstacles, placedLabels, details);
    for (const [px, py] of points) {
      maxRight = Math.max(maxRight, px);
      maxBottom = Math.max(maxBottom, py);
    }
    const { hw, hh } = labelHalfSize(edge, details);
    maxRight = Math.max(maxRight, labelPos[0] + hw);
    maxBottom = Math.max(maxBottom, labelPos[1] + hh);
    return { ...edge, points, back, labelPos };
  });

  const minY = Math.min(0, ...placedEdges.flatMap(e => [...e.points.map(p => p[1] - 32), e.labelPos[1] - 20]));
  const shiftY = minY < 0 ? Math.ceil(-minY + LINKS_SIZE.stagePad / 2) : 0;
  if (shiftY > 0) {
    placedGroups.forEach(g => { g.box = box(g.box.x, g.box.y + shiftY, g.box.width, g.box.height); });
    for (const [id, b] of nodeBoxes) nodeBoxes.set(id, box(b.x, b.y + shiftY, b.width, b.height));
    placedEdges.forEach(e => {
      e.points = e.points.map(([x, y]) => [x, y + shiftY]);
      e.labelPos = [e.labelPos[0], e.labelPos[1] + shiftY];
    });
    maxBottom += shiftY;
  }

  const placedNodes = graph.nodes.map(node => ({ ...node, box: nodeBoxes.get(node.id) }));
  return {
    width: Math.ceil(maxRight + LINKS_SIZE.stagePad),
    height: Math.ceil(maxBottom + LINKS_SIZE.stagePad),
    anchor: { x: 0, y: 0, centered: false },
    groups: placedGroups,
    nodes: placedNodes,
    edges: placedEdges,
    bands: placedGroups.map(g => ({ id: g.id, key: g.id, kind: "group", box: g.box })),
    blocks: placedNodes.map(n => ({
      block: { id: n.id, kind: n.hidden ? "channel" : "source", off: Boolean(n.hidden || (n.state && n.state !== "STARTED")) },
      box: n.box
    }))
  };
}
