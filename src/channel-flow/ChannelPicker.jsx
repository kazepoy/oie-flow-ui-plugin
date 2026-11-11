// SPDX-License-Identifier: MPL-2.0
// Channel Flow without a channel: pick one, by group, with a search field.
import { useEffect, useState } from "../host/react.js";
import { channelGroups, channelNames } from "../host/api.js";
import { channelFlowPath, navigate } from "../host/routes.js";
import { t } from "../i18n/index.js";
import { asList } from "../shared/model/xstream.js";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { pickerGroups } from "./model/picker.js";

export function ChannelPicker() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    Promise.all([channelNames(), channelGroups()])
      .then(([names, groups]) => setData({ names, groups: asList(groups ?? [], "channelGroup"), groupsReadable: groups !== null }))
      .catch(failure => setError(failure?.message || String(failure)));
  }, []);

  const groups = data ? pickerGroups(data.names, data.groups, filter, t(data.groupsReadable ? "flows.group.default" : "flows.group.all")) : [];
  return (
    <div className="ofu-picker">
      <div className="ofu-picker__intro">
        <p>{t("channelFlow.picker.intro")}</p>
        <input type="search" className="ofu-search" placeholder={t("channelFlow.picker.filter")} aria-label={t("channelFlow.picker.filter")}
          value={filter} onChange={event => setFilter(event.target.value)} autoFocus />
      </div>
      {error && <EmptyState title={t("channelFlow.picker.failed")}>{error}</EmptyState>}
      {data && !groups.length && <EmptyState title={t(filter ? "channelFlow.picker.noMatch" : "channelFlow.picker.none")} />}
      <div className="ofu-picker__groups">
        {groups.map(group => (
          <section key={group.id} className="ofu-picker__group" aria-label={group.name}>
            <h2>{group.name}</h2>
            <ul>
              {group.channels.map(channel => (
                <li key={channel.id}>
                  <button type="button" onClick={() => navigate(channelFlowPath(channel.id))}>{channel.name}</button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
