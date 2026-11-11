// SPDX-License-Identifier: MPL-2.0
// Plugin entry point. Web Admin calls register(platform) once, after sign-in.
// It only wires the two screens into the host through the public plugin API.
import { bindPlatform } from "./host/platform.js";
import { bindReact } from "./host/react.js";
import { installStyles } from "./host/styles.js";
import { loadSettings } from "./host/preferences.js";
import { CHANNEL_FLOW_PATH, channelFlowPath, FLOWS_PATH, navigate } from "./host/routes.js";
import { setLocale, t } from "./i18n/index.js";
import { iconPath } from "./shared/ui/Icon.jsx";
import { STYLE_SHEETS } from "./styles.js";
import { FlowsMonitoringView } from "./flows-monitoring/FlowsMonitoringView.jsx";
import { ChannelFlowTab, ChannelFlowView } from "./channel-flow/ChannelFlowView.jsx";
import { SettingsPanel } from "./settings/SettingsButton.jsx";

export function register(platform) {
  bindPlatform(platform);
  bindReact(platform.React);
  setLocale(navigator.languages ?? [navigator.language]);
  installStyles(STYLE_SHEETS);
  loadSettings();

  platform.registerIcon?.("flow-ui", iconPath("flow"));

  platform.registerView(FLOWS_PATH, platform.reactView(FlowsMonitoringView), { title: t("flows.title") });
  platform.registerNavItem({
    id: "flow-ui-flows", label: t("flows.title"), icon: "flow-ui", path: FLOWS_PATH,
    section: "Monitor", order: 0.5, task: "doShowDashboard"
  });

  platform.registerView(`${CHANNEL_FLOW_PATH}/:channelId?`, platform.reactView(ChannelFlowView), { title: t("channelFlow.title") });
  platform.registerNavItem({
    id: "flow-ui-channel-flow", label: t("channelFlow.title"), icon: "flow-ui", path: CHANNEL_FLOW_PATH,
    section: "Design", order: 0.5, task: "doShowChannel"
  });
  platform.registerChannelAction?.({
    id: "flow-ui-show-flow", label: t("channelFlow.action"), title: t("channelFlow.actionTitle"), icon: "flow-ui",
    task: "doShowChannel", onInvoke: channel => navigate(channelFlowPath(channel.id))
  });
  platform.registerChannelTab({ id: "flow-ui-flow", label: t("channelFlow.tab"), order: 0, component: ChannelFlowTab });
  platform.registerSettingsPanel?.({ label: t("settings.panelLabel"), component: SettingsPanel });
}
