// SPDX-License-Identifier: MPL-2.0
// Opens the demo's web administrator in Playwright and signs in.
// Settings come from the environment, with the demo defaults.
import { chromium, webkit } from "playwright";

export const DEMO_URL = process.env.DEMO_URL || "https://localhost:8444/oie-webadmin/";
export const PASSWORD = process.env.OIE_DEMO_PASSWORD || "demo-flow-ui-admin";

/**
 * @param {{ user?: string, password?: string, browser?: "chromium" | "webkit",
 *           viewport?: { width: number, height: number }, theme?: "dark" | "light" }} [options]
 */
export async function signIn({ user = "admin", password = PASSWORD, browser = "chromium",
  viewport = { width: 1440, height: 900 }, theme } = {}) {
  const engine = browser === "webkit" ? webkit : chromium;
  const instance = await engine.launch();
  const context = await instance.newContext({ ignoreHTTPSErrors: true, viewport,
    colorScheme: theme === "light" ? "light" : "dark" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(DEMO_URL);
  await page.locator("input[type=text]").first().fill(user);
  await page.locator("input[type=password]").first().fill(password);
  await page.keyboard.press("Enter");
  await page.locator("[data-nav-item]").first().waitFor();
  if (theme) await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
  return { browser: instance, page, errors, close: () => instance.close() };
}

/** Opens a left-rail entry by its id (registerNavItem id or a built-in one). */
export async function openNav(page, id) {
  await page.locator(`[data-nav-item="${id}"]`).click();
}
