// SPDX-License-Identifier: MPL-2.0
// Takes the screenshots of the README and the user guide (doc/images/) from the
// running demo, in the light theme:  node test/e2e/screenshots.mjs
import { DEMO_URL, openNav, signIn } from "./session.js";

const OUT = new URL("../../doc/images/", import.meta.url).pathname;
const ID = {
  labResults: "07516747-4e3e-4cee-80cf-6a9aaf05412e",
  radOrders: "00a5626d-4dc6-4d37-ad45-193566bc8691",
  hie: "703cfc96-a148-4fde-908d-1353330b5dde",
  broadcast: "8ec16e83-2f62-4278-9362-78518e5f1527"
};

const session = await signIn({ viewport: { width: 1440, height: 860 }, theme: "light" });
const { page } = session;
const shot = name => page.screenshot({ path: `${OUT}${name}.png` });
const settle = () => page.waitForTimeout(700);
const go = async path => {
  await page.goto(new URL(path, DEMO_URL).href);
  await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), "light");
};

try {
  await page.evaluate(() => { sessionStorage.clear(); });

  // Flows Monitoring: groups, counters, then links between channels
  await openNav(page, "flow-ui-flows");
  await page.locator(".ofu-group").first().waitFor();
  await settle();
  await shot("flows-monitoring");
  await page.locator(".ofu-group__head", { hasText: "Laboratory" }).click();
  await page.locator(".ofu-group__head", { hasText: "Billing" }).click();
  await page.locator(".ofu-group__head", { hasText: "External Partners" }).click();
  await settle();
  await page.locator(`#ofu-lane-${ID.labResults}`).scrollIntoViewIfNeeded();
  await shot("flows-links");
  await page.getByRole("button", { name: "Help" }).click();
  await settle();
  await shot("flows-help");
  await page.keyboard.press("Escape");

  // Channel Flow: picker, the three views, the editor's tab
  await openNav(page, "flow-ui-channel-flow");
  await page.locator(".ofu-picker__group").first().waitFor();
  await settle();
  await shot("channel-flow-picker");

  await go(`channel-flow/${ID.labResults}`);
  await page.locator(".ofu-block").first().waitFor();
  await settle();
  await shot("channel-flow");
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await settle();
  await shot("channel-flow-bands");

  await go(`channel-flow/${ID.hie}`);
  await page.locator(".ofu-block").first().waitFor();
  await page.getByRole("button", { name: "Line", exact: true }).click();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await settle();
  await shot("channel-flow-line");

  await go(`channel-flow/${ID.radOrders}`);
  await page.locator(".ofu-block").first().waitFor();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await settle();
  await shot("channel-flow-columns");

  await go(`channel-flow/${ID.broadcast}`);
  await page.locator(".ofu-block").first().waitFor();
  await settle();
  await shot("channel-flow-start");
  await page.getByRole("button", { name: "Help" }).click();
  await settle();
  await shot("channel-flow-help");
  await page.keyboard.press("Escape");

  await go(`channels/${ID.hie}/edit`);
  await page.getByRole("tab", { name: "Flow" }).click();
  await page.locator(".ofu-block").first().waitFor();
  await page.getByRole("button", { name: /^Add to Transformer · Destination 2/ }).click();
  await settle();
  await shot("channel-flow-tab");
  await page.keyboard.press("Escape");

  // Settings
  await go("settings?tab=Flow%20UI");
  await page.locator(".ofu-settings-panel").waitFor();
  await settle();
  await shot("settings");

  console.log(`Screenshots written to ${OUT}`);
} finally {
  await session.close();
}
