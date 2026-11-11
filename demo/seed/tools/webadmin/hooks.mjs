// SPDX-License-Identifier: MPL-2.0
// Node module hooks that let the generator import Web Admin's own modules
// (connectors, data types, steps) from an extracted WAR, as the browser would
// through its import map. WEBADMIN_DIR points at the extracted WAR.
import { pathToFileURL } from "node:url";

const WAR = process.env.WEBADMIN_DIR;
const here = name => new URL(name, import.meta.url).href;

export function resolve(specifier, context, next) {
  if (specifier === "@oie/web-shell") return { url: here("stubs.mjs"), shortCircuit: true };
  if (specifier === "@oie/web-ui") return { url: pathToFileURL(`${WAR}/core/pkg-ui.js`).href, shortCircuit: true };
  if (specifier === "@oie/web-api") return { url: pathToFileURL(`${WAR}/core/pkg-api.js`).href, shortCircuit: true };
  if (specifier === "js-beautify") return { url: here("empty.mjs"), shortCircuit: true };
  // Absolute paths of the page ("/core/oie.js") are files of the WAR.
  if (/^\/(core|connectors|plugins|vendor)\//.test(specifier)) {
    return { url: pathToFileURL(WAR + specifier).href, shortCircuit: true };
  }
  return next(specifier, context);
}
