# Proposal: Complete URL Query Parameters for Web Admin Messages View

**Target:** OIE Web Admin (`/messages/:channelId`)  
**Related limits:** [WA-01](platform-limits.md#wa-01), [WA-15](platform-limits.md#wa-15)

---

## 1. Context & Motivation

To make day-to-day troubleshooting and operations in OIE smoother, this proposal leverages web-native URL query parameters for bookmarkable searches and plugin deep-links—a workflow desktop Swing clients could not offer. While initially motivated by the **Flow UI** plugin (deep-linking from *Flows Monitoring* counters to filtered channel messages), the contract is intentionally general so any plugin, bookmark, or shared link can target any standard message search filter in Web Admin.

Currently, `/messages/:channelId` only reads `?messageId=` and `?metaDataId=` from the URL query string:

1. **No status, date, or text filters via URL (`WA-01`):** plugins and users sharing links cannot deep-link to `ERROR`, `QUEUED`, `FILTERED`, or `SENT` messages, nor to a date range or text search.
2. **Toolbar fields out of sync (`WA-01`):** `?metaDataId=<n>` is applied internally as an *Advanced* filter (*Current Search* shows `Connectors: ...` and the *Advanced* button shows an active dot), while the toolbar's **Connector** dropdown still displays *Any*. Users believe the filter was not applied.

This proposal defines a complete, flat, readable URL query contract covering **all main search bar filters** and **all scalar/boolean fields of the *Advanced* dialog**, aligned 1-to-1 with Web Admin's existing state and OIE REST API parameter names, while keeping multi-row table filters (`contentSearches`, `metaDataSearch`) out of scope.

---

## 2. Scope

### In Scope
- All **main search bar** filters (`Connector`, `Status`, `Start Date`, `End Date`, `Text`, `Regex`, `Message ID`).
- All **scalar and boolean *Advanced* filters** that map 1-to-1 to `GET /api/channels/{channelId}/messages` parameters.
- **UI synchronization:** URL parameters pre-fill the corresponding visible toolbar and *Advanced* controls on load, and the *Advanced* indicator only lights up when an *Advanced*-only criterion is active.

### Out of Scope
- **Custom metadata filters (`metaDataSearch` / `metaDataCaseInsensitiveSearch`):** multi-row `column + operator + value` rules are excluded to avoid complex DSL or opaque JSON in URLs.
- **Content search table (`contentSearches`):** multi-row `(contentType, contains)` pairs (`rawContentSearch`, `transformedContentSearch`, etc.) are excluded for the same reason.

---

## 3. Proposed URL Query Parameters

Multi-value parameters (`metaDataId`, `excludedMetaDataId`, `status`) should accept either repeated keys (`?status=ERROR&status=QUEUED`) or comma-separated values (`?status=ERROR,QUEUED`).

> **Implementation note:** The Web Admin router's `parseQuery` (`router.ts`) currently returns a flat `Record<string, string>` (last key wins), so repeated keys like `?status=ERROR&status=QUEUED` are overwritten in `ctx.query`. The `/messages/:channelId` handler should read `window.location.search` via `URLSearchParams.getAll(...)` (or extend `parseQuery`) to support repeated keys.

### 3.1 Main Search Bar

| URL Parameter | UI Control | OIE API Parameter | Example |
|---|---|---|---|
| `metaDataId` | Toolbar **Connector** (if 1) / *Advanced* (if >1) | `includedMetaDataId` | `?metaDataId=1` or `?metaDataId=1,2` |
| `status` | Toolbar **Status** | `status` | `?status=ERROR` or `?status=ERROR,QUEUED` |
| `startDate` | Toolbar **Start Date** (`datetime-local` / ISO-8601) | `startDate` | `?startDate=2026-11-17T00:00` |
| `endDate` | Toolbar **End Date** (`datetime-local` / ISO-8601) | `endDate` | `?endDate=2026-11-17T23:59` |
| `textSearch` | Toolbar **Text** search input | `textSearch` | `?textSearch=ORU-R01` |
| `textSearchRegex` | Toolbar **Regex** checkbox (`true`/`false`) | `textSearchRegex` | `?textSearch=^MSH&textSearchRegex=true` |
| `messageId` | Existing shortcut for exact message (`min = max`) | `minMessageId` & `maxMessageId` | `?messageId=325` |

### 3.2 Scalar & Boolean *Advanced* Fields

| URL Parameter | UI Control (*Advanced*) | OIE API Parameter | Example |
|---|---|---|---|
| `minMessageId` | Message Id (min) | `minMessageId` | `?minMessageId=100` |
| `maxMessageId` | Message Id (max) | `maxMessageId` | `?maxMessageId=500` |
| `minOriginalId` | Original Id (min) | `minOriginalId` | `?minOriginalId=40` |
| `maxOriginalId` | Original Id (max) | `maxOriginalId` | `?maxOriginalId=42` |
| `minImportId` | Import Id (min) | `minImportId` | `?minImportId=10` |
| `maxImportId` | Import Id (max) | `maxImportId` | `?maxImportId=20` |
| `serverId` | Server Id | `serverId` | `?serverId=3f1c2b9e-...` |
| `excludedMetaDataId` | Excluded Connectors | `excludedMetaDataId` | `?excludedMetaDataId=0` |
| `minSendAttempts` | Send Attempts (min) | `minSendAttempts` | `?minSendAttempts=1` |
| `maxSendAttempts` | Send Attempts (max) | `maxSendAttempts` | `?maxSendAttempts=5` |
| `attachment` | Has Attachment (`true`/`false`) | `attachment` | `?attachment=true` |
| `error` | Has Error (`true`/`false`) | `error` | `?error=true` |

---

## 4. Expected UI & Routing Behavior

1. **Pre-fill visible toolbar controls:**
   - Single `metaDataId` → select that connector in the toolbar **Connector** dropdown (do **not** mark *Advanced* as active).
   - `status` → check those statuses in the toolbar **Status** multi-select.
   - `startDate` / `endDate` / `textSearch` / `textSearchRegex` → populate the toolbar inputs directly.
2. **Route change re-hydration:**
   - Navigating to `/messages/:channelId?...` when already on `/messages` (e.g., from a plugin or another channel link) re-parses the query string and triggers the search.
3. **Precedence & edge cases:**
   - `messageId` takes precedence over `minMessageId` / `maxMessageId` (acting as `min = max = messageId`).
   - If both `metaDataId` and `excludedMetaDataId` are provided, `metaDataId` (`includedMetaDataId`) wins, matching `buildParams()`.
   - `status` values are matched case-insensitively (`?status=error` → `ERROR`); unknown status values are ignored.
   - Existing `?send=1` behavior (opening the Send Message dialog) is preserved and should not be cleared on initial load.
4. **Optional URL sync on Search (recommended):**
   - When the user clicks **Search**, update the URL query string via `replaceState` (omitting empty/default values) so the current search is immediately shareable/bookmarkable without polluting browser history. Avoid calling `replaceState` on initial mount.
5. **Separate follow-up (`WA-15`):**
   - When filtering by `status` (e.g. `?status=ERROR`), OIE's API only returns matching connector entries, hiding sibling connectors of the same message. Adding a row action (*"Show all connectors for this message"*) or a toggle (*"Include sibling connectors"*) is orthogonal and can be handled in a separate PR.

---

## 5. Impact on Flow UI (*Flows Monitoring*)

Once Web Admin supports `?status=` and reflects `?metaDataId=` in the **Connector** field:
- **Destination counters** (`Sent`, `Filtered`, `Queued`, `Errored`) can link to `/messages/:channelId?metaDataId=<n>&status=<STATUS>` (`SENT`, `FILTERED`, `QUEUED`, `ERROR`).
- **Source counters** (`Filtered`, `Queued`, `Errored`) can link to `/messages/:channelId?metaDataId=0&status=<STATUS>`.
- **`Received` counters** (Channel & Source) intentionally omit `status` (`/messages/:channelId` and `/messages/:channelId?metaDataId=0`), because processed messages transition from `RECEIVED` to `TRANSFORMED`, `FILTERED`, or `ERROR`.

---

## 6. Acceptance Criteria

- [ ] `/messages/:channelId?metaDataId=1` selects connector `1` in the toolbar **Connector** dropdown and does not light up the *Advanced* indicator.
- [ ] `/messages/:channelId?metaDataId=1&status=ERROR` filters on connector `1` + status `ERROR` and reflects both in the toolbar controls and *Current Search*.
- [ ] `/messages/:channelId?status=ERROR,QUEUED` selects both statuses in the **Status** control.
- [ ] `startDate`, `endDate`, `textSearch`, `textSearchRegex`, and `messageId` pre-fill their respective inputs and execute on initial load.
- [ ] Scalar *Advanced* params (`minMessageId`, `maxMessageId`, `minOriginalId`, `maxOriginalId`, `minImportId`, `maxImportId`, `serverId`, `excludedMetaDataId`, `minSendAttempts`, `maxSendAttempts`, `attachment`, `error`) pre-fill the *Advanced* dialog, light up the *Advanced* indicator, and execute on initial load.
- [ ] Invalid/unknown parameter values are ignored safely without breaking the page.
- [ ] Supported `/messages/:channelId` query parameters are documented in `web-administrator/PLUGINS.md` alongside the editor deep-link parameters.
