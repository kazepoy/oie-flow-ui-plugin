// SPDX-License-Identifier: MPL-2.0
// Builds the OIE extension:
//   dist/flow-ui/                          the extension folder (also used by the demo image)
//     plugin.xml, LICENSE
//     webadmin/plugin.json
//     webadmin/web/plugin.js               src/ bundled into one module
//   dist/flow-ui-<version>.zip             the same folder, installable in OIE
//
// Web Admin imports a WAR plugin entry from a blob: URL, so relative imports cannot
// work there: everything is bundled, except the @oie/* packages of the page import map.
import { build } from "esbuild";
import { mkdir, readFile, readdir, rm, writeFile, copyFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { zip } from "./tools/zip.mjs";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const version = process.env.FLOW_UI_VERSION || pkg.version;
const out = "dist/flow-ui";

await rm("dist", { recursive: true, force: true });
await mkdir(`${out}/webadmin/web`, { recursive: true });

await build({
  entryPoints: ["src/index.js"],
  outfile: `${out}/webadmin/web/plugin.js`,
  bundle: true,
  format: "esm",
  target: "es2022",
  charset: "utf8",
  external: ["@oie/*"],
  // CSS files are injected by the plugin itself (src/host/styles.js).
  loader: { ".css": "text" },
  // JSX uses the host's React through src/host/react.js.
  jsx: "transform",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  inject: ["src/host/jsx-runtime.js"],
  define: { __FLOW_UI_VERSION__: JSON.stringify(version) },
  banner: { js: `// OIE Flow UI ${version} · MPL-2.0 · generated from src/ by build.mjs: do not edit` },
  legalComments: "none",
  minify: false,
  logLevel: "info"
});

const fill = text => text.replaceAll("${version}", version);
await writeFile(`${out}/plugin.xml`, fill(await readFile("extension/plugin.xml", "utf8")));
await writeFile(`${out}/webadmin/plugin.json`, fill(await readFile("extension/plugin.json", "utf8")));
await copyFile("LICENSE", `${out}/LICENSE`);

async function filesOf(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry =>
    entry.isDirectory() ? filesOf(join(dir, entry.name)) : [join(dir, entry.name)]));
  return nested.flat();
}
const files = await Promise.all((await filesOf(out)).sort().map(async path => ({
  name: relative("dist", path).split("\\").join("/"),
  data: await readFile(path)
})));
await writeFile(`dist/flow-ui-${version}.zip`, zip(files));
console.log(`dist/flow-ui-${version}.zip (${files.length} files)`);
