// SPDX-License-Identifier: MPL-2.0
// Turns channels.mjs into the files build-dump.sh loads (demo/seed/generated/).
// Channels start from Web Admin's own defaults, read from an extracted WAR, so they
// are what the web administrator itself would create and send.
//
//   WEBADMIN_DIR=<extracted oie-webadmin.war> \
//     node --import ./tools/webadmin/register.mjs tools/generate.mjs
//
// (tools/extract-webadmin.sh extracts the WAR of the demo image.)
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { loadWebAdmin } from "./webadmin/load.mjs";
import { merge } from "./merge.mjs";
import { DEPLOY_ORDER, GROUPS, ROLES, USERS } from "../channels.mjs";

const VERSION = "4.7.0";
const OUT = new URL("../generated/", import.meta.url);
const webadmin = await loadWebAdmin(process.env.WEBADMIN_DIR);
const { oie } = webadmin;

/* ---------------------------------------------------------------- channel parts */

function dataTypeProperties(name) {
  const definition = webadmin.dataTypes.get(name);
  if (!definition) throw new Error(`Unknown data type ${name}`);
  return definition.defaults(VERSION);
}

/** Steps or rules, numbered and serialized as Web Admin does. */
function elements(items = [], registry) {
  return oie.arrayToElements(items.map(({ type, ...fields }, index) => {
    const definition = registry.get(type);
    if (!definition) throw new Error(`Unknown element type ${type}`);
    const element = { ...definition.create(), ...fields, __type: type, "@version": VERSION };
    // The first filter rule has no operator, as in Web Admin's editor.
    if ("operator" in element && index === 0) element.operator = "NONE";
    return element;
  }));
}

function transformer(steps, inbound, outbound) {
  return {
    ...oie.emptyTransformer(VERSION),
    elements: elements(steps, webadmin.steps),
    inboundDataType: inbound,
    outboundDataType: outbound,
    inboundProperties: dataTypeProperties(inbound),
    outboundProperties: dataTypeProperties(outbound)
  };
}

/**
 * @param {any} description a connector of channels.mjs
 * @param {string} channelDataType the data type the destinations receive
 */
function connector(description, mode, metaDataId, channelDataType) {
  const definition = webadmin.connectors.get(`${mode}:${description.transport}`);
  if (!definition) throw new Error(`Unknown connector ${mode} ${description.transport}`);
  const source = mode === "SOURCE";
  const base = source ? oie.defaultSourceConnector(VERSION) : oie.defaultDestinationConnector(VERSION, metaDataId, description.name);
  const own = description.dataType ?? channelDataType;
  const result = {
    ...base,
    transportName: description.transport,
    properties: merge(definition.defaults(VERSION), description.properties ?? {}),
    filter: { ...oie.emptyFilter(VERSION), elements: elements(description.filter, webadmin.rules) },
    transformer: transformer(description.transformer, source ? own : channelDataType, own),
    enabled: description.enabled ?? true,
    waitForPrevious: description.waitForPrevious ?? true
  };
  if (!source) result.responseTransformer = transformer(description.response, own, own);
  return result;
}

const ATTACHMENT_HANDLERS = {
  "Entire Message": "com.mirth.connect.server.attachments.identity.IdentityAttachmentHandlerProvider"
};

function channel(description) {
  const dataType = description.source.dataType ?? "RAW";
  const result = oie.newChannel(description.name, VERSION);
  Object.assign(result, {
    id: description.id,
    description: description.description,
    nextMetaDataId: description.destinations.length + 1,
    sourceConnector: connector(description.source, "SOURCE", 0, dataType),
    destinationConnectors: {
      connector: description.destinations.map((destination, index) => connector(destination, "DESTINATION", index + 1, dataType))
    }
  });
  const scripts = description.scripts ?? {};
  if (scripts.deploy) result.deployScript = scripts.deploy;
  if (scripts.undeploy) result.undeployScript = scripts.undeploy;
  if (scripts.preprocessor) result.preprocessingScript = scripts.preprocessor;
  if (scripts.postprocessor) result.postprocessingScript = scripts.postprocessor;
  if (description.attachment) {
    result.properties.attachmentProperties = {
      "@version": VERSION,
      type: description.attachment.type,
      className: ATTACHMENT_HANDLERS[description.attachment.type],
      properties: { "@class": "linked-hash-map", entry: [{ string: ["identity.mimetype", description.attachment.mimeType] }] }
    };
  }
  return oie.encodeChannelTemplates(result);
}

/* ---------------------------------------------------------------- wire format */

/** JSON as the engine reads it: "@" attributes before child elements (see Web Admin's api.js). */
function engineJson(value) {
  return JSON.stringify(value, (key, node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return node;
    const entries = Object.entries(node);
    return Object.fromEntries([...entries.filter(([name]) => name.startsWith("@")), ...entries.filter(([name]) => !name.startsWith("@"))]);
  }, 2);
}

const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A stable UUID derived from a name (groups have no id in channels.mjs). */
function nameUuid(name) {
  const hex = createHash("sha256").update(`flow-ui-demo:${name}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const escapeXml = text => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strings = (tag, values) => `<${tag}>${values.map(value => `<string>${escapeXml(value)}</string>`).join("")}</${tag}>`;

function roleXml(role) {
  const channelIds = (role.groups ?? []).flatMap(name => GROUPS.find(group => group.name === name).channels.map(c => c.id));
  return [
    "<com.diridium.rbac.Role>",
    `<name>${escapeXml(role.name)}</name>`,
    `<description>${escapeXml(role.description)}</description>`,
    strings("permissions", role.permissions),
    strings("channelIds", channelIds),
    `<restricted>${channelIds.length > 0}</restricted>`,
    "<isAdmin>false</isAdmin>",
    "</com.diridium.rbac.Role>"
  ].join("");
}

/* ---------------------------------------------------------------- output */

await rm(OUT, { recursive: true, force: true });
await mkdir(new URL("channels/", OUT), { recursive: true });
await mkdir(new URL("roles/", OUT), { recursive: true });

const write = (path, text) => writeFile(new URL(path, OUT), text.endsWith("\n") ? text : `${text}\n`);
const number = index => String(index + 1).padStart(2, "0");

for (const [index, description] of DEPLOY_ORDER.entries()) {
  await write(`channels/${number(index)}-${slug(description.name)}.json`, engineJson({ channel: channel(description) }));
}

await write("groups.json", engineJson({
  set: {
    channelGroup: GROUPS.map(group => ({
      "@version": VERSION,
      id: nameUuid(group.name),
      name: group.name,
      revision: 0,
      description: group.description,
      channels: { channel: group.channels.map(c => ({ "@version": VERSION, id: c.id, revision: 0 })) }
    }))
  }
}));

for (const [index, role] of ROLES.entries()) await write(`roles/${number(index)}-${slug(role.name)}.xml`, roleXml(role));

// Plain text lists for the shell script, one record per line, fields separated by "|".
await write("users.txt", USERS.map(user => [user.username, user.firstName, user.lastName, user.role].join("|")).join("\n"));
// The API sends a message to the destinations it is given, and to none without
// (doc/platform-limits.md, OIE-11): list the enabled ones.
const enabledDestinations = c => c.destinations.flatMap((d, index) => d.enabled === false ? [] : [index + 1]).join(",");
await write("messages.txt", DEPLOY_ORDER.flatMap(c => (c.seed ?? [])
  .map(([file, times]) => [c.id, file, times, enabledDestinations(c), c.name].join("|"))).join("\n"));
await write("states.txt", DEPLOY_ORDER.filter(c => c.state).map(c => [c.id, c.state, c.name].join("|")).join("\n"));

console.log(`${DEPLOY_ORDER.length} channels, ${GROUPS.length} groups, ${ROLES.length} roles, ${USERS.length} users → ${OUT.pathname}`);
