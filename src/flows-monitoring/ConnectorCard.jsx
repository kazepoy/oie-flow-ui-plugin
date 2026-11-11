// SPDX-License-Identifier: MPL-2.0
// A source or destination of a channel row: kind, name, state, counters.
import { t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { DESTINATION_COUNTERS, SOURCE_COUNTERS } from "../shared/model/stats.js";
import { ConnectorCounters } from "./Counters.jsx";
import { ControlButtons } from "./ControlButtons.jsx";
import { connectorCommands } from "./controls.js";

/**
 * @param {{ lane: any, connector: any, isSource: boolean, actions: any }} props
 */
export function ConnectorCard({ lane, connector, isSource, actions }) {
  const stopped = connector.state && connector.state !== "STARTED";
  const where = `${lane.name} · ${connector.name}`;
  const open = actions.canOpenMessages ? () => actions.openMessages(lane.id, connector.metaDataId) : undefined;
  const kind = isSource ? t("flows.card.source") : t("flows.card.destination", { id: connector.metaDataId });
  const title = (
    <>
      <span className="ofu-card__kind">{kind}</span>
      <span className="ofu-card__name" title={connector.name}>{connector.name}</span>
      {stopped && <span className="ofu-card__state">{t(`state.${connector.state}`)}</span>}
    </>
  );
  const linked = actions.showLinks && connector.linkTo;
  return (
    <div className={cx("ofu-card", isSource ? "ofu-card--source" : "ofu-card--destination",
      connector.stats.ERROR > 0 ? "ofu-card--error" : connector.stats.QUEUED > 0 && "ofu-card--queued",
      stopped && "ofu-card--stopped", linked && "ofu-card--linked")}>
      <div className="ofu-card__head">
        {open
          ? <button type="button" className="ofu-card__title" title={t("flows.card.openMessages", { where })} onClick={open}>{title}</button>
          : <div className="ofu-card__title">{title}</div>}
        <ControlButtons {...connectorCommands(lane.state, connector, isSource)}
          target={{ channelId: lane.id, metaDataId: connector.metaDataId, name: where }} actions={actions} />
      </div>
      <ConnectorCounters stats={connector.stats} keys={isSource ? SOURCE_COUNTERS : DESTINATION_COUNTERS}
        where={where} onOpen={open} />
      {/* Inside the card: outside, the arrows of parallel chains would cross it. */}
      {linked && <ChannelLink channelId={connector.linkTo} direction="to" actions={actions} />}
    </div>
  );
}

/**
 * A link to another channel: "→ target" under a Channel Writer, "← caller" on the
 * called channel. A click shows that channel's row.
 * @param {{ channelId: string, direction: "to" | "from", actions: any }} props
 */
export function ChannelLink({ channelId, direction, actions }) {
  const name = actions.channelName(channelId);
  const text = t(`flows.link.${direction}`, { name: name ?? t("flows.link.unknown") });
  const content = (
    <>
      <span className="ofu-link__arrow" aria-hidden="true">{direction === "to" ? "→" : "←"}</span>
      <span className="ofu-link__text">{text}</span>
    </>
  );
  return name
    ? <button type="button" className="ofu-link" title={t("flows.link.show", { name })} onClick={() => actions.focusLane(channelId)}>{content}</button>
    : <span className="ofu-link ofu-link--unknown" title={t("flows.link.hidden")}>{content}</span>;
}
