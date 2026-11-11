// SPDX-License-Identifier: MPL-2.0
// What Channel Flow needs from Web Admin's channel editor: names of step and rule
// types, adding a step as the editor does, and opening the right editor.
import { platform, toast } from "./platform.js";
import { channelEditorPath, navigate, openStepEditor } from "./routes.js";
import { selectDestination, selectScript, selectStep, showEditorTab } from "./editor-dom.js";
import { t } from "../i18n/index.js";

/** Display name of a filter rule or transformer step type. */
export function elementLabel(section, type) {
  const definition = section === "filter" ? platform().ruleType?.(type) : platform().stepType?.(type);
  return definition?.label || platform().oie?.elementTypeLabel?.(type) || String(type).split(".").pop();
}

/** Types offered by the editor's own "Add" for this filter, transformer or response. */
export function addableTypes(section, metaDataId) {
  const registry = section === "filter" ? platform().ruleTypes() : platform().stepTypes();
  return [...registry]
    .filter(([, definition]) => Number(metaDataId) === 0 || !definition.onlySource)
    .map(([type, definition]) => ({ type, label: definition.label || platform().oie.elementTypeLabel(type) }));
}

/**
 * Appends a new step or rule to the draft, exactly as the filter or transformer
 * editor creates one, and returns its index. The caller marks the channel modified.
 */
export function addElement(channel, section, metaDataId, type) {
  const oie = platform().oie;
  const filter = section === "filter";
  const connector = Number(metaDataId) === 0 ? channel.sourceConnector
    : oie.destinationsOf(channel).find(destination => Number(destination.metaDataId) === Number(metaDataId));
  if (!connector) throw new Error(`Connector ${metaDataId} not found`);
  const version = channel["@version"] || platform().store?.getState?.("serverVersion") || "4.7.0";
  const key = section === "response" ? "responseTransformer" : section;
  const container = connector[key] ||= filter ? oie.emptyFilter(version) : oie.emptyTransformer(version);
  const definition = (filter ? platform().ruleTypes() : platform().stepTypes()).get(type);
  const element = definition?.create ? definition.create() : { __type: type, name: "", enabled: true };
  const items = oie.elementsToArray(container.elements);
  element.__type = type;
  element.name ||= definition?.label || oie.elementTypeLabel(type);
  element.enabled = true;
  element["@version"] ||= version;
  if (filter) element.operator = items.length ? "AND" : "NONE";
  items.push(element);
  container.elements = oie.arrayToElements(items);
  return items.length - 1;
}

/**
 * Opens what a tile, a step or a block points to.
 * Filters, transformers and responses have routes; the step itself, a connector,
 * a script and the attachments have none (WA-02). Those are reached by driving the
 * editor's own controls (editor-dom.js); when that fails, a message says where to
 * click. From the saved diagram the channel editor opens first; from the editor's
 * Flow tab, only its tab changes.
 * @param {"saved" | "draft"} mode
 */
export async function openTarget(channel, target, mode) {
  if (["filter", "transformer", "response"].includes(target.section)) {
    openStepEditor(channel, target.section, target.metaDataId, { draft: mode === "draft" });
    if (target.index != null && !await selectStep(target.index)) {
      toast(t("channelFlow.openTab.step", { index: target.index + 1, name: target.name ?? "" }));
    }
    return;
  }
  if (mode === "saved") navigate(channelEditorPath(channel.id));
  if (!await reveal(target)) toast(whereToClick(target));
}

/** Shows the tab, script or destination of a target in the channel editor. */
function reveal(target) {
  if (target.section === "script") return selectScript(target.key);
  if (target.section === "attachments") return showEditorTab("Summary");
  if (Number(target.metaDataId) === 0) return showEditorTab("Source");
  return selectDestination(target.metaDataId);
}

function whereToClick(target) {
  if (target.section === "script") return t("channelFlow.openTab.script", { script: t(`channelFlow.tile.${scriptTile(target.key)}`) });
  if (target.section === "attachments") return t("channelFlow.openTab.attachments");
  if (Number(target.metaDataId) === 0) return t("channelFlow.openTab.source");
  return t("channelFlow.openTab.destination", { id: target.metaDataId });
}

/** Whether the channel editor holds unsaved changes of this channel (WA-09). */
export function hasUnsavedDraft(channelId) {
  const store = platform().store;
  const draft = store?.getState?.("editingChannel");
  return !!draft && String(draft.id) === String(channelId) && !!store.getState("editingChannelDirty");
}

const SCRIPT_TILES = { deployScript: "deploy", undeployScript: "undeploy", preprocessingScript: "preprocessor", postprocessingScript: "postprocessor" };
const scriptTile = key => SCRIPT_TILES[key] ?? key;
