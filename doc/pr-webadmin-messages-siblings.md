# Proposal: Inspect All Connectors of a Filtered Message (`WA-15`)

**Target:** OIE Web Admin (`/messages/:channelId`)  
**Related limit:** [WA-15](platform-limits.md#wa-15)

---

## 1. Context & Motivation

To make day-to-day troubleshooting in OIE Web Admin smoother—especially when deep-linking from monitoring plugins such as **Flow UI** (`?metaDataId=3&status=ERROR`) or filtering by `Status` / `Connector` in the toolbar—operators need to inspect the `Source` payload and sibling destinations of a filtered message without losing their current search results.

Currently, `GET /api/channels/{channelId}/messages` only returns the `connectorMessages` entries that match the active filter:

1. **Missing `Source` and sibling destinations in the table:** If Destination 3 failed with `ERROR` while `Source` (`0`) and Destinations 1–2 succeeded, filtering by `status=ERROR` (or `metaDataId=3&status=ERROR`) returns a message whose parent row (`metaDataId: 0`) is a blank placeholder (`sourceOf(m) === null`) and whose sibling destinations (`1`, `2`) are absent from the tree.
2. **Extra manual search required to diagnose the root cause:** To inspect the inbound `Source` payload, source mappings, or upstream destination responses that led to the error, the operator has to copy the `Message ID`, reset the filters, and run a second search by `Message ID`.

> **Why not a global filter-bar toggle ("Show all connectors for all results")?**
> OIE's `GET /api/channels/{channelId}/messages` endpoint has no parameter to return unfiltered sibling connectors alongside filtered matches. Because 20 errored messages on a page can span widely separated IDs, hydrating all connectors for an entire result page upfront would require $N$ additional per-message API requests on every search/page load, and would mix non-matching connector statuses into the result table that batch actions (*Reprocess Results*, *Remove Results*) operate on. Acting per message on demand costs **zero extra requests on search load** and reuses `GET /api/channels/{channelId}/messages/{messageId}`, which `showDetail` already calls when a row is selected.

---

## 2. Proposed Solution

### 2.1 Inline Icon Button Next to the Message ID
- On any message row in the results table where connectors were omitted by the search filter (`!sourceOf(m)`, or a connector/status filter is active and the row has fewer connectors than the channel), display a compact branching icon button (`<Icon name="channels" size={13} />`, `title="Show all connectors for message <id>"`) right beside the message ID in the **Id** column.
- Clicking the icon button (without altering standard row-click behavior):
  - Reuses `detail.message` if already loaded for that message ID, or fetches `GET /api/channels/{channelId}/messages/{messageId}`.
  - Populates all `connectorMessages` (`Source` + all destinations) into that message row in place, expands its child rows, and hides the icon once all connectors of that message are visible.

### 2.2 Context Menu & Message Tasks Rail
- Also expose **"Show All Connectors"** in the row right-click context menu and in the **Message Tasks** rail whenever the selected message has hidden sibling connectors.

---

## 3. Acceptance Criteria

- [ ] On a filtered search (e.g. `?status=ERROR` or `?metaDataId=1`), filtered message rows display a small **Show all connectors** icon button next to the message ID in the `Id` column.
- [ ] Clicking the icon (or triggering **Show All Connectors** from the context menu / **Message Tasks** rail) reveals `Source` (`metaDataId: 0`) and all sibling destinations of that message in the table without losing the current filtered search results, and removes the icon for that row.
- [ ] Normal row clicks keep their existing Swing-parity selection behavior without mutating the table rows.
- [ ] Existing message browser E2E suites (`e2e/messages-react.spec.ts`, `e2e/message-source-navigation.spec.ts`, `e2e/message-destination-order.spec.ts`, `e2e/export.spec.ts`) continue to pass.
