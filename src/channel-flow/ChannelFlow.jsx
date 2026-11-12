// SPDX-License-Identifier: MPL-2.0
// The diagram of one channel with its toolbar: views (Auto, Line, Columns, Bands),
// zoom, help and settings. Used by the Design view (saved channel) and by the
// channel editor's Flow tab (the draft being edited, where "+" adds a step).
import { useState } from "../host/react.js";
import { can, canEditSection } from "../host/permissions.js";
import { addableTypes, addElement, elementLabel, openTarget } from "../host/editor.js";
import { openStepEditor } from "../host/routes.js";
import { toast } from "../host/platform.js";
import { readSession, writeSession } from "../host/session.js";
import { t } from "../i18n/index.js";
import { Button, SegmentedControl } from "../shared/ui/Button.jsx";
import { Hint } from "../shared/ui/Hint.jsx";
import { useSettings } from "../shared/ui/useSettings.js";
import { SettingsButton } from "../settings/SettingsButton.jsx";
import { flowModel, pickLayout } from "./model/flow-model.js";
import { layoutScene } from "./layout/scene.js";
import { useViewport } from "./viewport/useViewport.js";
import { Scene } from "./Scene.jsx";
import { Minimap } from "./Minimap.jsx";
import { AddStepMenu, StepList } from "./StepPopovers.jsx";
import { ChannelFlowHelp } from "./ChannelFlowHelp.jsx";

const LAYOUT_CHOICES = ["auto", "line", "columns", "bands"];

/**
 * @param {{ channel: any, mode: "saved" | "draft", onChange?: () => void }} props
 */
export function ChannelFlow({ channel, mode, onChange }) {
  const [settings, updateSettings] = useSettings();
  const layoutKey = `channel-flow.layout.${channel.id}`;
  const [choice, setChoice] = useState(() => readSession(layoutKey, { value: null }).value);
  const [popover, setPopover] = useState(null);

  // Built at every render: in the editor, the draft changes in place.
  const model = flowModel(channel, elementLabel);
  const selected = choice ?? settings.defaultLayout;
  const layout = selected === "auto" ? pickLayout(model) : selected;
  const scene = layoutScene(layout, model, { visibleSteps: settings.visibleSteps });
  const viewport = useViewport({ scene, sessionKey: `channel-flow.view.${channel.id}.${layout}` });

  const choose = value => {
    setChoice(value);
    writeSession(layoutKey, { value });
  };
  const close = () => setPopover(null);
  const act = {
    visibleSteps: settings.visibleSteps,
    canOpen: target => target && (["filter", "transformer", "response"].includes(target.section)
      ? canEditSection(target.section) : can("editChannel")),
    canAdd: tile => mode === "draft" && canEditSection(tile.kind),
    open: target => openTarget(channel, target, mode),
    showSteps: (tile, where, anchor) => setPopover({ kind: "steps", tile, where, anchor }),
    showAdd: (tile, where, anchor) => setPopover({ kind: "add", tile, where, anchor })
  };
  function add(type) {
    const { tile, where } = popover;
    close();
    try {
      addElement(channel, tile.target.section, tile.target.metaDataId, type.type);
      onChange?.();
      toast(t("channelFlow.added", { type: type.label, what: t(`channelFlow.tile.${tile.kind}`), where }));
      openStepEditor(channel, tile.target.section, tile.target.metaDataId, { draft: true });
    } catch (error) {
      toast(t("channelFlow.addFailed", { error: error.message }), "error");
    }
  }

  const options = LAYOUT_CHOICES.map(value => ({
    value,
    label: t(`settings.defaultLayout.${value}`),
    title: value === "auto" ? t("channelFlow.autoTitle", { layout: t(`settings.defaultLayout.${pickLayout(model)}`) }) : t(`channelFlow.layoutTitle.${value}`)
  }));

  return (
    <div className="ofu-flow">
      <div className="ofu-toolbar">
        <SegmentedControl label={t("channelFlow.layout")} value={selected} options={options} onChange={choose} />
        <Hint id="channel-flow.gestures">{t("channelFlow.hint")}</Hint>
        <span className="ofu-toolbar__end">
          <span className="ofu-zoom" role="group" aria-label={t("channelFlow.zoom")}>
            <Button label={t("channelFlow.zoomOut")} onClick={viewport.zoomOut}>−</Button>
            <output ref={viewport.zoomRef} className="ofu-zoom__level" aria-live="polite">100%</output>
            <Button label={t("channelFlow.zoomIn")} onClick={viewport.zoomIn}>+</Button>
            <Button label={t("channelFlow.fitTitle")} onClick={viewport.fit}>{t("channelFlow.fit")}</Button>
            <Button label={t("channelFlow.startTitle")} onClick={viewport.start}>100%</Button>
          </span>
          <ChannelFlowHelp />
          <SettingsButton screen="channelFlow" />
        </span>
      </div>
      <div ref={viewport.viewportRef} className="ofu-flow__viewport" tabIndex={0}
        aria-label={t("channelFlow.diagram", { name: channel.name })} aria-roledescription={t("channelFlow.diagramRole")}>
        <div ref={viewport.stageRef} className="ofu-flow__stage" style={{ width: scene.width, height: scene.height }}>
          <Scene scene={scene} model={model} act={act} />
        </div>
      </div>
      {settings.minimap !== "off" && (
        <Minimap scene={scene} viewport={viewport} onClose={() => updateSettings({ minimap: "off" })} />
      )}
      {popover?.kind === "steps" && <StepList popover={popover} act={act} onClose={close} />}
      {popover?.kind === "add" && (
        <AddStepMenu popover={popover} types={addableTypes(popover.tile.target.section, popover.tile.target.metaDataId)}
          onAdd={add} onClose={close} />
      )}
    </div>
  );
}
