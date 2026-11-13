// SPDX-License-Identifier: MPL-2.0
// What Channel Flow needs from Web Admin's channel editor: names of step and rule
// types, adding a step as the editor does, and opening the right editor.
import { platform } from "./platform.js";
import { channelEditorPath, navigate, openStepEditor } from "./routes.js";

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

/** Query parameters selecting a tab, script or destination inside the channel editor. */
export function editorTargetQuery(target) {
  if (target.section === "script") return { tab: "scripts", script: target.key };
  if (target.section === "attachments") return { tab: "summary" };
  if (Number(target.metaDataId) === 0) return { tab: "source" };
  return { tab: "destinations", metaDataId: target.metaDataId };
}

/**
 * Opens what a tile, a step or a block points to via Web Admin routes and URL
 * query parameters. From the editor's Flow tab (`mode === "draft"`), navigating
 * within `/channels/:id/` preserves the unsaved draft in `"editingChannel"`.
 * @param {any} channel
 * @param {any} target
 * @param {"saved" | "draft"} mode
 */
export function openTarget(channel, target, mode) {
  if (["filter", "transformer", "response"].includes(target.section)) {
    openStepEditor(channel, target.section, target.metaDataId, { draft: mode === "draft", step: target.index });
    return;
  }
  navigate(channelEditorPath(channel.id, editorTargetQuery(target)));
}

/** Whether the channel editor holds unsaved changes of this channel (WA-09). */
export function hasUnsavedDraft(channelId) {
  const store = platform().store;
  const draft = store?.getState?.("editingChannel");
  return !!draft && String(draft.id) === String(channelId) && !!store.getState("editingChannelDirty");
}
