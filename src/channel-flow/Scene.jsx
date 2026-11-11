// SPDX-License-Identifier: MPL-2.0
// Draws a scene (layout/scene.js): bands, notes, the sender, blocks and arrows,
// all at the positions computed by the layout.
import { t } from "../i18n/index.js";
import { cx } from "../shared/ui/Button.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { arrowPaths, labelPoint } from "./layout/edges.js";
import { Block } from "./Block.jsx";

const at = box => ({ left: box.x, top: box.y, width: box.width, height: box.height });

function Edges({ scene }) {
  return (
    <>
      <svg className="ofu-flow__edges" width={scene.width} height={scene.height} aria-hidden="true">
        {scene.edges.map((edge, index) => {
          const { line, head } = arrowPaths(edge);
          return (
            <g key={index} className={`ofu-edge ofu-edge--${edge.kind}`}>
              <path className="ofu-edge__line" d={line} />
              <path className="ofu-edge__head" d={head} />
            </g>
          );
        })}
      </svg>
      {scene.edges.filter(edge => edge.label).map((edge, index) => {
        const [x, y] = edge.labelAt ?? labelPoint(edge.points);
        return (
          <span key={index} className={cx("ofu-edge-label", `ofu-edge-label--${edge.kind}`, `ofu-edge-label--${edge.labelSide ?? "above"}`)}
            style={{ left: x, top: y }} aria-hidden="true">
            {t(`channelFlow.edge.${edge.label.key}`, edge.label.params)}
          </span>
        );
      })}
    </>
  );
}

function Emitter({ box, sender }) {
  return (
    <div className="ofu-emitter" style={at(box)}>
      <Icon name="system" />
      <b>{t(`channelFlow.sender.${sender.kind}`)}</b>
      <span title={sender.detail}>{sender.detail}</span>
    </div>
  );
}

/** @param {{ scene: any, model: any, act: any }} props */
export function Scene({ scene, model, act }) {
  return (
    <>
      {scene.bands.map(band => (
        <div key={band.key} className={`ofu-band ofu-band--${band.key}`} style={at(band.box)}>
          <span className="ofu-band__title">{t(`channelFlow.band.${band.key}`)}</span>
        </div>
      ))}
      {scene.notes.map((note, index) => (
        <div key={index} className={cx("ofu-note", note.kind === "label" && "ofu-note--label")} style={at(note.box)}>
          {t(`channelFlow.note.${note.key}`, note.params)}
        </div>
      ))}
      <Emitter box={scene.emitter} sender={model.sender} />
      {scene.blocks.map(placed => <Block key={placed.block.id} placed={placed} act={act} />)}
      {/* Above the blocks: arrows between tiles run over the block's background. */}
      <Edges scene={scene} />
    </>
  );
}
