// SPDX-License-Identifier: MPL-2.0
// Popovers opened from a tile: every step of a long filter or transformer
// ("+N more"), and the types of step that "+" can add.
import { t } from "../i18n/index.js";
import { Popover } from "../shared/ui/Popover.jsx";
import { StepChip } from "./Tile.jsx";

/** All the steps of a tile; each opens its editor. */
export function StepList({ popover, act, onClose }) {
  const { tile, where, anchor } = popover;
  const label = t(`channelFlow.tile.${tile.kind}`);
  const canOpen = act.canOpen(tile.target);
  return (
    <Popover anchor={anchor} onClose={onClose} label={`${label} · ${where}`}>
      <h3>{t(tile.kind === "filter" ? "channelFlow.stepList.rules" : "channelFlow.stepList.steps", { what: label, count: tile.items.length })}</h3>
      <ol className="ofu-step-list">
        {tile.items.map(item => (
          <li key={item.index}>
            <StepChip item={item} onOpen={canOpen ? () => { onClose(); act.open({ ...tile.target, index: item.index, name: item.name }); } : undefined} />
          </li>
        ))}
      </ol>
    </Popover>
  );
}

/** The step or rule types the editor offers, as a menu. */
export function AddStepMenu({ popover, types, onAdd, onClose }) {
  const { tile, where, anchor } = popover;
  const label = t(`channelFlow.tile.${tile.kind}`);
  return (
    <Popover anchor={anchor} onClose={onClose} label={t("channelFlow.addTo", { what: label, where })} role="menu">
      <h3>{t("channelFlow.add", { what: label })}</h3>
      {types.length
        ? (
          <ul className="ofu-menu">
            {types.map(type => (
              <li key={type.type}><button type="button" role="menuitem" onClick={() => onAdd(type)}>{type.label}</button></li>
            ))}
          </ul>
        )
        : <p className="ofu-muted">{t("channelFlow.noStepTypes")}</p>}
    </Popover>
  );
}
