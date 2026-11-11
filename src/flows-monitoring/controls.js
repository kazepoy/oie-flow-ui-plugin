// SPDX-License-Identifier: MPL-2.0
// Which commands a channel or a connector offers, from its state, as the
// Dashboard does: a started channel can be paused or stopped, a paused one
// resumed or stopped, a stopped one started. Connectors of a started channel can
// be stopped and started one by one. A channel changing state offers nothing.

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

/** @returns {Command[]} */
export function connectorCommands(channelState, connectorState) {
  if (channelState !== "STARTED") return [];
  if (connectorState === "STARTED") return ["stopConnector"];
  if (connectorState === "STOPPED") return ["startConnector"];
  return [];
}
