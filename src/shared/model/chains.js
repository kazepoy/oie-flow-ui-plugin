// SPDX-License-Identifier: MPL-2.0
// How the engine runs destinations: a destination that waits for the previous one
// continues its chain, one that does not starts a new chain, and chains run in
// parallel. A disabled destination never starts a chain: it stays where it is
// declared, inside the chain before it. Used by both screens.

/**
 * @template T
 * @param {T[]} destinations in declaration order
 * @param {{ enabled: (d: T) => boolean, waits: (d: T) => boolean }} read
 * @returns {T[][]} the chains, each in execution order
 */
export function splitChains(destinations, read) {
  /** @type {T[][]} */
  const chains = [];
  /** @type {T[]} disabled destinations declared before the first enabled one */
  const leading = [];
  for (const destination of destinations) {
    if (!read.enabled(destination)) {
      (chains.at(-1) ?? leading).push(destination);
    } else if (!chains.length) {
      chains.push([...leading.splice(0), destination]);
    } else if (read.waits(destination)) {
      chains.at(-1).push(destination);
    } else {
      chains.push([destination]);
    }
  }
  if (!chains.length && leading.length) chains.push(leading);
  return chains;
}
