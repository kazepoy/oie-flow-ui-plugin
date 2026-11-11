// SPDX-License-Identifier: MPL-2.0
// Arrows of the diagram. Every link is an arrow made of horizontal and vertical
// segments, routed through the gaps between boxes. Kinds:
//   message  the path of a message            wait   waits for the previous destination
//   off      leads to a disabled destination  reply  response returned to the sender

/** Left to right between two boxes, with one bend if they are not aligned. */
export function horizontal(from, to) {
  if (Math.abs(from.cy - to.cy) < 1) return [[from.r, from.cy], [to.l, from.cy]];
  const middle = (from.r + to.l) / 2;
  return [[from.r, from.cy], [middle, from.cy], [middle, to.cy], [to.l, to.cy]];
}

/** Top to bottom between two boxes, with one bend if they are not aligned. */
export function vertical(from, to) {
  if (Math.abs(from.cx - to.cx) < 1) return [[from.cx, from.b], [from.cx, to.t]];
  const middle = (from.b + to.t) / 2;
  return [[from.cx, from.b], [from.cx, middle], [to.cx, middle], [to.cx, to.t]];
}

/** Arrows from each box to the next one. */
export function sequence(boxes, route, kind = "message") {
  return boxes.slice(1).map((next, index) => ({ points: route(boxes[index], next), kind }));
}

/** The middle of the longest segment: where a label reads best. */
export function labelPoint(points) {
  let best = -1;
  let at = points[0];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length > best) { best = length; at = [(x1 + x2) / 2, (y1 + y2) / 2]; }
  }
  return at;
}

function roundedPath(points, radius = 10) {
  let path = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const before = Math.hypot(x - px, y - py);
    const after = Math.hypot(nx - x, ny - y);
    if (!before || !after) continue;
    const r = Math.min(radius, before / 2, after / 2);
    path += ` L${x - (x - px) / before * r},${y - (y - py) / before * r} Q${x},${y} ${x + (nx - x) / after * r},${y + (ny - y) / after * r}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${path} L${lx},${ly}`;
}

/**
 * SVG paths of an arrow: its line (rounded corners) and its head. The head is a
 * path rather than an SVG marker, which does not render everywhere (WA-14).
 */
export function arrowPaths(edge) {
  const points = edge.points.map(point => point.slice());
  const tip = points[points.length - 1];
  let i = points.length - 2;
  while (i > 0 && Math.hypot(tip[0] - points[i][0], tip[1] - points[i][1]) < 1) i--;
  const length = Math.hypot(tip[0] - points[i][0], tip[1] - points[i][1]) || 1;
  const ux = (tip[0] - points[i][0]) / length;
  const uy = (tip[1] - points[i][1]) / length;
  const headLength = edge.kind === "message" ? 12 : 10;
  const halfWidth = edge.kind === "message" ? 6.5 : 5.5;
  const bx = tip[0] - ux * headLength;
  const by = tip[1] - uy * headLength;
  points[points.length - 1] = [tip[0] - ux * (headLength - 2), tip[1] - uy * (headLength - 2)];
  return {
    line: roundedPath(points),
    head: `M${tip[0]},${tip[1]} L${bx - uy * halfWidth},${by + ux * halfWidth} L${bx + uy * halfWidth},${by - ux * halfWidth}Z`
  };
}
