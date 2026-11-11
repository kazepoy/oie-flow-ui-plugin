// SPDX-License-Identifier: MPL-2.0
// From a channel configuration to what Channel Flow draws: the sender, the source
// block, the destination chains, the channel's lifecycle and postprocessing blocks.
// A block holds tiles (connector, filter, transformer, script...); a tile knows what
// it opens. Texts are chosen by the components, not here.
import { destinationsOf, isTrue } from "../../shared/model/xstream.js";
import { splitChains } from "../../shared/model/chains.js";
import { endpointOf } from "../../shared/model/endpoint.js";

export { endpointOf };

/** Short names of common step types, to keep step chips narrow. */
const SHORT_TYPES = {
  "JavaScript": "JS", "Rule Builder": "Rule", "Message Builder": "Builder", "FHIR Profile Mapper": "FHIR",
  "External Script": "Ext", "XSLT Step": "XSLT", "Destination Set Filter": "DestSet", "Iterator": "↻"
};

/**
 * @typedef {{ section: string, metaDataId?: number, key?: string, index?: number }} Target what a click opens
 * @typedef {{ index: number, name: string, type: string, disabled: boolean }} StepItem
 * @typedef {{ id: string, kind: string, target: Target, empty?: boolean, items?: StepItem[],
 *             title?: string, detail?: string, canAdd?: boolean, reply?: string }} Tile
 * @typedef {{ id: string, kind: "source" | "destination" | "channel", role: string, metaDataId?: number,
 *             name: string, types: string, off: boolean, target?: Target, tiles: Tile[] }} Block
 */

/** True when the script does more than the engine's default template. */
export function hasScript(value, preprocessor = false) {
  const trivia = "(?:\\s|//[^\\r\\n]*(?:\\r?\\n|$)|/\\*[\\s\\S]*?\\*/)*";
  return !new RegExp(`^${trivia}(?:return${preprocessor ? "(?:\\s+message)?" : ""}\\s*;?)?${trivia}$`).test(String(value || ""));
}

const elementsOf = container => {
  const elements = container?.elements;
  if (!elements || typeof elements !== "object") return [];
  return Object.entries(elements)
    .filter(([type]) => !type.startsWith("@"))
    .flatMap(([type, value]) => (Array.isArray(value) ? value : [value]).map(item => ({ ...item, __type: type })))
    .sort((a, b) => Number(a.sequenceNumber ?? 0) - Number(b.sequenceNumber ?? 0));
};

function dataTypes(transformer) {
  const input = transformer?.inboundDataType;
  const output = transformer?.outboundDataType;
  return input || output ? `${input || "?"} → ${output || input || "?"}` : "";
}

/**
 * @param {(section: string, type: string) => string} elementLabel display name of a step or rule type
 */
function stepsTile(id, section, connector, metaDataId, elementLabel) {
  const key = section === "response" ? "responseTransformer" : section;
  const items = elementsOf(connector?.[key]).map((element, index) => {
    const label = elementLabel(section, element.__type);
    return { index, name: element.name || label, type: SHORT_TYPES[label] || label.split(" ")[0], disabled: !isTrue(element.enabled) };
  });
  return { id, kind: section, items, empty: !items.length, canAdd: true, target: { section, metaDataId } };
}

function scriptTile(channel, id, kind, key) {
  return { id, kind, empty: !hasScript(channel[key], key === "preprocessingScript"), target: { section: "script", key } };
}

function destinationBlock(destination, elementLabel) {
  const metaDataId = Number(destination.metaDataId);
  const id = `d${metaDataId}`;
  return {
    id: `${id}-block`, kind: "destination", role: "destination", metaDataId,
    name: destination.name || `Destination ${metaDataId}`,
    types: dataTypes(destination.transformer),
    off: !isTrue(destination.enabled),
    target: { section: "connector", metaDataId },
    tiles: [
      stepsTile(`${id}-filter`, "filter", destination, metaDataId, elementLabel),
      stepsTile(`${id}-transformer`, "transformer", destination, metaDataId, elementLabel),
      { id: `${id}-connector`, kind: "connector", title: destination.transportName || "", detail: endpointOf(destination),
        target: { section: "connector", metaDataId } },
      stepsTile(`${id}-response`, "response", destination, metaDataId, elementLabel)
    ]
  };
}

/** What the sender gets back: "None", a destination, a generated ACK or a map entry. */
function replyOf(selector, destinations) {
  if (selector === "None") return { kind: "none" };
  const destination = /^d(\d+)$/.exec(selector);
  if (destination) {
    const name = destinations.find(d => String(d.metaDataId) === destination[1])?.name;
    return { kind: "destination", metaDataId: Number(destination[1]), name: name ?? "" };
  }
  if (/^Auto-generate|^Postprocessor$/.test(selector)) return { kind: "builtin", name: selector };
  return { kind: "map", name: selector };
}

/**
 * @param {any} channel channel configuration (saved or draft)
 * @param {(section: string, type: string) => string} elementLabel
 */
export function flowModel(channel, elementLabel) {
  const source = channel.sourceConnector || {};
  const transport = source.transportName || "";
  const polled = !!source.properties?.pollConnectorProperties;
  const settings = source.properties?.sourceConnectorProperties || {};
  const destinations = destinationsOf(channel);
  const chains = splitChains(destinations, {
    enabled: destination => isTrue(destination.enabled),
    waits: destination => isTrue(destination.waitForPrevious)
  }).map(chain => chain.map(destination => destinationBlock(destination, elementLabel)));
  const selector = String(settings.responseVariable || "None");
  const reply = replyOf(selector, destinations);
  const attachment = channel.properties?.attachmentProperties?.type || "None";
  return {
    sender: {
      kind: polled ? "polled" : transport === "Channel Reader" ? "channel" : "external",
      detail: endpointOf(source) || transport
    },
    replies: reply.kind !== "none" && !polled,
    source: {
      id: "s-block", kind: "source", role: "source", metaDataId: 0, name: transport,
      types: dataTypes(source.transformer), off: !isTrue(source.enabled),
      target: { section: "connector", metaDataId: 0 },
      tiles: [
        { id: "s-connector", kind: "connector", title: transport, detail: endpointOf(source), target: { section: "connector", metaDataId: 0 } },
        { id: "s-attachments", kind: "attachments", title: attachment, empty: attachment === "None", target: { section: "attachments" } },
        scriptTile(channel, "s-preprocessor", "preprocessor", "preprocessingScript"),
        stepsTile("s-filter", "filter", source, 0, elementLabel),
        stepsTile("s-transformer", "transformer", source, 0, elementLabel)
      ]
    },
    chains,
    lifecycle: {
      id: "lifecycle-block", kind: "channel", role: "lifecycle", name: "", types: "", off: false,
      tiles: [scriptTile(channel, "deploy", "deploy", "deployScript"), scriptTile(channel, "undeploy", "undeploy", "undeployScript")]
    },
    end: {
      id: "end-block", kind: "channel", role: "postprocessing", name: "", types: "", off: false,
      tiles: [
        scriptTile(channel, "postprocessor", "postprocessor", "postprocessingScript"),
        { id: "reply", kind: "reply", reply, empty: reply.kind === "none",
          detail: reply.kind === "none" ? "" : isTrue(settings.respondAfterProcessing) ? "after" : "before",
          target: { section: "connector", metaDataId: 0 } }
      ]
    }
  };
}

/** The layout that stays readable for the channel's shape (the "Auto" choice). */
export function pickLayout(model) {
  const count = model.chains.flat().length;
  const longest = Math.max(0, ...model.chains.map(chain => chain.length));
  if (count >= 5 || longest >= 3) return "bands";
  return model.chains.length >= 2 ? "columns" : "line";
}
