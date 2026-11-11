// SPDX-License-Identifier: MPL-2.0
// What the user may do, asked to the authorization controller (the RBAC plugin
// when installed; without it every task is allowed, as in Web Admin).
//
// Flow UI declares no permission of its own: a web-only plugin cannot, and an
// unknown task name would be allowed by RBAC (see doc/limites-plateforme.md, RB-01).
// It reuses the tasks that guard the matching Web Admin views.
import { platform } from "./platform.js";

/** [task group, task name] pairs, as used by Web Admin's own navigation. */
export const TASKS = {
  viewDashboard: ["dashboard", "doShowDashboard"],
  viewMessages: ["view", "doShowMessages"],
  viewChannels: ["view", "doShowChannel"],
  editChannel: ["channel", "doEditChannel"],
  editFilter: ["channelEdit", "doEditFilter"],
  editTransformer: ["channelEdit", "doEditTransformer"],
  editResponse: ["channelEdit", "doEditResponseTransformer"],
  // Dashboard tasks: start, pause and stop channels and connectors (startStopChannels).
  startChannel: ["dashboard", "doStart"],
  pauseChannel: ["dashboard", "doPause"],
  stopChannel: ["dashboard", "doStop"],
  startConnector: ["dashboard", "doStartConnector"],
  stopConnector: ["dashboard", "doStopConnector"]
};

/**
 * True when the user may perform the action. Ask at render time, never once for
 * all: permissions may arrive after the plugin is registered.
 * @param {keyof typeof TASKS} action
 */
export function can(action) {
  const [group, task] = TASKS[action];
  const check = platform().checkTask;
  return typeof check === "function" ? check(group, task) !== false : true;
}

/** The task that guards opening a filter, transformer or response editor. */
export function canEditSection(section) {
  if (section === "filter") return can("editFilter");
  if (section === "transformer") return can("editTransformer");
  if (section === "response") return can("editResponse");
  return can("editChannel");
}
