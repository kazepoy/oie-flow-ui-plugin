// SPDX-License-Identifier: MPL-2.0
// Which commands a channel or a connector offers, from its state, as the
// Dashboard does: a started channel can be paused or stopped, a paused one
// resumed or stopped, a stopped one started. A channel changing state offers
// nothing.
//
// Connectors of a running channel (started, or paused: pausing stops the source)
// are stopped and started one by one. The engine only stops a destination alone
// when its queue is enabled; otherwise it answers "done" and does nothing (OIE-12),
// so such a destination has no stop button.

/** @typedef {"start" | "pause" | "resume" | "stop" | "startConnector" | "stopConnector"} Command */

/** The RBAC action (src/host/permissions.js) that allows each command. */
export const COMMAND_PERMISSION = {
  start: "startChannel",
  resume: "startChannel",
  pause: "pauseChannel",
  stop: "stopChannel",
  startConnector: "startConnector",
  stopConnector: "stopConnector"
};

/** Commands that stop traffic: the user confirms them first. */
export const CONFIRMED = new Set(["stop", "stopConnector"]);

/** @returns {Command[]} */
export function channelCommands(state) {
  if (state === "STARTED") return ["pause", "stop"];
  if (state === "PAUSED") return ["resume", "stop"];
  if (state === "STOPPED") return ["start"];
  return [];
}

const RUNNING = new Set(["STARTED", "PAUSED"]);

/**
 * @param {string} channelState
 * @param {{ state: string, queueEnabled?: boolean }} connector
 * @param {boolean} isSource
 * @returns {Command[]}
 */
export function connectorCommands(channelState, connector, isSource) {
  if (!RUNNING.has(channelState)) return [];
  if (connector.state === "STOPPED") return ["startConnector"];
  if (connector.state !== "STARTED") return [];
  if (!isSource && !connector.queueEnabled) return [];
  return ["stopConnector"];
}

/** The state a command leads to, to check that the engine did change it. */
export const EXPECTED_STATE = {
  start: "STARTED", resume: "STARTED", pause: "PAUSED", stop: "STOPPED",
  startConnector: "STARTED", stopConnector: "STOPPED"
};
