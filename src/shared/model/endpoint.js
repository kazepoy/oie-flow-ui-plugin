// SPDX-License-Identifier: MPL-2.0
// The address of a connector, read from its configuration, for both screens.

/** Where a connector listens or sends, without credentials or query string. */
export function endpointOf(connector) {
  const props = connector?.properties || {};
  const listener = props.listenerConnectorProperties;
  const host = listener?.host || props.remoteAddress || props.remoteHost || props.smtpHost
    || props.locationURI || props.url || props.host || props.directory || "";
  const port = listener?.port || props.remotePort || props.port || props.smtpPort;
  let text = String(host).replace(/(\/\/)[^/@\s]+@/, "$1").split(/[?#]/)[0];
  if (port && text && !/^\w+:\/\//.test(text)) text += `:${port}`;
  if (props.contextPath && props.contextPath !== "/") text += `/${String(props.contextPath).replace(/^\//, "")}`;
  return text === "none" ? "" : text;
}
