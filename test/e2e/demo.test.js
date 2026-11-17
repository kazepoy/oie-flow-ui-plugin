// SPDX-License-Identifier: MPL-2.0
// End-to-end checks against the running demo (cd demo && docker compose up -d).
//   npm run test:e2e          (DEMO_URL and OIE_DEMO_PASSWORD override the defaults)
// Screenshots go to test/e2e/output/.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { DEMO_URL, launchBrowser, openNav, signIn } from "./session.js";

const USER_PASSWORD = process.env.OIE_DEMO_USER_PASSWORD || "admin";
const OUTPUT = new URL("./output/", import.meta.url).pathname;
const LAB_RESULTS = "07516747-4e3e-4cee-80cf-6a9aaf05412e";
const LAB_ORDERS = "5a4aa0ff-b675-4e44-930a-2e23cffd6eb1";
const RAD_ORDERS = "00a5626d-4dc6-4d37-ad45-193566bc8691";
const OPS_HEARTBEAT = "375b787f-7de8-460c-ae99-40303f2cd2d8";
const BILL_CLAIMS = "8a212f36-06f2-483c-b48d-678a0fa682f4";

const url = path => new URL(path.replace(/^\//, ""), DEMO_URL).href;
const shot = (page, name) => page.screenshot({ path: `${OUTPUT}${name}.png` });
const pluginErrors = errors => errors.filter(error => !/401|404|Failed to load resource/.test(error));

let browser;
before(async () => {
  await mkdir(OUTPUT, { recursive: true });
  browser = await launchBrowser();
});
after(() => browser?.close());

describe("as admin", () => {
  let session;
  before(async () => { session = await signIn({ instance: browser, viewport: { width: 1600, height: 1000 } }); });
  after(() => session.close());

  test("Flows Monitoring shows all groups open, details off by default, with counters", async () => {
    const { page } = session;
    await openNav(page, "flow-ui-flows");
    await page.locator(".ofu-group").first().waitFor();
    const groups = await page.locator(".ofu-group__name").allInnerTexts();
    assert.deepEqual(groups.map(name => name.toLowerCase()), ["billing & partners", "laboratory", "operations & simulators", "patient care"]);
    assert.equal(await page.locator(".ofu-group__head[aria-expanded=true]").count(), groups.length);
    assert.match(await page.locator(".ofu-toolbar .ofu-totals").innerText(), /[1-9][\d,]*\s+received/);
    assert.equal(await page.locator(".ofu-detail").count(), 0, "connector details hidden by default");
    await page.getByLabel("Details").check();
    assert.match(await page.locator(".ofu-detail").first().innerText(), /HTTP Listener|TCP Listener|File Reader/, "connector details shown");
    await page.getByLabel("Details").uncheck();
    await shot(page, "e2e-flows");
  });

  test("a counter opens Messages on its connector and status", async () => {
    const { page } = session;
    await page.getByRole("button", { name: "Open all groups" }).click();
    await page.locator(`#ofu-lane-${LAB_RESULTS}`).locator(".ofu-card--destination").first()
      .locator(".ofu-counter").first().click();
    await page.waitForURL(/\/messages\//);
    assert.match(page.url(), new RegExp(`/messages/${LAB_RESULTS}\\?metaDataId=1&status=SENT`));
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

  test("Links map draws framed groups and arrows, toggles all channels, and highlights a chain", async () => {
    const { page } = session;
    await openNav(page, "flow-ui-flows");
    await page.getByRole("button", { name: "Links map", exact: true }).click();
    await page.locator(".ofu-links-group").first().waitFor();
    const linkedGroups = await page.locator(".ofu-links-group__name").allInnerTexts();
    assert.deepEqual(linkedGroups.map(name => name.toLowerCase()), ["laboratory", "patient care", "billing & partners"]);
    assert.equal(await page.locator(".ofu-links-node").count(), 6);
    assert.equal(await page.locator(".ofu-links-edge").count(), 6);
    assert.equal(await page.locator(".ofu-links-edge--back").count(), 1);

    await page.getByLabel("Linked only").uncheck();
    const allGroups = await page.locator(".ofu-links-group__name").allInnerTexts();
    assert.equal(allGroups.length, 4);
    assert.equal(await page.locator(".ofu-links-node").count(), 12);

    await page.getByLabel("Linked only").check();
    assert.equal(await page.locator(".ofu-links-node").count(), 6);

    // Clicking the card focuses its upstream + downstream causal chain without panning away.
    const labCritical = page.locator(".ofu-links-node", { hasText: "LAB · Critical values" });
    await labCritical.click({ position: { x: 296, y: 60 } });
    assert.equal(await page.locator(".ofu-links-node--selected").count(), 1);
    assert.equal(await page.locator(".ofu-links-node--focused").count(), 4);
    assert.equal(await page.locator(".ofu-links-node--dimmed").count(), 2);

    await page.getByLabel("Details").check();
    assert.match(await labCritical.locator(".ofu-detail").innerText(), /Channel Reader/);
    await page.getByLabel("Details").uncheck();

    await page.getByRole("button", { name: "Links map settings" }).click();
    await page.locator("#ofu-setting-minimap").waitFor();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Show in Rows" }).click();
    await page.locator(".ofu-lane--highlighted").waitFor();
    await page.getByRole("button", { name: "Links map", exact: true }).click();
    await page.locator(".ofu-links-group").first().waitFor();

    await labCritical.locator(".ofu-links-node__focus").click();
    await page.getByRole("button", { name: "Clear focus" }).click();
    assert.equal(await page.locator(".ofu-links-node--dimmed").count(), 0);

    await page.getByRole("button", { name: "Zoom in (+)" }).click();
    await page.waitForFunction(() => document.querySelector(".ofu-zoom__level")?.textContent !== "100%");
    await page.getByRole("button", { name: "100%", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".ofu-zoom__level")?.textContent === "100%");

    await shot(page, "e2e-flows-links-map");
    await page.getByRole("button", { name: "Rows", exact: true }).click();
    await page.locator(".ofu-group").first().waitFor();
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
    await page.waitForFunction(prev => document.querySelector(".ofu-flow__stage")?.style.transform !== prev, before);
    assert.equal(await level(), "100%", "the wheel alone does not zoom");
    assert.notEqual(await stage.evaluate(element => element.style.transform), before, "the wheel moves the diagram");
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 100);
    await page.mouse.wheel(0, 100);
    await page.keyboard.up("Control");
    await page.waitForFunction(() => [...Array(sessionStorage.length)].some((_, i) => {
      try { const v = JSON.parse(sessionStorage.getItem(sessionStorage.key(i))); return v && typeof v.s === "number" && v.s !== 1; }
      catch { return false; }
    }));
    const zoomed = await level();
    assert.notEqual(zoomed, "100%");
    await openNav(page, "flow-ui-flows");
    await page.locator(".ofu-group").first().waitFor();
    await page.goBack();
    await page.locator(".ofu-block").first().waitFor();
    assert.equal(await level(), zoomed);
    await page.locator(".ofu-flow__viewport").focus();
    await page.keyboard.press("1");
    await page.waitForFunction(() => document.querySelector(".ofu-zoom__level")?.textContent === "100%");
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
    await page.waitForFunction(prev => document.querySelector(".ofu-flow__stage")?.style.transform !== prev, before);
    assert.notEqual(await stage.evaluate(element => element.style.transform), before);
    await page.getByRole("button", { name: "Hide minimap" }).click();
    assert.equal(await minimap.count(), 0);
    await page.getByRole("button", { name: "Channel Flow settings" }).click();
    await page.getByLabel("Minimap").selectOption("auto");
    await page.keyboard.press("Escape");
    await canvas.waitFor({ state: "visible" });
    await page.locator(".ofu-flow__viewport").focus();
    await page.keyboard.press("0");
    await minimap.waitFor({ state: "hidden" });
    assert.equal(await minimap.isVisible(), false);
    await page.keyboard.press("1");
    await minimap.waitFor({ state: "visible" });
    assert.equal(await minimap.isVisible(), true);
  });

  test("a transformer opens its editor", async () => {
    const { page } = session;
    await page.getByRole("button", { name: /^Open Transformer · Source/ }).click();
    await page.waitForURL(/\/transformer\/0$/);
  });

  test("a click reaches the step, the script or the destination in the editor (WA-02)", async () => {
    const { page } = session;
    const selectedTab = () => page.locator('[role="tablist"][aria-label="Channel sections"] [role="tab"][aria-selected="true"]').innerText();
    const openFlow = async () => {
      await page.goto(url(`channel-flow/${LAB_RESULTS}`));
      await page.locator(".ofu-block").first().waitFor();
    };
    // Second step of the source transformer: the editor selects the first one by itself.
    await openFlow();
    await page.locator(".ofu-chip[title='Order number']").click();
    await page.waitForURL(/\/transformer\/0$/);
    await page.locator('tr[data-path="1"].selected').waitFor();
    for (const [name, key] of [["Postprocessor", "postprocessingScript"], ["Deploy", "deployScript"], ["Undeploy", "undeployScript"]]) {
      await openFlow();
      await page.getByRole("button", { name: new RegExp(`^Open ${name} ·`) }).click();
      await page.waitForURL(/\/edit$/);
      await page.waitForFunction(value => document.querySelector('[role="tabpanel"] select')?.value === value, key);
      assert.equal(await selectedTab(), "Scripts");
    }
    await openFlow();
    await page.getByRole("button", { name: /^Open Connector · Destination 3 ·/ }).click();
    await page.locator(".dest-grid tbody tr.selected td.num", { hasText: "3" }).waitFor();
    assert.equal(await selectedTab(), "Destinations");
    // From the editor's own Flow tab, only the tab changes.
    await page.getByRole("tab", { name: "Flow" }).click();
    await page.locator(".ofu-block").first().waitFor();
    await page.getByRole("button", { name: /^Open Postprocessor ·/ }).click();
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
    await page.waitForURL(/\/transformer\/0$/);
    assert.deepEqual(pluginErrors(session.errors), []);
  });

  test("Manage > Settings > Flow UI saves server defaults, survives Backup/Restore Config, and refreshes views live without reload", async () => {
    const { page } = session;
    const backupConfig = () => page.evaluate(async () => {
      const res = await fetch("/api/server/configuration", {
        headers: { Accept: "application/xml", "X-Requested-With": "OpenIntegrationEngine-WebAdmin" },
        credentials: "same-origin"
      });
      if (!res.ok) throw new Error(`Backup failed: ${res.status}`);
      return res.text();
    });
    const restoreConfig = xml => page.evaluate(async content => {
      const res = await fetch("/api/server/configuration?deploy=true&overwriteConfigMap=false", {
        method: "PUT",
        headers: {
          "Content-Type": "application/xml",
          Accept: "application/json",
          "X-Requested-With": "OpenIntegrationEngine-WebAdmin"
        },
        credentials: "same-origin",
        body: content
      });
      if (!res.ok) throw new Error(`Restore failed: ${res.status}`);
    }, xml);
    try {
      await page.goto(url("settings"));
      await page.getByRole("tab", { name: /^Flow UI/ }).waitFor();

      // Even before changing any Flow UI setting, Backup Config includes Flow UI defaults.
      const defaultBackupXml = await backupConfig();
      assert.match(defaultBackupXml, /<string>Flow UI<\/string>/);
      assert.match(defaultBackupXml, /<property name="expandedGroups">all<\/property>/);
      assert.match(defaultBackupXml, /<property name="defaultLayout">auto<\/property>/);

      await page.getByRole("tab", { name: /^Flow UI/ }).click();
      await page.locator("#ofu-setting-expandedGroups").waitFor();

      await page.locator("#ofu-setting-expandedGroups").selectOption("first");
      await page.locator("#ofu-setting-defaultLayout").selectOption("bands");
      await page.getByRole("tab", { name: /Flow UI.*●/ }).waitFor();
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByRole("tab", { name: /^Flow UI$/ }).waitFor();

      const customBackupXml = await backupConfig();
      assert.match(customBackupXml, /<string>Flow UI<\/string>/);
      assert.match(customBackupXml, /<property name="expandedGroups">first<\/property>/);
      assert.match(customBackupXml, /<property name="defaultLayout">bands<\/property>/);

      // Restoring the default backup overwrites custom server settings back to defaults.
      await page.getByRole("tab", { name: /^Server/ }).click();
      await restoreConfig(defaultBackupXml);
      await page.evaluate(() => sessionStorage.clear());
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      await page.waitForFunction(() => document.querySelectorAll(".ofu-group__head[aria-expanded='true']").length === 4);

      // Restoring the custom backup applies immediately to both views without F5 or Settings › Flow UI.
      await openNav(page, "settings");
      await page.getByRole("tab", { name: /^Server/ }).waitFor();
      await restoreConfig(customBackupXml);
      await page.evaluate(() => sessionStorage.clear());
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      await page.waitForFunction(() => document.querySelectorAll(".ofu-group__head[aria-expanded='true']").length === 1);
      assert.equal(await page.locator(".ofu-group__head").count(), 4);

      await openNav(page, "flow-ui-channel-flow");
      await page.getByRole("button", { name: "LAB · Orders to LIS (ORM)" }).click();
      await page.locator(".ofu-block").first().waitFor();
      await page.waitForFunction(() => document.querySelector('.ofu-segmented button[aria-pressed="true"]')?.textContent === "Bands");
      assert.deepEqual(pluginErrors(session.errors), []);
    } finally {
      await openNav(page, "settings");
      await page.getByRole("tab", { name: /^Flow UI/ }).click();
      await page.locator("#ofu-setting-expandedGroups").waitFor();
      await page.getByRole("button", { name: "Restore Defaults", exact: true }).click();
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await page.getByRole("tab", { name: /^Flow UI$/ }).waitFor();
    }
  });
});

describe("with RBAC roles", () => {
  test("lab-viewer sees the laboratory only, and no Channel Flow", async () => {
    const session = await signIn({ instance: browser, user: "lab-viewer", password: USER_PASSWORD });
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
      await page.getByRole("button", { name: "Links map", exact: true }).click();
      await page.getByText("Channel links hidden").waitFor();
    } finally {
      await session.close();
    }
  });

  test("ops pauses, resumes, stops and starts a channel from Flows Monitoring", async () => {
    const session = await signIn({ instance: browser, user: "ops", password: USER_PASSWORD });
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
    const session = await signIn({ instance: browser, user: "ops", password: USER_PASSWORD });
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
    const session = await signIn({ instance: browser, user: "auditor", password: USER_PASSWORD });
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
    const session = await signIn({ instance: browser, user: "integrator", password: USER_PASSWORD });
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

describe("internationalization", () => {
  test("Settings switches language live in this browser without dirtying server defaults or appearing in views", async () => {
    const session = await signIn({ instance: browser, viewport: { width: 1600, height: 1000 } });
    try {
      const { page } = session;
      await openNav(page, "settings");
      await page.getByRole("tab", { name: /^Flow UI/ }).click();
      const langSelect = page.locator("#ofu-setting-language");
      await langSelect.waitFor();
      assert.equal(await langSelect.inputValue(), "auto");

      await langSelect.selectOption("en");
      await page.getByRole("tab", { name: /^Flow UI$/ }).waitFor();
      assert.equal(await langSelect.inputValue(), "en");

      await langSelect.selectOption("fr");
      // Browser preference applies immediately without marking server settings dirty.
      await page.getByRole("tab", { name: /^Flow UI$/ }).waitFor();
      await page.getByRole("button", { name: "Enregistrer", exact: true }).waitFor();
      await page.getByText("Appliquée immédiatement dans ce navigateur").waitFor();

      await openNav(page, "flow-ui-flows");
      await page.getByPlaceholder("Filtrer canaux et tags").waitFor();
      await page.reload({ waitUntil: "domcontentloaded" });
      await openNav(page, "flow-ui-flows");
      await page.getByPlaceholder("Filtrer canaux et tags").waitFor();

      await page.getByRole("button", { name: "Réglages · Suivi des flux" }).click();
      assert.equal(await page.locator("#ofu-popover-language-flows").count(), 0);
      await page.getByRole("button", { name: "Réinitialiser les paramètres du navigateur" }).click();
      await page.getByPlaceholder("Filter channels & tags").waitFor();
      assert.deepEqual(pluginErrors(session.errors), []);
    } finally {
      await session.close();
    }
  });

  test("a French browser session starts in French automatically", async () => {
    const session = await signIn({ instance: browser, locale: "fr-FR", viewport: { width: 1600, height: 1000 } });
    try {
      const { page } = session;
      await openNav(page, "flow-ui-flows");
      await page.locator(".ofu-group").first().waitFor();
      await page.getByLabel("Détails").waitFor();
      await page.getByRole("button", { name: "Tout déplier" }).waitFor();

      await openNav(page, "flow-ui-channel-flow");
      await page.locator(".ofu-picker__group").first().waitFor();

      await openNav(page, "settings");
      await page.getByRole("tab", { name: /^Flow UI/ }).click();
      const langSelect = page.locator("#ofu-setting-language");
      await langSelect.waitFor();
      assert.equal(await langSelect.inputValue(), "auto");
      await page.getByRole("button", { name: "Enregistrer", exact: true }).waitFor();
      assert.deepEqual(pluginErrors(session.errors), []);
    } finally {
      await session.close();
    }
  });
});
