// SPDX-License-Identifier: MPL-2.0
// A tile of a block: connector, filter, transformer, response, script,
// attachments or response to the sender. A click opens it; a step chip opens its
// filter or transformer; "+" adds a step (in the channel editor's Flow tab).
import { t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { isStepTile, shownSteps } from "./layout/geometry.js";

const ICONS = {
  filter: "filter", transformer: "transformer", response: "response", connector: "connector",
  attachments: "attachment", reply: "reply", preprocessor: "script", postprocessor: "script", deploy: "script", undeploy: "script"
};

/** What the sender gets back, in words. */
function replyText(reply) {
  if (reply.kind === "none") return t("channelFlow.reply.none");
  if (reply.kind === "destination") return t("channelFlow.reply.destination", { id: reply.metaDataId, name: reply.name });
  if (reply.kind === "map") return t("channelFlow.reply.map", { name: reply.name });
  return reply.name;
}

function TileBody({ tile }) {
  if (isStepTile(tile)) return tile.empty ? <span className="ofu-tile__empty">{t(`channelFlow.empty.${tile.kind}`)}</span> : null;
  if (tile.kind === "connector") {
    return (
      <>
        <span className="ofu-tile__strong" title={tile.title}>{tile.title}</span>
        <span className="ofu-tile__mono" title={tile.detail}>{tile.detail || " "}</span>
      </>
    );
  }
  if (tile.kind === "reply") {
    const text = replyText(tile.reply);
    return (
      <>
        <span className={tile.empty ? "ofu-tile__empty" : "ofu-tile__strong"} title={text}>{text}</span>
        <span className="ofu-tile__mono">{tile.detail ? t(`channelFlow.reply.${tile.detail}`) : " "}</span>
      </>
    );
  }
  if (tile.kind === "attachments") return <span className={tile.empty ? "ofu-tile__empty" : "ofu-tile__ok"}>{tile.title}</span>;
  return tile.empty
    ? <span className="ofu-tile__empty">{t("channelFlow.empty.script")}</span>
    : <span className="ofu-tile__ok">{t("channelFlow.scriptSet")}</span>;
}

/** One step of a filter, transformer or response. */
export function StepChip({ item, onOpen }) {
  const content = (
    <>
      <span className="ofu-chip__type">{item.type}</span>
      <span className="ofu-chip__name">{item.name}</span>
    </>
  );
  const title = item.disabled ? t("channelFlow.step.disabled", { name: item.name }) : item.name;
  const className = cx("ofu-chip", item.disabled && "ofu-chip--disabled");
  return onOpen
    ? <button type="button" className={className} title={title} onClick={onOpen}>{content}</button>
    : <span className={className} title={title}>{content}</span>;
}

/**
 * @param {{ placed: any, where: string, act: any }} props placed: the tile and its box inside the block
 */
export function Tile({ placed, where, act }) {
  const { tile } = placed;
  const steps = isStepTile(tile);
  const label = t(`channelFlow.tile.${tile.kind}`);
  const canOpen = act.canOpen(tile.target);
  const { shown, more } = steps ? shownSteps(tile.items.length, act.visibleSteps) : { shown: 0, more: 0 };
  const head = (
    <span className="ofu-tile__head">
      <Icon name={ICONS[tile.kind]} />
      <span className="ofu-tile__label">{label}</span>
      {steps && !tile.empty && <span className="ofu-tile__count">{tile.items.length}</span>}
    </span>
  );
  const style = { left: placed.x, top: placed.y, width: placed.width, height: placed.height };
  return (
    <div className={cx("ofu-tile", tile.empty && "ofu-tile--empty", (tile.kind === "connector" || tile.kind === "reply" && !tile.empty) && "ofu-tile--io")}
      style={style}>
      {canOpen
        ? <button type="button" className="ofu-tile__main" onClick={() => act.open(tile.target)} aria-label={t("channelFlow.open", { what: label, where })}>
            {head}<TileBody tile={tile} />
          </button>
        : <div className="ofu-tile__main">{head}<TileBody tile={tile} /></div>}
      {steps && !tile.empty && (
        <ul className="ofu-tile__steps">
          {tile.items.slice(0, shown).map(item => (
            <li key={item.index}><StepChip item={item} onOpen={canOpen ? () => act.open({ ...tile.target, index: item.index }) : undefined} /></li>
          ))}
          {more > 0 && (
            <li>
              <button type="button" className="ofu-chip ofu-chip--more" aria-haspopup="dialog"
                onClick={event => act.showSteps(tile, where, event.currentTarget)}>
                {t("channelFlow.more", { count: more })}
              </button>
            </li>
          )}
        </ul>
      )}
      {steps && act.canAdd(tile) && (
        <button type="button" className="ofu-tile__add" aria-haspopup="menu"
          title={t("channelFlow.add", { what: label })} aria-label={t("channelFlow.addTo", { what: label, where })}
          onClick={event => act.showAdd(tile, where, event.currentTarget)}>+</button>
      )}
    </div>
  );
}
