// SPDX-License-Identifier: MPL-2.0
// Small channel configurations, shaped like the engine's JSON, for the tests.

const JS_STEP = "com.mirth.connect.plugins.javascriptstep.JavaScriptStep";
const JS_RULE = "com.mirth.connect.plugins.javascriptrule.JavaScriptRule";

export const elementLabel = (section, type) => type === JS_RULE ? "JavaScript" : type === JS_STEP ? "JavaScript" : type.split(".").pop();

const transformer = (input, output, steps = []) => ({
  inboundDataType: input,
  outboundDataType: output,
  elements: steps.length ? { [JS_STEP]: steps.map((name, index) => ({ name, enabled: true, sequenceNumber: String(index) })) } : null
});

/**
 * @param {number} metaDataId
 * @param {{ enabled?: boolean, waitForPrevious?: boolean, name?: string, steps?: string[] }} [options]
 */
export function destination(metaDataId, { enabled = true, waitForPrevious = true, name, steps = [] } = {}) {
  return {
    metaDataId,
    name: name ?? `Destination ${metaDataId}`,
    enabled,
    waitForPrevious,
    transportName: "TCP Sender",
    properties: { remoteAddress: "lis.example", remotePort: "6661" },
    filter: { elements: null },
    transformer: transformer("HL7V2", "HL7V2", steps),
    responseTransformer: transformer("HL7V2", "HL7V2")
  };
}

/**
 * @param {any[]} destinations
 * @param {{ polled?: boolean, response?: string, sourceSteps?: string[], rules?: string[] }} [options]
 */
export function channel(destinations, { polled = false, response = "None", sourceSteps = [], rules = [] } = {}) {
  return {
    id: "c1",
    name: "Test channel",
    sourceConnector: {
      metaDataId: 0,
      name: "sourceConnector",
      transportName: polled ? "File Reader" : "TCP Listener",
      enabled: true,
      properties: {
        ...(polled ? { pollConnectorProperties: {}, host: "/inbox" } : { listenerConnectorProperties: { host: "0.0.0.0", port: "6661" } }),
        sourceConnectorProperties: { responseVariable: response, respondAfterProcessing: true }
      },
      filter: { elements: rules.length ? { [JS_RULE]: rules.map((name, index) => ({ name, enabled: true, sequenceNumber: String(index) })) } : null },
      transformer: transformer("HL7V2", "XML", sourceSteps)
    },
    destinationConnectors: { connector: destinations },
    preprocessingScript: "return message;",
    postprocessingScript: "logger.info('done');\nreturn;",
    deployScript: "// default\nreturn;",
    undeployScript: "",
    properties: { attachmentProperties: { type: "None" } }
  };
}
