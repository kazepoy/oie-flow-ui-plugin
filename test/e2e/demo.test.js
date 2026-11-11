// SPDX-License-Identifier: MPL-2.0
// End-to-end checks against the running demo (cd demo && docker compose up -d).
//   npm run test:e2e          (DEMO_URL and OIE_DEMO_PASSWORD override the defaults)
// Screenshots go to test/e2e/output/.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { DEMO_URL, openNav, signIn } from "./session.js";

const USER_PASSWORD = process.env.OIE_DEMO_USER_PASSWORD || "demo-flow-ui-user";
const OUTPUT = new URL("./output/", import.meta.url).pathname;
const LAB_RESULTS = "07516747-4e3e-4cee-80cf-6a9aaf05412e";
const LAB_ORDERS = "5a4aa0ff-b675-4e44-930a-2e23cffd6eb1";
const RAD_ORDERS = "00a5626d-4dc6-4d37-ad45-193566bc8691";

const url = path => new URL(path.replace(/^\//, ""), DEMO_URL).href;
const shot = (page, name) => page.screenshot({ path: `${OUTPUT}${name}.png` });
const pluginErrors = errors => errors.filter(error => !/401|404|Failed to load resource/.test(error));

before(() => mkdir(OUTPUT, { recursive: true }));

describe("as admin", () => {
  let session;
  before(async () => { session = await signIn({ viewport: { width: 1600, height: 1000 } }); });
  after(() => session.close());

  test("Flows Monitoring shows the groups, the first one open, with counters", async () => {
    const { page } = session;
    await openNav(page, "flow-ui-flows");
    await page.locator(".ofu-group").first().waitFor();
    const groups = await page.locator(".ofu-group__name").allInnerTexts();
    assert.deepEqual(groups.map(name => name.toLowerCase()), ["billing", "external partners", "laboratory", "operations", "patient administration", "pharmacy", "radiology", "simulators"]);
    assert.equal(await page.locator(".ofu-group__head[aria-expanded=true]").count(), 1);
    assert.match(await page.locator(".ofu-toolbar .ofu-totals").innerText(), /[1-9][\d,]*\s+received/);
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

  test("zoom follows the wheel, and the view is kept when coming back", async () => {
    const { page } = session;
    const level = () => page.locator(".ofu-zoom__level").innerText();
    assert.equal(await level(), "100%");
    const box = await page.locator(".ofu-flow__viewport").boundingBox();
    await page.mouse.move(box.x + 300, box.y + 200);
    await page.mouse.wheel(0, 100);
    await page.mouse.wheel(0, 100);
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

  test("a transformer opens its editor", async () => {
    const { page } = session;
    await page.getByRole("button", { name: /^Open Transformer · Source/ }).click();
    await page.waitForURL(/\/transformer\/0$/);
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
    await page.waitForURL(/\/transformer\/0$/);
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

  test("auditor sees the counters, which open nothing", async () => {
    const session = await signIn({ user: "auditor", password: USER_PASSWORD });
    try {
      const { page } = session;
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      assert.equal(await page.locator("button.ofu-counter").count(), 0);
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
