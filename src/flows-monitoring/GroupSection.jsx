// SPDX-License-Identifier: MPL-2.0
// A channel group: a header that opens and closes it, with its totals, then
// one row per channel. A closed group still shows its totals, so errors and
// queues stay visible.
import { t } from "../i18n/index.js";
import { Icon } from "../shared/ui/Icon.jsx";
import { ChannelRow } from "./ChannelRow.jsx";
import { Totals } from "./Counters.jsx";

/** @param {{ group: any, open: boolean, onToggle: () => void, actions: any }} props */
export function GroupSection({ group, open, onToggle, actions }) {
  const bodyId = `ofu-group-${group.id}`;
  return (
    <section className="ofu-group" aria-label={group.name}>
      <button type="button" className="ofu-group__head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <Icon name="chevron" />
        <span className="ofu-group__name">{group.name}</span>
        <span className="ofu-muted">{t("flows.group.channels", { count: group.lanes.length })}</span>
        <Totals stats={group.stats} label={t("flows.group.totals", { name: group.name })} />
      </button>
      {open && (
        <div id={bodyId} className="ofu-group__lanes">
          {group.lanes.map(lane => <ChannelRow key={lane.id} lane={lane} actions={actions} />)}
        </div>
      )}
    </section>
  );
}
