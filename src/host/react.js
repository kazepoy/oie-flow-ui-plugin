// SPDX-License-Identifier: MPL-2.0
// The host's React. Web Admin hands it to plugins as platform.React; the plugin
// never bundles its own copy, so hooks and context work across the page.
// Every export reads the instance when called, so modules can import these
// helpers before register() has bound React.

/** @type {any} */
let React = null;

/** Called once by register(). */
export function bindReact(instance) {
  React = instance;
}

export const h = (type, props, ...children) => React.createElement(type, props, ...children);
export const Fragment = ({ children }) => children;

export const useState = initial => React.useState(initial);
export const useEffect = (effect, deps) => React.useEffect(effect, deps);
export const useLayoutEffect = (effect, deps) => React.useLayoutEffect(effect, deps);
export const useRef = initial => React.useRef(initial);
export const useMemo = (factory, deps) => React.useMemo(factory, deps);
export const useCallback = (callback, deps) => React.useCallback(callback, deps);
export const useId = () => React.useId();
