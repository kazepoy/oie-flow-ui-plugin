// SPDX-License-Identifier: MPL-2.0
// A small vocabulary to describe demo channels (see channels.mjs). Each function
// returns a plain description; tools/generate.mjs turns it into the JSON that Web
// Admin would send, starting from Web Admin's own defaults. `properties` only
// lists what differs from those defaults.
import { merge } from "./tools/merge.mjs";

const STEP = {
  javascript: "com.mirth.connect.plugins.javascriptstep.JavaScriptStep",
  mapper: "com.mirth.connect.plugins.mapper.MapperStep",
  messageBuilder: "com.mirth.connect.plugins.messagebuilder.MessageBuilderStep",
  destinationSet: "com.mirth.connect.plugins.destinationsetfilter.DestinationSetFilterStep"
};
const RULE = {
  javascript: "com.mirth.connect.plugins.javascriptrule.JavaScriptRule",
  builder: "com.mirth.connect.plugins.rulebuilder.RuleBuilderRule"
};

/* ---------------------------------------------------------------- connectors */

/** Options: name, dataType, enabled, waitForPrevious, properties, filter, transformer, response. */
const connector = (transport, properties, options = {}) =>
  ({ ...options, transport, properties: merge(properties, options.properties ?? {}) });

/** MLLP listener (HL7 v2 by default). */
export const tcpListener = (port, options) =>
  connector("TCP Listener", { listenerConnectorProperties: { port: String(port) } }, { dataType: "HL7V2", ...options });

export const tcpSender = (host, port, options) =>
  connector("TCP Sender", { remoteAddress: host, remotePort: String(port) }, { dataType: "HL7V2", ...options });

export const httpListener = (port, contextPath, options) =>
  connector("HTTP Listener", { listenerConnectorProperties: { port: String(port) }, contextPath }, options);

export const httpSender = (url, options) =>
  connector("HTTP Sender", { host: url, content: "${message.encodedData}", contentType: "application/json" }, options);

export const channelReader = options => connector("Channel Reader", {}, options);

export const channelWriter = (channelId, options) => connector("Channel Writer", { channelId }, options);

export const fileReader = (directory, fileFilter, options) =>
  connector("File Reader", { host: directory, fileFilter, afterProcessingAction: "DELETE" }, options);

export const fileWriter = (directory, fileName, options) =>
  connector("File Writer", { host: directory, outputPattern: fileName, template: "${message.encodedData}" }, options);

/** A source that runs a script every `seconds`. */
export const javascriptReader = (script, seconds, options) =>
  connector("JavaScript Reader", { script, pollConnectorProperties: { pollingFrequency: seconds * 1000 } }, options);

export const javascriptWriter = (script, options) => connector("JavaScript Writer", { script }, options);

export const smtpSender = (host, to, subject, options) =>
  connector("SMTP Sender", { smtpHost: host, to, from: "flow-ui-demo@hospital.example", subject, body: "${message.encodedData}" }, options);

/** Destination queue: messages that cannot be sent wait and are retried. */
export const queued = { destinationConnectorProperties: { queueEnabled: true, retryIntervalMillis: 30000, retryCount: 0 } };

/* ---------------------------------------------------------------- steps and rules */

export const javascriptStep = (name, script) => ({ type: STEP.javascript, name, script });

/** Copies a value of the message into a map variable. */
export const mapperStep = (name, variable, mapping, scope = "CHANNEL") => ({ type: STEP.mapper, name, variable, mapping, scope });

/** Sets a segment of the outbound message. */
export const messageBuilderStep = (name, messageSegment, mapping) => ({ type: STEP.messageBuilder, name, messageSegment, mapping });

/** Removes destinations (metaDataIds) when the field exists. */
export const destinationSetStep = (name, metaDataIds, field) =>
  ({ type: STEP.destinationSet, name, behavior: "REMOVE", metaDataIds: { int: metaDataIds.map(String) }, field, condition: "EXISTS" });

export const javascriptRule = (name, script, operator = "AND") => ({ type: RULE.javascript, name, script, operator });

/** Rule builder: `values` are JavaScript expressions ("'T'" for a text). */
export const ruleBuilder = (name, field, condition, values = [], operator = "AND") =>
  ({ type: RULE.builder, name, field, condition, values: values.length ? { string: values } : "", operator });
