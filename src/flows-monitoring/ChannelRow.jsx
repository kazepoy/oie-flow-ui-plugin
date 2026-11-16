// SPDX-License-Identifier: MPL-2.0
// One deployed channel, read left to right: the channel, its source, then its
// destination chains. Chains run in parallel; inside a chain, "then" marks a
// destination that waits for the previous one.
import { t } from "../i18n/index.js";
import { SOURCE_COUNTERS } from "../shared/model/stats.js";
import { cx } from "../shared/ui/Button.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { TagList } from "../shared/ui/Tag.jsx";
import { ChannelLink, ConnectorCard, StatusPip } from "./ConnectorCard.jsx";
import { ControlButtons } from "./ControlButtons.jsx";
import { ConnectorCounters } from "./Counters.jsx";
import { channelCommands } from "./controls.js";

function ChannelCard({ lane, actions }) {
  const title = (
    <>
      <StatusPip state={lane.state} />
      <span className="ofu-channel__label">{lane.name}</span>
    </>
  );
  return (
    <div className={cx("ofu-channel", lane.state && lane.state !== "STARTED" && "ofu-channel--stopped")}>
      <div className="ofu-channel__head">
        {actions.canOpenMessages
          ? <button type="button" className="ofu-channel__name" title={t("flows.channel.openMessages", { name: lane.name })}
              onClick={() => actions.openMessages(lane.id)}>{title}</button>
          : <span className="ofu-channel__name" title={lane.name}>{title}</span>}
        <div className="ofu-channel__actions">
          {actions.canViewFlow && (
            <button type="button" className="ofu-control ofu-control--flow"
              title={t("flows.channel.flowTitle")} aria-label={t("flows.channel.flowTitle")}
              onClick={() => actions.openFlow(lane.id)}>
              <Icon name="flow" />
            </button>
          )}
          <ControlButtons commands={channelCommands(lane.state)} target={{ channelId: lane.id, name: lane.name }} actions={actions} />
        </div>
      </div>
      <ConnectorCounters stats={lane.stats} keys={SOURCE_COUNTERS} where={lane.name}
        onOpen={actions.canOpenMessages ? () => actions.openMessages(lane.id) : undefined} />
      {actions.showDetails && <TagList tags={lane.tags} />}
      {actions.showLinks && lane.calledBy.length > 0 && (
        <div className="ofu-channel__links">
          {[...new Set(lane.calledBy.map(link => link.channelId))].map(channelId => (
            <ChannelLink key={channelId} channelId={channelId} direction="from" actions={actions} />
          ))}
        </div>
      )}
    </div>
  );
}

/** @param {{ lane: any, actions: any }} props */
export function ChannelRow({ lane, actions }) {
  return (
    <div id={`ofu-lane-${lane.id}`} className={cx("ofu-lane", actions.highlighted === lane.id && "ofu-lane--highlighted")}>
      <ChannelCard lane={lane} actions={actions} />
      <div className={cx("ofu-lane__source", lane.chains.length && "ofu-lane__source--flows")}>
        <ConnectorCard lane={lane} connector={lane.source} isSource actions={actions} />
      </div>
      {lane.chains.length
        ? (
          <div className={cx("ofu-chains", lane.chains.length > 1 && "ofu-chains--parallel")}>
            {lane.chains.map(chain => (
              <div key={chain[0].metaDataId} className="ofu-chain">
                <span className="ofu-chain__fork" aria-hidden="true" />
                {chain.map((connector, index) => (
                  <span key={connector.metaDataId} className="ofu-chain__step">
                    {index > 0 && (lane.chainsKnown
                      ? (
                        <span className={cx("ofu-then", connector.disabled && "ofu-then--disabled")}
                          title={connector.disabled ? t("channelFlow.edge.disabled") : t("flows.chain.waitsFor", { id: chain[index - 1].metaDataId })}>
                          <span>{t(connector.disabled ? "channelFlow.edge.disabled" : "flows.chain.then")}</span>
                        </span>
                      )
                      : <span className="ofu-then ofu-then--unknown" title={t("flows.chain.unknownTitle")} />)}
                    <ConnectorCard lane={lane} connector={connector} isSource={false} actions={actions} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        )
        : <span className="ofu-lane__none">{t("flows.chain.none")}</span>}
    </div>
  );
}
