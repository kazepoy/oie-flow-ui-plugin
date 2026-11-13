// SPDX-License-Identifier: MPL-2.0
// End-to-end checks against the running demo (cd demo && docker compose up -d).
//   npm run test:e2e          (DEMO_URL and OIE_DEMO_PASSWORD override the defaults)
// Screenshots go to test/e2e/output/.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { DEMO_URL, openNav, signIn } from "./session.js";

const USER_PASSWORD = process.env.OIE_DEMO_USER_PASSWORD || "demo-oie-password";
const OUTPUT = new URL("./output/", import.meta.url).pathname;
const LAB_RESULTS = "07516747-4e3e-4cee-80cf-6a9aaf05412e";
const LAB_ORDERS = "5a4aa0ff-b675-4e44-930a-2e23cffd6eb1";
const RAD_ORDERS = "00a5626d-4dc6-4d37-ad45-193566bc8691";
const OPS_HEARTBEAT = "375b787f-7de8-460c-ae99-40303f2cd2d8";
const BILL_CLAIMS = "8a212f36-06f2-483c-b48d-678a0fa682f4";

const url = path => new URL(path.replace(/^\//, ""), DEMO_URL).href;
const shot = (page, name) => page.screenshot({ path: `${OUTPUT}${name}.png` });
const pluginErrors = errors => errors.filter(error => !/401|404|Failed to load resource/.test(error));

before(() => mkdir(OUTPUT, { recursive: true }));

describe("as admin", () => {
  let session;
  before(async () => { session = await signIn({ viewport: { width: 1600, height: 1000 } }); });
  after(() => session.close());

  test("Flows Monitoring shows all groups open, details off by default, with counters", async () => {
    const { page } = session;
    await openNav(page, "flow-ui-flows");
    await page.locator(".ofu-group").first().waitFor();
    const groups = await page.locator(".ofu-group__name").allInnerTexts();
    assert.deepEqual(groups.map(name => name.toLowerCase()), ["billing", "external partners", "laboratory", "operations", "patient administration", "pharmacy", "radiology", "simulators"]);
    assert.equal(await page.locator(".ofu-group__head[aria-expanded=true]").count(), groups.length);
    assert.match(await page.locator(".ofu-toolbar .ofu-totals").innerText(), /[1-9][\d,]*\s+received/);
    assert.equal(await page.locator(".ofu-detail").count(), 0, "connector details hidden by default");
    await page.getByLabel("Details").check();
    assert.match(await page.locator(".ofu-detail").first().innerText(), /HTTP Listener|TCP Listener|File Reader/, "connector details shown");
    await page.getByLabel("Details").uncheck();
    await shot(page, "e2e-flows");
  });

  test("a counter opens Messages on its connector", async () => {
    const { page } = session;
    await page.getByRole("button", { name: "Open all groups" }).click();
    await page.locator(`#ofu-lane-${LAB_RESULTS}`).locator(".ofu-card--destination").first()
      .locator(".ofu-counter").first().click();
    await page.waitForURL(/\/messages\//);
    assert.match(page.url(), new RegExp(`/messages/${LAB_RESULTS}\\?metaDataId=1`));
    // Messages applies the connector as an advanced filter (WA-15).
    await page.getByText(/Connectors: Validate results/).waitFor();
  });

  test("Links show which channel calls which", async () => {
    const { page } = session;
    await openNav(page, "flow-ui-flows");
    await page.locator(".ofu-group").first().waitFor();
    await page.getByRole("button", { name: "Open all groups" }).click();
    await page.getByRole("button", { name: "Called by LAB · Results from LIS (ORU)" }).click();
    await page.locator(`#ofu-lane-${LAB_RESULTS}.ofu-lane--highlighted`).waitFor();
  });

  test("Channel Flow picks a readable view for each channel's shape", async () => {
    const { page } = session;
    await page.evaluate(() => sessionStorage.clear());
    for (const [id, layout] of [[LAB_ORDERS, "line"], [RAD_ORDERS, "columns"], [LAB_RESULTS, "bands"]]) {
      await page.goto(url(`channel-flow/${id}`));
      await page.locator(".ofu-block").first().waitFor();
      const auto = await page.getByRole("button", { name: "Auto", exact: true }).getAttribute("title");
      assert.match(auto, new RegExp(`now: ${layout}`, "i"));
    }
    assert.equal(await page.locator(".ofu-band").count(), 3);
    await shot(page, "e2e-channel-flow-bands");
  });

  test("the wheel moves, Ctrl + wheel zooms, and the view is kept when coming back", async () => {
    const { page } = session;
    const level = () => page.locator(".ofu-zoom__level").innerText();
    assert.equal(await level(), "100%");
    const box = await page.locator(".ofu-flow__viewport").boundingBox();
    await page.mouse.move(box.x + 300, box.y + 200);
    const stage = page.locator(".ofu-flow__stage");
    const before = await stage.evaluate(element => element.style.transform);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(300);
    assert.equal(await level(), "100%", "the wheel alone does not zoom");
    assert.notEqual(await stage.evaluate(element => element.style.transform), before, "the wheel moves the diagram");
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 100);
    await page.mouse.wheel(0, 100);
    await page.keyboard.up("Control");
    await page.waitForTimeout(300);
    const zoomed = await level();
    assert.notEqual(zoomed, "100%");
    await openNav(page, "flow-ui-flows");
    await page.locator(".ofu-group").first().waitFor();
    await page.goBack();
    await page.locator(".ofu-block").first().waitFor();
    assert.equal(await level(), zoomed);
    await page.locator(".ofu-flow__viewport").focus();
    await page.keyboard.press("1");
    await page.waitForTimeout(300);
    assert.equal(await level(), "100%");
  });

  test("the minimap appears on large diagrams, moves the view and hides on Fit", async () => {
    const { page } = session;
    const minimap = page.locator(".ofu-minimap");
    const canvas = page.locator(".ofu-minimap__canvas");
    await canvas.waitFor({ state: "visible" });
    const stage = page.locator(".ofu-flow__stage");
    const before = await stage.evaluate(element => element.style.transform);
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.85);
    await page.waitForTimeout(100);
    assert.notEqual(await stage.evaluate(element => element.style.transform), before);
    await page.getByRole("button", { name: "Hide minimap" }).click();
    assert.equal(await minimap.count(), 0);
    await page.getByRole("button", { name: "Channel Flow settings" }).click();
    await page.getByLabel("Minimap").selectOption("auto");
    await page.keyboard.press("Escape");
    await canvas.waitFor({ state: "visible" });
    await page.locator(".ofu-flow__viewport").focus();
    await page.keyboard.press("0");
    await page.waitForTimeout(300);
    assert.equal(await minimap.isVisible(), false);
    await page.keyboard.press("1");
    await page.waitForTimeout(300);
    assert.equal(await minimap.isVisible(), true);
  });

  test("a transformer opens its editor", async () => {
    const { page } = session;
    await page.getByRole("button", { name: /^Open Transformer · Source/ }).click();
    await page.waitForURL(/\/transformer\/0$/);
  });

  test("a click reaches the step, the script or the destination in the editor", async () => {
    const { page } = session;
    const selectedTab = () => page.locator('[role="tablist"][aria-label="Channel sections"] [role="tab"][aria-selected="true"]').innerText();
    const openFlow = async () => {
      await page.goto(url(`channel-flow/${LAB_RESULTS}`));
      await page.locator(".ofu-block").first().waitFor();
    };
    // Second step of the source transformer: the URL selects step 1 directly.
    await openFlow();
    await page.locator(".ofu-chip[title='Order number']").click();
    await page.waitForURL(/\/transformer\/0\?step=1$/);
    await page.locator('tr[data-path="1"].selected').waitFor();
    for (const [name, key] of [["Postprocessor", "postprocessingScript"], ["Deploy", "deployScript"], ["Undeploy", "undeployScript"]]) {
      await openFlow();
      await page.getByRole("button", { name: new RegExp(`^Open ${name} ·`) }).click();
      await page.waitForURL(new RegExp(`/edit\\?tab=scripts&script=${key}$`));
      await page.waitForFunction(value => document.querySelector('[role="tabpanel"] select')?.value === value, key);
      assert.equal(await selectedTab(), "Scripts");
    }
    await openFlow();
    await page.getByRole("button", { name: /^Open Connector · Destination 3 ·/ }).click();
    await page.waitForURL(/\/edit\?tab=destinations&metaDataId=3$/);
    await page.locator(".dest-grid tbody tr.selected td.num", { hasText: "3" }).waitFor();
    assert.equal(await selectedTab(), "Destinations");
    // From the editor's own Flow tab, the URL updates while keeping the draft.
    await page.getByRole("tab", { name: "Flow" }).click();
    await page.locator(".ofu-block").first().waitFor();
    await page.getByRole("button", { name: /^Open Postprocessor ·/ }).click();
    await page.waitForURL(/\/edit\?tab=scripts&script=postprocessingScript$/);
    await page.waitForFunction(() => document.querySelector('[role="tabpanel"] select')?.value === "postprocessingScript");
    assert.equal(await selectedTab(), "Scripts");
    await shot(page, "e2e-open-postprocessor");
    assert.deepEqual(pluginErrors(session.errors), []);
  });

  test("the channel editor has a Flow tab, where + adds a step", async () => {
    const { page } = session;
    await page.goto(url(`channels/${LAB_ORDERS}/edit`));
    await page.getByRole("tab", { name: "Flow" }).click();
    await page.locator(".ofu-block").first().waitFor();
    assert.ok(await page.locator(".ofu-tile__add").count() > 0);
    await shot(page, "e2e-flow-tab");
    await page.getByRole("button", { name: /^Add to Transformer · Source/ }).click();
    await page.getByRole("menuitem", { name: "JavaScript" }).click();
    await page.waitForURL(/\/transformer\/0\?step=\d+$/);
    assert.deepEqual(pluginErrors(session.errors), []);
  });
});

describe("with RBAC roles", () => {
  test("lab-viewer sees the laboratory only, and no Channel Flow", async () => {
    const session = await signIn({ user: "lab-viewer", password: USER_PASSWORD });
    try {
      const { page } = session;
      assert.equal(await page.locator('[data-nav-item="flow-ui-channel-flow"]').count(), 0);
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      assert.deepEqual((await page.locator(".ofu-group__name").allInnerTexts()).map(name => name.toLowerCase()), ["laboratory"]);
      assert.equal(await page.getByRole("button", { name: "Edit", exact: true }).count(), 0);
      assert.equal(await page.getByText("Chains hidden").count(), 1, "chains are unknown without viewChannels");
      assert.ok(await page.locator("button.ofu-counter").count() > 0, "counters open messages");
      await shot(page, "e2e-lab-viewer");
    } finally {
      await session.close();
    }
  });

  test("ops pauses, resumes, stops and starts a channel from Flows Monitoring", async () => {
    const session = await signIn({ user: "ops", password: USER_PASSWORD });
    try {
      const { page } = session;
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      await page.getByRole("button", { name: "Open all groups" }).click();
      const row = page.locator(`#ofu-lane-${OPS_HEARTBEAT}`);
      const state = () => row.locator(".ofu-channel__row .ofu-muted").innerText();
      await row.getByRole("button", { name: /^Pause OPS · Heartbeat/ }).click();
      await row.getByRole("button", { name: "Resume OPS · Heartbeat", exact: true }).waitFor();
      assert.equal(await state(), "paused");
      await row.getByRole("button", { name: "Resume OPS · Heartbeat", exact: true }).click();
      await row.getByRole("button", { name: "Stop OPS · Heartbeat", exact: true }).click();
      await page.getByRole("button", { name: "Stop", exact: true }).click();  // Web Admin's confirmation
      await row.getByRole("button", { name: "Start OPS · Heartbeat", exact: true }).waitFor();
      assert.equal(await state(), "stopped");
      await row.getByRole("button", { name: "Start OPS · Heartbeat", exact: true }).click();
      await row.getByRole("button", { name: "Stop OPS · Heartbeat", exact: true }).waitFor();
      assert.equal(await state(), "started");
    } finally {
      await session.close();
    }
  });

  test("ops stops and starts connectors; a destination without queue has no stop button", async () => {
    const session = await signIn({ user: "ops", password: USER_PASSWORD });
    try {
      const { page } = session;
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      await page.getByRole("button", { name: "Open all groups" }).click();
      const claims = page.locator(`#ofu-lane-${BILL_CLAIMS}`);
      // A destination with a queue
      await claims.getByRole("button", { name: "Stop BILL · Claims to insurer · Insurer gateway", exact: true }).click();
      await page.getByRole("button", { name: "Stop", exact: true }).click();
      await claims.getByRole("button", { name: "Start BILL · Claims to insurer · Insurer gateway", exact: true }).click();
      await claims.getByRole("button", { name: "Stop BILL · Claims to insurer · Insurer gateway", exact: true }).waitFor();
      // The source: stopping it pauses the channel, and it can be started again
      await claims.getByRole("button", { name: "Stop BILL · Claims to insurer · Source", exact: true }).click();
      await page.getByRole("button", { name: "Stop", exact: true }).click();
      await claims.getByRole("button", { name: "Start BILL · Claims to insurer · Source", exact: true }).click();
      await claims.getByRole("button", { name: "Stop BILL · Claims to insurer · Source", exact: true }).waitFor();
      // A destination without queue: no stop button (OIE-12)
      const orders = page.locator(`#ofu-lane-${LAB_ORDERS}`);
      assert.equal(await orders.locator(".ofu-card--destination .ofu-control").count(), 0);
      assert.equal(await orders.locator(".ofu-card--source .ofu-control").count(), 1);
    } finally {
      await session.close();
    }
  });

  test("auditor sees the counters, which open nothing", async () => {
    const session = await signIn({ user: "auditor", password: USER_PASSWORD });
    try {
      const { page } = session;
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      assert.equal(await page.locator("button.ofu-counter").count(), 0);
      assert.equal(await page.locator(".ofu-control").count(), 0, "no start or stop without startStopChannels");
      assert.ok(await page.locator("span.ofu-counter").count() > 0);
    } finally {
      await session.close();
    }
  });

  test("integrator can edit, and sees Channel Flow", async () => {
    const session = await signIn({ user: "integrator", password: USER_PASSWORD });
    try {
      const { page } = session;
      await openNav(page, "flow-ui-channel-flow");
      await page.locator(".ofu-picker__group").first().waitFor();
      await page.getByRole("button", { name: "LAB · Results from LIS (ORU)" }).click();
      await page.getByRole("button", { name: "Edit channel" }).waitFor();
    } finally {
      await session.close();
    }
  });
});
