// SPDX-License-Identifier: MPL-2.0
// Workaround for WA-02 (doc/limites-plateforme.md): Web Admin 1.3 has no route or
// API to open a tab of the channel editor, a script, a destination or a step.
// These functions drive the controls the editor already renders, through their
// accessible markup, as a keyboard user would. Every selector is in this file.
// Each function resolves to false when its control does not appear in time; the
// caller then says in a toast where to click.

const TIMEOUT = 5000;
const EDITOR_TABS = '[role="tablist"][aria-label="Channel sections"] [role="tab"]';

/** @param {string} selector */
const all = selector => /** @type {HTMLElement[]} */ ([...document.querySelectorAll(selector)]);

let cancelPending = () => {};

/**
 * Resolves to the first truthy result of find(), checked now and at every change of
 * the page, or to null after the timeout. A new wait cancels the pending one, so
 * that a second click is not overridden by the first.
 * @template T
 * @param {() => T | null | undefined} find
 * @returns {Promise<T | null>}
 */
function waitFor(find, timeout = TIMEOUT) {
  cancelPending();
  return new Promise(resolve => {
    let done = false;
    /** @type {MutationObserver | undefined} */
    let observer;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let timer;
    const finish = value => {
      if (done) return;
      done = true;
      observer?.disconnect();
      clearTimeout(timer);
      resolve(value ?? null);
    };
    cancelPending = () => finish(null);
    const check = () => {
      const found = find();
      if (found) finish(found);
    };
    observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    timer = setTimeout(() => finish(null), timeout);
    check();
  });
}

/** Selects a row of a table, as a click does, and brings it into view. */
function pick(row) {
  if (!row) return false;
  row.click();
  row.scrollIntoView({ block: "nearest" });
  return true;
}

/** Shows a tab of the channel editor ("Summary", "Source", "Destinations", "Scripts"). */
export async function showEditorTab(label) {
  const tab = await waitFor(() => {
    const control = all(EDITOR_TABS).find(node => node.textContent.trim() === label);
    if (!control) return null;
    if (control.getAttribute("aria-selected") === "true") return control;
    control.focus(); // The editor's tabs activate on focus, as with the arrow keys.
    return null;
  });
  return !!tab;
}

/** Shows a channel script in the Scripts tab (key: "deployScript", "postprocessingScript"…). */
export async function selectScript(key) {
  if (!await showEditorTab("Scripts")) return false;
  const select = await waitFor(() => /** @type {HTMLSelectElement[]} */ (all('[role="tabpanel"] select'))
    .find(node => [...node.options].some(option => option.value === key)));
  if (!select) return false;
  if (select.value !== key) {
    // React ignores a value it did not set itself: go through the native setter.
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, key);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
  select.focus();
  return select.value === key;
}

/** Selects a destination in the Destinations tab. */
export async function selectDestination(metaDataId) {
  if (!await showEditorTab("Destinations")) return false;
  return pick(await waitFor(() => all(".dest-grid tbody tr")
    .find(row => row.querySelector("td.num")?.textContent?.trim() === String(metaDataId))));
}

/** Selects a step (index from 0) in the open filter, transformer or response editor. */
export async function selectStep(index) {
  return pick(await waitFor(() => all(`tr[data-path="${Number(index)}"]`)[0]));
}
