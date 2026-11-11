// SPDX-License-Identifier: MPL-2.0
// The plugin's style sheets in cascade order: tokens first, shared controls,
// then each screen. Bundled as text (see build.mjs).
import tokens from "./shared/styles/tokens.css";
import controls from "./shared/styles/controls.css";
import flowsMonitoring from "./flows-monitoring/flows-monitoring.css";
import channelFlow from "./channel-flow/channel-flow.css";

export const STYLE_SHEETS = [tokens, controls, flowsMonitoring, channelFlow];
