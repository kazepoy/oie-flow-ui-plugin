// SPDX-License-Identifier: MPL-2.0
// Stand-in for @oie/web-shell: a platform that records what Web Admin's plugins
// register (connector panels, data types, steps, rules) and ignores the rest.
export const registered = {
  connectors: new Map(),
  dataTypes: new Map(),
  steps: new Map(),
  rules: new Map()
};

const recorder = {
  React: null,
  registerConnectorPanel(transport, mode, definition) { registered.connectors.set(`${mode}:${transport}`, definition); },
  registerDataType(name, definition) { registered.dataTypes.set(name, definition); },
  registerStepType(type, definition) { registered.steps.set(type, definition); },
  registerRuleType(type, definition) { registered.rules.set(type, definition); }
};

export const platform = new Proxy(recorder, {
  get: (target, key) => key in target ? target[key] : () => undefined
});
