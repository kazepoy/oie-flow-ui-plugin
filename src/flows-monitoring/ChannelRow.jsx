// SPDX-License-Identifier: MPL-2.0
// One deployed channel, read left to right: the channel, its source, then its
// destination chains. Chains run in parallel; inside a chain, "then" marks a
// destination that waits for the previous one.
import { t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { ChannelLink, ConnectorCard } from "./ConnectorCard.jsx";
import { ControlButtons } from "./ControlButtons.jsx";
import { channelCommands } from "./controls.js";

const STATE_TONE = { STARTED: "ok", PAUSED: "warn", STOPPED: "error" };

function ChannelCard({ lane, actions }) {
  const name = (
    <>
      <span className={cx("ofu-pip", STATE_TONE[lane.state] && `ofu-pip--${STATE_TONE[lane.state]}`)} aria-hidden="true" />
      <span className="ofu-channel__label">{lane.name}</span>
    </>
  );
  return (
    <div className="ofu-channel">
      {actions.canOpenMessages
        ? <button type="button" className="ofu-channel__name" title={t("flows.channel.openMessages", { name: lane.name })}
            onClick={() => actions.openMessages(lane.id)}>{name}</button>
        : <span className="ofu-channel__name" title={lane.name}>{name}</span>}
      <div className="ofu-channel__row">
        <span className="ofu-muted">{t(`state.${lane.state}`)}</span>
        {actions.canViewFlow && (
          <button type="button" className="ofu-button ofu-button--link" title={t("flows.channel.flowTitle")}
            onClick={() => actions.openFlow(lane.id)}>{t("flows.channel.flow")}</button>
        )}
        {actions.canEdit && (
          <button type="button" className="ofu-button ofu-button--link" title={t("flows.channel.editTitle")}
            onClick={() => actions.openEditor(lane.id)}>{t("flows.channel.edit")}</button>
        )}
        <ControlButtons commands={channelCommands(lane.state)} target={{ channelId: lane.id, name: lane.name }} actions={actions} />
      </div>
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
                        <span className="ofu-then" title={t("flows.chain.waitsFor", { id: chain[index - 1].metaDataId })}>
                          <span>{t("flows.chain.then")}</span>
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
