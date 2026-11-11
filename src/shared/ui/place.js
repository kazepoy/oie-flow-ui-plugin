// SPDX-License-Identifier: MPL-2.0

const MARGIN = 8;

/** Position under the anchor, kept inside the window. */
export function placeUnder(anchorRect, size, viewport) {
  const left = Math.min(Math.max(MARGIN, anchorRect.left), viewport.width - size.width - MARGIN);
  const below = anchorRect.bottom + 6;
  const top = below + size.height + MARGIN <= viewport.height ? below : Math.max(MARGIN, anchorRect.top - size.height - 6);
  return { left: Math.max(MARGIN, left), top };
}
