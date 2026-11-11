// SPDX-License-Identifier: MPL-2.0
// Loads Web Admin's definitions, so generated channels have exactly the default
// properties the web administrator gives a new connector, data type or step.
// Run with: node --import ./tools/webadmin/register.mjs (see generate.mjs).

// Web Admin modules touch the DOM when imported (never when computing defaults):
// a do-nothing object answers every such access.
const anything = () => new Proxy(function () {}, {
  get: (target, key) => key === Symbol.toPrimitive ? () => "" : key === "then" ? undefined : anything(),
  apply: () => anything(),
  construct: () => anything()
});
const storage = { getItem: () => null, setItem() {}, removeItem() {} };
Object.assign(globalThis, {
  window: globalThis, document: anything(), localStorage: storage, sessionStorage: storage,
  HTMLElement: class {}, MutationObserver: class { observe() {} disconnect() {} }
});

const PLUGINS = [
  "connector-tcp", "connector-http", "connector-file", "connector-vm", "connector-javascript", "connector-smtp",
  "datatype-hl7v2", "datatype-json", "datatype-xml", "datatype-raw", "datatype-delimited",
  "transformer-steps"
];

export async function loadWebAdmin(warDir) {
  const { platform, registered } = await import("./stubs.mjs");
  for (const plugin of PLUGINS) {
    const module = await import(`${warDir}/plugins/${plugin}/web/plugin.js`);
    await module.register(platform);
  }
  const oie = await import(`${warDir}/core/oie.js`);
  return { ...registered, oie };
}
