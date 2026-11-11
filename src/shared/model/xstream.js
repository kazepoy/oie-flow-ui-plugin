// SPDX-License-Identifier: MPL-2.0
// The engine serializes its objects with XStream. In JSON, a list may come as an
// array, as a single object, under a wrapper key, or be absent; a boolean may come
// as a string. These helpers read such values the same way everywhere.

/**
 * The items of an XStream list.
 * asList({ channel: [a, b] }, "channel") → [a, b]; asList({ channel: a }, "channel") → [a]
 * @param {any} value
 * @param {string} [key] wrapper key, if any
 * @returns {any[]}
 */
export function asList(value, key) {
  const inner = key && value && typeof value === "object" && !Array.isArray(value) && key in value ? value[key] : value;
  if (inner == null || inner === "") return [];
  return Array.isArray(inner) ? inner : [inner];
}

/** XStream booleans: true unless explicitly false. */
export const isTrue = value => value !== false && value !== "false";

/** The destination connectors of a channel configuration. */
export const destinationsOf = channel => asList(channel?.destinationConnectors, "connector");
