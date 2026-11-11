// SPDX-License-Identifier: MPL-2.0

const isPlainObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

/** Deep merge of plain objects: `patch` wins; arrays and other values are replaced. */
export function merge(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) result[key] = merge(base[key], value);
  return result;
}
