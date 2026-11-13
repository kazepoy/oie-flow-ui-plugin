// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelEditorPath, stepEditorPath } from "../../src/host/routes.js";
import { editorTargetQuery } from "../../src/host/editor.js";

test("editor URLs include query parameters when targeting tabs, destinations, scripts or steps", () => {
  assert.equal(channelEditorPath("ch 1"), "/channels/ch%201/edit");
  assert.equal(
    channelEditorPath("ch 1", { tab: "destinations", metaDataId: 3, script: undefined }),
    "/channels/ch%201/edit?tab=destinations&metaDataId=3"
  );
  assert.equal(stepEditorPath("ch-1", "transformer", 0), "/channels/ch-1/transformer/0");
  assert.equal(stepEditorPath("ch-1", "transformer", 0, 2), "/channels/ch-1/transformer/0?step=2");
  assert.equal(stepEditorPath("ch-1", "filter", 1, 0), "/channels/ch-1/filter/1?step=0");
});

test("editorTargetQuery maps channel flow targets to Web Admin editor parameters", () => {
  assert.deepEqual(editorTargetQuery({ section: "attachments" }), { tab: "summary" });
  assert.deepEqual(editorTargetQuery({ section: "connector", metaDataId: 0 }), { tab: "source" });
  assert.deepEqual(editorTargetQuery({ section: "connector", metaDataId: 3 }), { tab: "destinations", metaDataId: 3 });
  assert.deepEqual(editorTargetQuery({ section: "script", key: "deployScript" }), { tab: "scripts", script: "deployScript" });
  assert.deepEqual(
    editorTargetQuery({ section: "script", key: "postprocessingScript" }),
    { tab: "scripts", script: "postprocessingScript" }
  );
});
