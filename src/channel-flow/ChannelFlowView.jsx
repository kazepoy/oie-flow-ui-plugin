// SPDX-License-Identifier: MPL-2.0
// Channel Flow (Design menu): /channel-flow lists the channels,
// /channel-flow/<id> shows the diagram of the channel's saved version.
import { useEffect, useState } from "../host/react.js";
import { channelConfiguration } from "../host/api.js";
import { hasUnsavedDraft } from "../host/editor.js";
import { can } from "../host/permissions.js";
import { channelEditorPath, channelFlowPath, FLOWS_PATH, messagesPath, navigate } from "../host/routes.js";
import { t } from "../i18n/index.js";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { ChannelFlow } from "./ChannelFlow.jsx";
import { ChannelPicker } from "./ChannelPicker.jsx";

function SavedChannel({ channelId }) {
  const [state, setState] = useState({ channel: null, error: "" });
  useEffect(() => {
    setState({ channel: null, error: "" });
    channelConfiguration(channelId)
      .then(channel => setState({ channel, error: channel ? "" : t("channelFlow.notFound") }))
      .catch(failure => setState({ channel: null, error: failure?.message || String(failure) }));
  }, [channelId]);

  if (state.error) return <EmptyState title={t("channelFlow.loadFailed")}>{state.error}</EmptyState>;
  if (!state.channel) return <EmptyState title={t("common.loading")} />;
  const { channel } = state;
  return (
    <>
      <div className="ofu-flow-header">
        <nav className="ofu-breadcrumb" aria-label={t("channelFlow.breadcrumb")}>
          <button type="button" className="ofu-button ofu-button--link" onClick={() => navigate(channelFlowPath())}>{t("channelFlow.title")}</button>
          <span aria-hidden="true">›</span>
          <h1>{channel.name}</h1>
        </nav>
        <span className="ofu-badge" title={t("channelFlow.savedTitle")}>{t("channelFlow.saved")}</span>
        {hasUnsavedDraft(channel.id) && <span className="ofu-badge ofu-badge--warn">{t("channelFlow.unsavedDraft")}</span>}
        <span className="ofu-toolbar__end">
          {can("editChannel") && <button type="button" className="ofu-button" onClick={() => navigate(channelEditorPath(channel.id))}>{t("channelFlow.edit")}</button>}
          {can("viewMessages") && <button type="button" className="ofu-button" onClick={() => navigate(messagesPath(channel.id))}>{t("channelFlow.messages")}</button>}
          {can("viewDashboard") && <button type="button" className="ofu-button" onClick={() => navigate(FLOWS_PATH)}>{t("flows.title")}</button>}
        </span>
      </div>
      <ChannelFlow channel={channel} mode="saved" />
    </>
  );
}

/** @param {{ params: { channelId?: string } }} props given by the Web Admin router */
export function ChannelFlowView({ params }) {
  const channelId = params?.channelId;
  return (
    <div className="ofu ofu-screen ofu-channel-flow">
      {channelId
        ? <SavedChannel channelId={channelId} />
        : (
          <>
            <div className="ofu-toolbar"><h1 className="ofu-toolbar__title">{t("channelFlow.title")}</h1></div>
            <ChannelPicker />
          </>
        )}
    </div>
  );
}

/** The Flow tab of the channel editor: the draft, with its unsaved changes. */
export function ChannelFlowTab({ channel, onChange }) {
  return (
    <div className="ofu ofu-screen ofu-channel-flow ofu-channel-flow--tab">
      <ChannelFlow channel={channel} mode="draft" onChange={onChange} />
    </div>
  );
}
