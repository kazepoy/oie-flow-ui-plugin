// SPDX-License-Identifier: MPL-2.0
// Opens the demo's web administrator in Playwright and signs in.
// Settings come from the environment, with the demo defaults.
import { chromium, webkit } from "playwright";

export const DEMO_URL = process.env.DEMO_URL || "https://localhost:8444/oie-webadmin/";
export const PASSWORD = process.env.OIE_DEMO_PASSWORD || "admin";

/** Launches one browser binary that several isolated sessions can share via `instance`. */
export function launchBrowser(browser = "chromium") {
  return (browser === "webkit" ? webkit : chromium).launch();
}

/**
 * @param {{ user?: string, password?: string, browser?: "chromium" | "webkit",
 *           instance?: import("playwright").Browser,
 *           viewport?: { width: number, height: number }, theme?: "dark" | "light",
 *           locale?: string }} [options]
 */
export async function signIn({ user = "admin", password = PASSWORD, browser = "chromium",
  instance, viewport = { width: 1440, height: 900 }, theme, locale = "en-US" } = {}) {
  const owned = !instance;
  const browserInstance = instance ?? await launchBrowser(browser);
  const context = await browserInstance.newContext({ ignoreHTTPSErrors: true, viewport,
    locale, colorScheme: theme === "light" ? "light" : "dark" });
  const page = await context.newPage();
  const close = () => owned ? browserInstance.close() : context.close();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto(DEMO_URL);
    await page.locator("input[type=text]").first().fill(user);
    await page.locator("input[type=password]").first().fill(password);
    await page.keyboard.press("Enter");
    await page.locator("[data-nav-item]").first().waitFor();
    if (theme) await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
    return { browser: browserInstance, page, errors, close };
  } catch (error) {
    await close();
    throw error;
  }
}

/** Opens a left-rail entry by its id (registerNavItem id or a built-in one). */
export async function openNav(page, id) {
  await page.locator(`[data-nav-item="${id}"]`).click();
}
