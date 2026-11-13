// SPDX-License-Identifier: MPL-2.0
// Channel Flow without a channel: pick one from cards grouped by channel group,
// with tags and a filter bar (name and tag).
import { useEffect, useMemo, useState } from "../host/react.js";
import { channelGroups, channelNames, channelTags } from "../host/api.js";
import { channelFlowPath, navigate } from "../host/routes.js";
import { readSession, writeSession } from "../host/session.js";
import { t } from "../i18n/index.js";
import { asList } from "../shared/model/xstream.js";
import { Button } from "../shared/ui/Button.jsx";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { TagList } from "../shared/ui/Tag.jsx";
import { availablePickerTags, pickerGroups } from "./model/picker.js";

const SESSION_KEY = "channel-flow.picker";

function ChannelCard({ channel }) {
  return (
    <button type="button" className="ofu-picker__card" onClick={() => navigate(channelFlowPath(channel.id))}>
      <span className="ofu-picker__card-name" title={channel.name}>{channel.name}</span>
      <TagList tags={channel.tags} />
    </button>
  );
}

export function ChannelPicker() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState(() => readSession(SESSION_KEY, { filter: "", tagId: "", toggled: {} }));

  const update = patch => setView(previous => ({ ...previous, ...patch }));
  useEffect(() => writeSession(SESSION_KEY, view), [view]);

  useEffect(() => {
    Promise.all([channelNames(), channelGroups(), channelTags()])
      .then(([names, groups, tags]) => setData({
        names,
        groups: asList(groups ?? [], "channelGroup"),
        groupsReadable: groups !== null,
        tags
      }))
      .catch(failure => setError(failure?.message || String(failure)));
  }, []);

  const availableTags = useMemo(() => data ? availablePickerTags(data.names, data.tags) : [], [data]);
  const tagId = availableTags.some(tag => tag.id === view.tagId) ? view.tagId : "";
  const defaultGroupName = t(data?.groupsReadable ? "flows.group.default" : "flows.group.all");
  const groups = useMemo(() => data
    ? pickerGroups(data.names, data.groups, view.filter, defaultGroupName, { tags: data.tags, tagId })
    : [], [data, view.filter, defaultGroupName, tagId]);

  const filtering = view.filter.trim() !== "" || tagId !== "";
  const isOpen = groupId => filtering || (view.toggled[groupId] ?? true);
  const toggle = groupId => update({ toggled: { ...view.toggled, [groupId]: !isOpen(groupId) } });
  const setAll = value => groups.length && update({ toggled: Object.fromEntries(groups.map(group => [group.id, value])) });
  const clearFilters = () => update({ filter: "", tagId: "" });

  const totalCount = data ? data.names.size : 0;
  const shownCount = groups.reduce((sum, group) => sum + group.channels.length, 0);
  const filterLabel = t(availableTags.length ? "channelFlow.picker.filter" : "channelFlow.picker.filterNameOnly");

  return (
    <div className="ofu-picker">
      <p className="ofu-picker__intro">{t("channelFlow.picker.intro")}</p>
      <div className="ofu-picker__bar">
        <input type="search" className="ofu-search ofu-picker__search" placeholder={filterLabel} aria-label={filterLabel}
          value={view.filter} onChange={event => update({ filter: event.target.value })} autoFocus />
        {availableTags.length > 0 && (
          <label className="ofu-picker__tag-filter">
            <span>{t("channelFlow.picker.tag")}</span>
            <select value={tagId} onChange={event => update({ tagId: event.target.value })}>
              <option value="">{t("channelFlow.picker.allTags")}</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </label>
        )}
        {filtering && (
          <button type="button" className="ofu-button ofu-button--link" onClick={clearFilters}>
            {t("channelFlow.picker.clearFilters")}
          </button>
        )}
        <span className="ofu-picker__bar-end">
          {data && (
            <span className="ofu-muted" role="status">
              {filtering
                ? t("channelFlow.picker.filteredCount", { shown: shownCount, total: totalCount })
                : t("channelFlow.picker.count", { count: totalCount })}
            </span>
          )}
          <Button icon="expand" label={t("flows.expandAll")} onClick={() => setAll(true)} />
          <Button icon="collapse" label={t("flows.collapseAll")} onClick={() => setAll(false)} />
        </span>
      </div>
      {error && <EmptyState title={t("channelFlow.picker.failed")}>{error}</EmptyState>}
      {data && !groups.length && (
        <EmptyState title={t(filtering ? "channelFlow.picker.noMatch" : "channelFlow.picker.none")}>
          {filtering && (
            <div className="ofu-picker__clear">
              <button type="button" className="ofu-button" onClick={clearFilters}>{t("channelFlow.picker.clearFilters")}</button>
            </div>
          )}
        </EmptyState>
      )}
      <div className="ofu-picker__groups">
        {groups.map(group => {
          const open = isOpen(group.id);
          const bodyId = `ofu-picker-group-${group.id}`;
          return (
            <section key={group.id} className="ofu-group ofu-picker__group" aria-label={group.name}>
              <button type="button" className="ofu-group__head" aria-expanded={open} aria-controls={bodyId}
                onClick={() => toggle(group.id)}>
                <Icon name="chevron" />
                <span className="ofu-group__name">{group.name}</span>
                <span className="ofu-muted">{t("flows.group.channels", { count: group.channels.length })}</span>
              </button>
              {open && (
                <div id={bodyId} className="ofu-picker__cards">
                  {group.channels.map(channel => <ChannelCard key={channel.id} channel={channel} />)}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
