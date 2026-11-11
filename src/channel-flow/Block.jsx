// SPDX-License-Identifier: MPL-2.0
// A block of the diagram: the source, a destination or the channel (lifecycle,
// postprocessing). Same drawing for all; colour and label tell them apart.
import { t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { SIZE } from "./layout/geometry.js";
import { Tile } from "./Tile.jsx";

/** Kind label and name of a block, in words. */
export function blockTitle(block) {
  if (block.role === "source") return { kind: t("channelFlow.block.source"), name: block.name };
  if (block.role === "destination") return { kind: t("channelFlow.block.destination", { id: block.metaDataId }), name: block.name };
  return { kind: t("channelFlow.block.channel"), name: t(`channelFlow.block.${block.role}`) };
}

/** @param {{ placed: any, act: any }} props placed: the block with its box and tiles */
export function Block({ placed, act }) {
  const { block, box } = placed;
  const { kind, name } = blockTitle(block);
  const where = `${kind} · ${name}`;
  const title = (
    <>
      <span className="ofu-block__title">
        <span className="ofu-block__kind">{kind}</span>
        <span className="ofu-block__name" title={name}>{name}</span>
        {block.off && <span className="ofu-block__tag">{t("channelFlow.block.disabled")}</span>}
      </span>
      <span className="ofu-block__types" title={block.types}>{block.types || " "}</span>
    </>
  );
  const canOpen = block.target && act.canOpen(block.target);
  return (
    <section className={cx("ofu-block", `ofu-block--${block.kind}`, block.off && "ofu-block--off")}
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }} aria-label={where}>
      {canOpen
        ? <button type="button" className="ofu-block__head" onClick={() => act.open(block.target)}
            title={t("channelFlow.openConnector", { where })}>{title}</button>
        : <header className="ofu-block__head">{title}</header>}
      {/* Tiles are placed inside the block's border. */}
      {placed.tiles.map(tile => (
        <Tile key={tile.tile.id} placed={{ ...tile, x: tile.box.x - box.x - SIZE.border, y: tile.box.y - box.y - SIZE.border }}
          where={where} act={act} />
      ))}
    </section>
  );
}
