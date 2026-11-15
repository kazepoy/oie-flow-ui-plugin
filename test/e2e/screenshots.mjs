// SPDX-License-Identifier: MPL-2.0
// Takes the screenshots of the README and the user guide (doc/images/) from the
// running demo, in the light theme:  node test/e2e/screenshots.mjs
import { DEMO_URL, openNav, signIn } from "./session.js";

const OUT = new URL("../../doc/images/", import.meta.url).pathname;
const ID = {
  adtInbound: "6d1d3f7e-d707-4a17-9a35-f3af99961456",
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
const pan = async (dx, dy) => {
  const box = await page.locator(".ofu-flow__viewport").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(dx, dy);
  await page.waitForTimeout(350);
};

try {
  await page.evaluate(() => { sessionStorage.clear(); });

  // Flows Monitoring: all groups expanded (full capture), links highlight, and help
  await openNav(page, "flow-ui-flows");
  await page.locator(".ofu-group").first().waitFor();
  await page.setViewportSize({ width: 1720, height: 1200 });
  await settle();
  const dims = await page.evaluate(() => {
    const last = [...document.querySelectorAll(".ofu-group")].pop();
    const maxRight = Math.max(
      ...[...document.querySelectorAll(".ofu-dest, .ofu-lane__tiles, .ofu-group")].map(
        el => el.getBoundingClientRect().right
      )
    );
    return {
      maxRight,
      lastBottom: last ? last.getBoundingClientRect().bottom : null
    };
  });
  const fullW = Math.max(1760, Math.ceil(dims.maxRight + 40));
  const fullH = Math.ceil((dims.lastBottom ?? 2400) + 48);
  await page.setViewportSize({ width: fullW, height: fullH });
  await settle();
  await shot("flows-monitoring");

  await page.setViewportSize({ width: fullW, height: 780 });
  await page.getByRole("button", { name: "Called by LAB · Results from LIS (ORU)" }).click();
  await settle();
  await shot("flows-links");

  await page.setViewportSize({ width: 1440, height: 860 });
  await page.getByRole("button", { name: "Help" }).click();
  await settle();
  await shot("flows-help");
  await page.keyboard.press("Escape");

  // Channel Flow: picker, the three views at 100% zoom, start view, help, and editor's tab
  await openNav(page, "flow-ui-channel-flow");
  await page.locator(".ofu-picker__group").first().waitFor();
  await settle();
  await shot("channel-flow-picker");

  await page.evaluate(() => { sessionStorage.clear(); });
  await page.setViewportSize({ width: 1540, height: 900 });
  await go(`channel-flow/${ID.adtInbound}`);
  await page.locator(".ofu-block").first().waitFor();
  await page.getByRole("button", { name: "Bands", exact: true }).click();
  await settle();
  await pan(0, 185);
  await shot("channel-flow");

  await go(`channel-flow/${ID.labResults}`);
  await page.locator(".ofu-block").first().waitFor();
  await settle();
  await pan(0, 460);
  await shot("channel-flow-bands");

  await page.setViewportSize({ width: 1660, height: 860 });
  await go(`channel-flow/${ID.hie}`);
  await page.locator(".ofu-block").first().waitFor();
  await page.getByRole("button", { name: "Line", exact: true }).click();
  await settle();
  await shot("channel-flow-line");

  await page.setViewportSize({ width: 1440, height: 900 });
  await go(`channel-flow/${ID.radOrders}`);
  await page.locator(".ofu-block").first().waitFor();
  await settle();
  await pan(0, 295);
  await shot("channel-flow-columns");

  await page.setViewportSize({ width: 1440, height: 860 });
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
  await settle();
  await pan(200, 60);
  await page.getByRole("button", { name: /^Add to Transformer · Destination 1/ }).click();
  await settle();
  await shot("channel-flow-tab");
  await page.keyboard.press("Escape");

  // Settings
  await go("settings");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /^Flow UI/ }).click();
  await page.locator("#ofu-setting-expandedGroups").waitFor();
  await settle();
  await shot("settings");

  console.log(`Screenshots written to ${OUT}`);
} finally {
  await session.close();
}
