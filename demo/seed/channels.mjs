// SPDX-License-Identifier: MPL-2.0
// The demo: the integration platform of a hospital. This file is the source of
// the demo channels, groups, roles and users; tools/generate.mjs turns it into
// the files that build-dump.sh loads into OIE (see README.md).
//
// External systems are simulated by the channels of the "Simulators" group, so
// traffic stays inside the demo, except for destinations meant to fail.
import {
  channelReader, channelWriter, destinationSetStep, fileReader, fileWriter, httpListener, httpSender,
  javascriptReader, javascriptRule, javascriptStep, javascriptWriter, mapperStep, messageBuilderStep,
  queued, ruleBuilder, smtpSender, tcpListener, tcpSender
} from "./dsl.mjs";

/* Channel ids are fixed so that links between channels and roles stay stable. */
const ID = {
  simLis: "5e1fd032-c661-49f2-badb-56767c21ea3b",
  simRis: "47e24fec-779e-4d14-ad4e-61a40bf771f5",
  simEhr: "470a3eec-9e3b-4385-bf16-b8d354f5d060",
  simPharmacy: "a81535d0-838d-4352-8557-9d9b0fd2ece4",
  adtInbound: "6d1d3f7e-d707-4a17-9a35-f3af99961456",
  adtBroadcast: "8ec16e83-2f62-4278-9362-78518e5f1527",
  adtMerge: "8c6a8a72-f71f-4ade-a446-43af7a07a157",
  labOrders: "5a4aa0ff-b675-4e44-930a-2e23cffd6eb1",
  labResults: "07516747-4e3e-4cee-80cf-6a9aaf05412e",
  labCritical: "e46636e7-66aa-4d0c-9699-772cce29088e",
  radOrders: "00a5626d-4dc6-4d37-ad45-193566bc8691",
  radReports: "6bdd88af-b67e-4ddb-8635-5769d053caf3",
  pharmPrescriptions: "abbe5ca0-c796-4e1d-976f-b53e6ad91eeb",
  billCharges: "11f05b73-1769-4018-9419-02cbfe64bd58",
  billClaims: "8a212f36-06f2-483c-b48d-678a0fa682f4",
  hieApi: "703cfc96-a148-4fde-908d-1353330b5dde",
  gpLetters: "498c811a-a445-4c17-b17c-d6804db4808e",
  opsHeartbeat: "375b787f-7de8-460c-ae99-40303f2cd2d8",
  opsLegacy: "4e27f52a-5698-4f2f-b5cb-f525bf622b19"
};

const SIM_EHR = "http://localhost:7103";
const DATA = "/opt/engine/appdata/demo";

/** Deploy script that creates the folders a channel reads or writes. */
const createFolders = (...folders) => [
  "// Create the working folders of this channel.",
  ...folders.map(folder => `new java.io.File('${folder}').mkdirs();`),
  "return;"
].join("\n");

const PATIENT_ID = "msg['PID']['PID.3']['PID.3.1'].toString()";

/* ---------------------------------------------------------------- simulators */

/** A simulated external system: acknowledges and keeps the message. */
const simulator = (id, name, description, source) => ({
  id, name, description, source,
  destinations: [javascriptWriter("// The simulated system accepts the message.\nreturn;", { name: "Accept" })]
});

const simulators = [
  simulator(ID.simLis, "SIM · LIS", "Simulated laboratory information system (MLLP, port 7101).", tcpListener(7101)),
  simulator(ID.simRis, "SIM · RIS", "Simulated radiology information system (MLLP, port 7102).", tcpListener(7102)),
  simulator(ID.simEhr, "SIM · EHR", "Simulated electronic health record (HTTP, port 7103).",
    httpListener(7103, "/", { dataType: "RAW" })),
  simulator(ID.simPharmacy, "SIM · Pharmacy", "Simulated pharmacy system (MLLP, port 7104).", tcpListener(7104))
];

/* ---------------------------------------------------------------- patient administration */

const adtInbound = {
  id: ID.adtInbound,
  name: "ADT · HIS inbound",
  description: "Admissions, transfers and discharges from the hospital information system (MLLP, port 8181). Test messages are filtered out.",
  source: tcpListener(8181, {
    filter: [
      ruleBuilder("Has a patient identifier", PATIENT_ID, "EXISTS"),
      javascriptRule("Not a test message", "// MSH-11 = T marks a test message\nreturn msg['MSH']['MSH.11']['MSH.11.1'].toString() != 'T';")
    ],
    transformer: [
      mapperStep("Patient identifier", "patientId", PATIENT_ID),
      mapperStep("Event type", "eventType", "msg['MSH']['MSH.9']['MSH.9.2'].toString()"),
      javascriptStep("Upper-case family name", "var family = msg['PID']['PID.5']['PID.5.1'];\nfamily.setChildren(family.toString().toUpperCase());")
    ]
  }),
  destinations: [
    channelWriter(ID.adtBroadcast, { name: "Broadcast to departments" }),
    fileWriter(`${DATA}/archive/adt`, "${date.get('yyyyMMdd')}-${message.messageId}.hl7", { name: "Archive", waitForPrevious: false })
  ],
  scripts: { deploy: createFolders(`${DATA}/archive/adt`) },
  seed: [["adt-a01.hl7", 140], ["adt-a08.hl7", 60], ["adt-a01-test.hl7", 12]]
};

const adtBroadcast = {
  id: ID.adtBroadcast,
  name: "ADT · Broadcast to departments",
  description: "Sends every admission event to the departments. Called by ADT · HIS inbound.",
  source: channelReader({ dataType: "HL7V2" }),
  destinations: [
    tcpSender("localhost", 7101, { name: "Laboratory (LIS)" }),
    tcpSender("localhost", 7102, { name: "Radiology (RIS)", waitForPrevious: false }),
    tcpSender("localhost", 7104, { name: "Pharmacy", waitForPrevious: false }),
    httpSender(`${SIM_EHR}/ehr/adt`, { name: "Electronic health record", waitForPrevious: false, dataType: "HL7V2" }),
    tcpSender("pacs-old.hospital.example", 2575, { name: "Old PACS (decommissioned)", enabled: false }),
    fileWriter(`${DATA}/audit/adt`, "${date.get('yyyyMMdd')}.log", { name: "Audit trail", dataType: "HL7V2" }),
    javascriptWriter("// Updates the bed occupancy board.\nglobalMap.put('lastWard', $('ward'));\nreturn;", {
      name: "Bed management", waitForPrevious: false, dataType: "HL7V2",
      transformer: [mapperStep("Ward", "ward", "msg['PV1']['PV1.3']['PV1.3.1'].toString()", "CONNECTOR")]
    })
  ],
  scripts: { deploy: createFolders(`${DATA}/audit/adt`) }
};

const adtMerge = {
  id: ID.adtMerge,
  name: "ADT · Patient merge (A40)",
  description: "Merges duplicate patient records (MLLP, port 8182): the patient index first, then the health record.",
  source: tcpListener(8182, {
    transformer: [mapperStep("Surviving patient", "patientId", PATIENT_ID), mapperStep("Merged patient", "mergedId", "msg['MRG']['MRG.1']['MRG.1.1'].toString()")]
  }),
  destinations: [
    javascriptWriter("// Updates the master patient index.\nlogger.info('MPI merge ' + $('mergedId') + ' into ' + $('patientId'));\nreturn;", { name: "Update patient index", dataType: "HL7V2" }),
    httpSender(`${SIM_EHR}/ehr/merge`, { name: "Notify health record", dataType: "HL7V2" })
  ],
  seed: [["adt-a40.hl7", 18]]
};

/* ---------------------------------------------------------------- laboratory */

const labOrders = {
  id: ID.labOrders,
  name: "LAB · Orders to LIS (ORM)",
  description: "Laboratory orders from the wards to the laboratory system (MLLP, port 8183).",
  source: tcpListener(8183),
  destinations: [
    tcpSender("localhost", 7101, {
      name: "Laboratory (LIS)",
      response: [mapperStep("Acknowledgement code", "ackCode", "msg['MSA']['MSA.1']['MSA.1.1'].toString()")]
    })
  ],
  seed: [["orm-o01.hl7", 95]]
};

const labResults = {
  id: ID.labResults,
  name: "LAB · Results from LIS (ORU)",
  description: "Results from the laboratory (MLLP, port 8184): validated, stored, then sent to the clinician. Incomplete results fail validation.",
  source: tcpListener(8184, {
    transformer: [
      mapperStep("Patient identifier", "patientId", PATIENT_ID),
      mapperStep("Order number", "orderNumber", "msg['OBR']['OBR.3']['OBR.3.1'].toString()")
    ]
  }),
  destinations: [
    javascriptWriter("// The results passed validation (see the transformer).\nreturn;", {
      name: "Validate results",
      dataType: "HL7V2",
      transformer: [javascriptStep("Every observation has a value", [
        "var missing = [];",
        "for each (var obx in msg..OBX) {",
        "  if (obx['OBX.5']['OBX.5.1'].toString() == '') missing.push(obx['OBX.3']['OBX.3.2'].toString());",
        "}",
        "if (missing.length) throw 'Result without a value: ' + missing.join(', ');"
      ].join("\n"))]
    }),
    javascriptWriter("// Stores the results in the results database.\nreturn;", { name: "Store in results database", dataType: "HL7V2" }),
    httpSender(`${SIM_EHR}/ehr/results`, { name: "Notify clinician", dataType: "HL7V2" }),
    channelWriter(ID.labCritical, { name: "Critical values check", waitForPrevious: false, dataType: "HL7V2" })
  ],
  seed: [["oru-r01.hl7", 120], ["oru-r01-critical.hl7", 9], ["oru-r01-incomplete.hl7", 7]]
};

const labCritical = {
  id: ID.labCritical,
  name: "LAB · Critical values",
  description: "Pages the on-call biologist for critical results. Called by LAB · Results from LIS; most results are filtered out.",
  source: channelReader({
    dataType: "HL7V2",
    filter: [
      ruleBuilder("Is a result message", "msg['MSH']['MSH.9']['MSH.9.1'].toString()", "EQUALS", ["'ORU'"]),
      ruleBuilder("Has observations", "msg['OBX'].toString()", "EXISTS"),
      javascriptRule("Final results only", "return msg['OBR']['OBR.25']['OBR.25.1'].toString() == 'F';"),
      ruleBuilder("Has a value", "msg['OBX']['OBX.5']['OBX.5.1'].toString()", "EXISTS"),
      ruleBuilder("Ordering provider known", "msg['OBR']['OBR.16']['OBR.16.1'].toString()", "EXISTS"),
      javascriptRule("Not a test patient", "return " + PATIENT_ID + ".indexOf('TEST') != 0;"),
      javascriptRule("Laboratory in scope", "var codes = ['K', 'NA', 'GLU', 'HB', 'TROP'];\nreturn codes.indexOf(msg['OBX']['OBX.3']['OBX.3.1'].toString()) >= 0;"),
      javascriptRule("Not already paged", "var key = 'paged-' + msg['OBR']['OBR.3']['OBR.3.1'].toString();\nif (globalChannelMap.containsKey(key)) return false;\nglobalChannelMap.put(key, true);\nreturn true;"),
      javascriptRule("Critical flag (HH or LL)", "for each (var obx in msg..OBX) {\n  var flag = obx['OBX.8']['OBX.8.1'].toString();\n  if (flag == 'HH' || flag == 'LL') return true;\n}\nreturn false;")
    ]
  }),
  destinations: [
    httpSender(`${SIM_EHR}/alerts/pager`, { name: "Page on-call biologist", dataType: "HL7V2" }),
    fileWriter(`${DATA}/alerts`, "critical-${date.get('yyyyMMdd')}.log", { name: "Alert log", dataType: "HL7V2" })
  ],
  scripts: { deploy: createFolders(`${DATA}/alerts`) }
};

/* ---------------------------------------------------------------- radiology */

const radOrders = {
  id: ID.radOrders,
  name: "RAD · Orders to RIS",
  description: "Imaging orders (MLLP, port 8186), sent at the same time to the radiology system, the scheduler and the archive.",
  source: tcpListener(8186),
  destinations: [
    tcpSender("localhost", 7102, { name: "Radiology (RIS)" }),
    javascriptWriter("// Books a slot in the imaging schedule.\nreturn;", { name: "Imaging scheduler", waitForPrevious: false, dataType: "HL7V2" }),
    fileWriter(`${DATA}/archive/rad`, "${message.messageId}.hl7", { name: "Archive", waitForPrevious: false, dataType: "HL7V2" })
  ],
  scripts: { deploy: createFolders(`${DATA}/archive/rad`) },
  seed: [["rad-orm-o01.hl7", 64]]
};

const radReports = {
  id: ID.radReports,
  name: "RAD · Reports to EHR (MDM)",
  description: "Signed imaging reports (HTTP, port 8187, /reports). The report is kept as an attachment and sent to the health record.",
  source: httpListener(8187, "/reports", { dataType: "HL7V2" }),
  destinations: [httpSender(`${SIM_EHR}/ehr/documents`, { name: "Health record documents", dataType: "HL7V2" })],
  attachment: { type: "Entire Message", mimeType: "text/plain" },
  seed: [["mdm-t02.hl7", 41]]
};

/* ---------------------------------------------------------------- pharmacy */

const pharmPrescriptions = {
  id: ID.pharmPrescriptions,
  name: "PHARM · Prescriptions (RDE)",
  description: "Prescriptions to the pharmacy (MLLP, port 8188). Controlled drugs are not sent to the dispensing robot.",
  source: tcpListener(8188, {
    transformer: [
      mapperStep("Patient identifier", "patientId", PATIENT_ID),
      mapperStep("Order number", "orderNumber", "msg['ORC']['ORC.2']['ORC.2.1'].toString()"),
      mapperStep("Drug code", "drugCode", "msg['RXE']['RXE.2']['RXE.2.1'].toString()"),
      mapperStep("Drug name", "drugName", "msg['RXE']['RXE.2']['RXE.2.2'].toString()"),
      mapperStep("Dose", "dose", "msg['RXE']['RXE.3']['RXE.3.1'].toString()"),
      javascriptStep("Controlled substance", "var controlled = ['MORPH', 'OXY', 'FENT'];\nif (controlled.indexOf($('drugCode')) >= 0) channelMap.put('controlled', 'yes');"),
      messageBuilderStep("Sending application", "msg['MSH']['MSH.3']['MSH.3.1']", "'FLOW-UI-DEMO'"),
      messageBuilderStep("Receiving application", "msg['MSH']['MSH.5']['MSH.5.1']", "'PHARMACY'"),
      messageBuilderStep("Dose unit", "msg['RXE']['RXE.5']['RXE.5.1']", "msg['RXE']['RXE.5']['RXE.5.1'].toString().toUpperCase()"),
      javascriptStep("Dose in milligrams", "if (msg['RXE']['RXE.5']['RXE.5.1'].toString() == 'G') {\n  msg['RXE']['RXE.3']['RXE.3.1'] = String(Number($('dose')) * 1000);\n  msg['RXE']['RXE.5']['RXE.5.1'] = 'MG';\n}"),
      destinationSetStep("Controlled drugs skip the robot", [2], "$c('controlled')"),
      javascriptStep("Log prescription", "logger.info('Prescription ' + $('orderNumber') + ': ' + $('drugName'));")
    ]
  }),
  destinations: [
    tcpSender("localhost", 7104, { name: "Pharmacy system" }),
    javascriptWriter("// Prepares the doses in the dispensing robot.\nreturn;", { name: "Dispensing robot", waitForPrevious: false, dataType: "HL7V2" })
  ],
  seed: [["rde-o11.hl7", 75], ["rde-o11-controlled.hl7", 11]]
};

/* ---------------------------------------------------------------- billing */

const billCharges = {
  id: ID.billCharges,
  name: "BILL · Daily charges",
  description: "Charge files dropped by the wards (CSV, polled every minute), sent to billing then exported to accounting.",
  source: fileReader(`${DATA}/inbox/charges`, "*.csv", {
    dataType: "DELIMITED",
    properties: { pollConnectorProperties: { pollingFrequency: 60000 } }
  }),
  destinations: [
    javascriptWriter("// Posts the charges to the billing system.\nreturn;", { name: "Billing system", dataType: "DELIMITED" }),
    fileWriter(`${DATA}/export/accounting`, "charges-${date.get('yyyyMMdd')}.csv", { name: "Accounting export", dataType: "DELIMITED" })
  ],
  scripts: { deploy: createFolders(`${DATA}/inbox/charges`, `${DATA}/export/accounting`) },
  seed: [["charges.csv", 30]]
};

const billClaims = {
  id: ID.billClaims,
  name: "BILL · Claims to insurer",
  description: "Insurance claims (HTTP, port 8189, /claims). The insurer cannot be reached: claims wait in the queue.",
  source: httpListener(8189, "/claims", { dataType: "JSON" }),
  destinations: [
    httpSender("https://claims.insurer.invalid/api/claims", { name: "Insurer gateway", dataType: "JSON", properties: queued })
  ],
  seed: [["claim.json", 23]]
};

/* ---------------------------------------------------------------- external partners */

const hieApi = {
  id: ID.hieApi,
  name: "HIE · Regional exchange API",
  description: "Patient summary requests from the regional health information exchange (HTTP JSON, port 8190, /hie). The summary built by destination 2 is returned to the caller.",
  source: httpListener(8190, "/hie", {
    dataType: "JSON",
    properties: { sourceConnectorProperties: { responseVariable: "d2" }, responseContentType: "application/json" },
    transformer: [mapperStep("Requested patient", "patientId", "msg['patientId'].toString()")]
  }),
  destinations: [
    javascriptWriter("// Checks that the requester may read this patient.\nif (!$('patientId')) throw 'No patient identifier';\nreturn;", { name: "Check consent", dataType: "JSON" }),
    javascriptWriter("// Builds the patient summary returned to the caller.\nreturn JSON.stringify({ patientId: $('patientId'), allergies: [], encounters: 3 });",
      { name: "Build patient summary", dataType: "JSON" })
  ],
  scripts: { postprocessor: "// Counts the requests of the day.\nvar count = (globalChannelMap.get('requests') || 0) + 1;\nglobalChannelMap.put('requests', count);\nreturn;" },
  seed: [["hie-request.json", 52]]
};

const gpLetters = {
  id: ID.gpLetters,
  name: "GP · Discharge letters",
  description: "Discharge letters mailed to general practitioners. Paused while the mail server is replaced.",
  source: channelReader({ dataType: "RAW" }),
  destinations: [smtpSender("smtp.hospital.invalid", "${gpEmail}", "Discharge letter", { name: "Mail to GP", dataType: "RAW" })],
  state: "PAUSED",
  seed: [["discharge-letter.txt", 6]]
};

/* ---------------------------------------------------------------- operations */

const opsHeartbeat = {
  id: ID.opsHeartbeat,
  name: "OPS · Heartbeat",
  description: "Produces a heartbeat every minute for the supervision tool.",
  source: javascriptReader("// One heartbeat per poll.\nreturn '<heartbeat time=\"' + DateUtil.getCurrentDate('yyyy-MM-dd HH:mm:ss') + '\"/>';", 60, { dataType: "XML" }),
  destinations: [javascriptWriter("// Publishes the heartbeat to the supervision tool.\nreturn;", { name: "Supervision", dataType: "XML" })],
  scripts: {
    deploy: "// Remember when the heartbeat started.\nglobalMap.put('heartbeatSince', DateUtil.getCurrentDate('yyyy-MM-dd HH:mm'));\nreturn;",
    undeploy: "globalMap.remove('heartbeatSince');\nreturn;"
  }
};

const opsLegacy = {
  id: ID.opsLegacy,
  name: "OPS · Legacy interface",
  description: "Interface to the former admission system (MLLP, port 8191). Stopped: the system has been switched off.",
  source: tcpListener(8191),
  destinations: [tcpSender("legacy-his.hospital.invalid", 2575, { name: "Former admission system" })],
  state: "STOPPED",
  seed: [["adt-a01.hl7", 15]]
};

/* ---------------------------------------------------------------- groups, roles, users */

export const GROUPS = [
  { name: "Patient Administration", description: "Admissions, transfers, discharges and patient identity.", channels: [adtInbound, adtBroadcast, adtMerge] },
  { name: "Laboratory", description: "Laboratory orders and results.", channels: [labOrders, labResults, labCritical] },
  { name: "Radiology", description: "Imaging orders and reports.", channels: [radOrders, radReports] },
  { name: "Pharmacy", description: "Prescriptions and dispensing.", channels: [pharmPrescriptions] },
  { name: "Billing", description: "Charges and insurance claims.", channels: [billCharges, billClaims] },
  { name: "External Partners", description: "Exchanges with organisations outside the hospital.", channels: [hieApi, gpLetters] },
  { name: "Operations", description: "Supervision and legacy interfaces.", channels: [opsHeartbeat, opsLegacy] },
  { name: "Simulators", description: "Simulated external systems used by the demo.", channels: simulators }
];

const [simLis, simRis, simEhr, simPharmacy] = simulators;

export const TAGS = [
  {
    name: "HL7v2",
    color: { red: 37, green: 99, blue: 235 },
    channels: [adtInbound, adtBroadcast, adtMerge, labOrders, labResults, labCritical, radOrders, radReports, pharmPrescriptions, opsLegacy, simLis, simRis, simPharmacy]
  },
  {
    name: "JSON",
    color: { red: 2, green: 132, blue: 199 },
    channels: [billClaims, hieApi]
  },
  {
    name: "CSV",
    color: { red: 217, green: 119, blue: 6 },
    channels: [billCharges]
  },
  {
    name: "MLLP",
    color: { red: 79, green: 70, blue: 229 },
    channels: [adtInbound, adtMerge, labOrders, labResults, radOrders, pharmPrescriptions, opsLegacy, simLis, simRis, simPharmacy]
  },
  {
    name: "HTTP",
    color: { red: 8, green: 145, blue: 178 },
    channels: [radReports, billClaims, hieApi, simEhr]
  },
  {
    name: "critical",
    color: { red: 190, green: 24, blue: 93 },
    channels: [adtInbound, labCritical, pharmPrescriptions]
  },
  {
    name: "simulator",
    color: { red: 71, green: 85, blue: 105 },
    channels: simulators
  },
  {
    name: "legacy",
    color: { red: 180, green: 83, blue: 9 },
    channels: [opsLegacy]
  }
];

/** RBAC roles. `groups` restricts the role to the channels of those groups (RB-06). */
export const ROLES = [
  {
    name: "Laboratory viewer",
    description: "Monitors the laboratory channels and reads their messages.",
    permissions: ["viewDashboard", "viewMessages", "viewChannelGroups"],
    groups: ["Laboratory"]
  },
  {
    name: "Operations",
    description: "Monitors every channel, reads messages, starts and stops channels.",
    permissions: ["viewDashboard", "viewMessages", "viewChannels", "viewChannelGroups", "viewTags", "startStopChannels", "viewEvents", "viewAlerts"]
  },
  {
    name: "Integrator",
    description: "Designs and deploys channels.",
    permissions: ["viewDashboard", "viewMessages", "viewChannels", "viewChannelGroups", "viewTags", "manageChannels", "deployUndeployChannels",
      "startStopChannels", "viewCodeTemplates", "viewGlobalScripts", "viewEvents"]
  },
  {
    name: "Auditor",
    description: "Sees the activity of the channels, not the messages.",
    permissions: ["viewDashboard", "viewChannelGroups"]
  }
];

export const USERS = [
  { username: "lab-viewer", firstName: "Laura", lastName: "Viewer", role: "Laboratory viewer" },
  { username: "ops", firstName: "Oscar", lastName: "Operator", role: "Operations" },
  { username: "integrator", firstName: "Iris", lastName: "Integrator", role: "Integrator" },
  { username: "auditor", firstName: "Aldo", lastName: "Auditor", role: "Auditor" }
];

/** Simulators are deployed first, so the other channels can reach them. */
export const DEPLOY_ORDER = [...simulators, ...GROUPS.slice(0, -1).flatMap(group => group.channels)];
