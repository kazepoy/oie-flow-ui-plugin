# Platform Limits

Register of defects, gaps and limitations found in OIE and the plugins Flow UI
depends on: insufficient public API, inconvenient behaviour, undocumented details.
It serves three purposes:

- justify Flow UI design choices (what is worked around, what is dropped);
- prepare requests for upstream projects;
- know what to re-verify on each version upgrade.

## Affected versions

| Component | Version | Source |
|---|---|---|
| Open Integration Engine | 4.7.0 | Official build from tag `v4.7.0` |
| Web Support (Web Admin) | 1.3.0 (plugin API `4.10.0`) | [gibson9583/oie-web-support-plugin](https://github.com/gibson9583/oie-web-support-plugin) |
| Role Based Access Control | 1.3.0 | [diridium-com/role-based-access-control](https://github.com/diridium-com/role-based-access-control) |

## Keeping the register

One entry per finding, with a stable identifier (`WA-` Web Admin, `WS-` Web Support
server-side, `RB-` RBAC, `OIE-` engine). An entry is never renumbered; a resolved
entry remains, with the version that fixes it.

| Field | Content |
|---|---|
| Finding | What is missing or wrong, in one or two sentences |
| Evidence | Where it was seen: file, observed behaviour, test |
| Impact | Consequence for Flow UI |
| Workaround | What Flow UI does, without hacks; "none" if the feature is dropped |
| Upstream request | What is needed in the target project, link to the issue once opened |

**Status**: *To verify* (assumed, not yet proven), *Open* (proven, nothing done),
*Worked around* (Flow UI lives with it), *Reported* (issue opened), *Resolved*
(version).
**Severity**: *Blocking* (prevents a feature), *Inconvenient* (degrades usage),
*Minor* (discomfort, documentation).

## Summary

| ID | Component | Finding | Severity | Status |
|---|---|---|---|---|
| [WA-01](#wa-01) | Web Admin | Messages: no status filter in URL | Inconvenient | Worked around |
| [WA-02](#wa-02) | Web Admin | Channel editor: no URL for a tab, a destination, a script | Inconvenient | Resolved (with URL params) |
| [WA-03](#wa-03) | Web Admin | Plugin tabs placed after built-in ones, never default | Inconvenient | Worked around |
| [WA-04](#wa-04) | Web Admin | Channel tabs not filtered by RBAC task | Minor | Worked around |
| [WA-05](#wa-05) | Web Admin | No public subscription to route changes | Minor | Worked around |
| [WA-06](#wa-06) | Web Admin | User preferences not exposed to plugins | Minor | Worked around |
| [WA-07](#wa-07) | Web Admin | No i18n mechanism | Inconvenient | Worked around |
| [WA-08](#wa-08) | Web Admin | WAR: entry imported from `blob:`, relative imports impossible | Inconvenient | Worked around |
| [WA-09](#wa-09) | Web Admin | `platform.store` keys undocumented | Minor | Worked around |
| [WA-10](#wa-10) | Web Admin | Dashboard: no display mode added by a plugin | Minor | Worked around |
| [WA-11](#wa-11) | Web Admin | CSS tokens undocumented | Minor | Worked around |
| [WA-12](#wa-12) | Web Admin | `apiMin`: API version distinct from engine version | Minor | Open |
| [WA-13](#wa-13) | Web Admin | Types of `@oie/web-*` packages: publication uncertain | Minor | To verify |
| [WA-14](#wa-14) | Web Admin | SVG markers not rendered in some cases | Minor | To verify |
| [WA-15](#wa-15) | Web Admin | Messages: URL connector does not show in the *Connector* field | Inconvenient | Open |
| [WS-01](#ws-01) | Web Support | Extension without Java code: served or not | Blocking if not | Resolved |
| [WS-02](#ws-02) | Web Support | Plugin UIs absent without Web Support | Minor | Open |
| [RB-01](#rb-01) | RBAC | Unknown task allowed; no plugin-specific permission without Java | Inconvenient | Worked around |
| [RB-02](#rb-02) | RBAC | Transient denial until permissions are loaded | Minor | To verify |
| [RB-03](#rb-03) | RBAC | Links inside plugin views not covered | Minor | Worked around |
| [RB-04](#rb-04) | RBAC | Role import format undocumented | Minor | Worked around |
| [RB-05](#rb-05) | RBAC | Authorization plugin failure: all plugins blocked | Minor | Open |
| [RB-06](#rb-06) | RBAC | Restriction by channel list, not by group | Inconvenient | Open |
| [RB-07](#rb-07) | RBAC | Another user's preferences readable and writable | Security | Reported |
| [OIE-01](#oie-01) | Engine | `waitForPrevious` always `false` in statuses | Inconvenient | Worked around |
| [OIE-02](#oie-02) | Engine | Statuses limited to deployed connectors | Minor | Worked around |
| [OIE-03](#oie-03) | Engine | *Queued* outside the statistics map | Minor | Worked around |
| [OIE-04](#oie-04) | Engine | No statistics history | Inconvenient | To verify |
| [OIE-05](#oie-05) | Engine | `X-Requested-With` required on all API endpoints | Minor | Worked around |
| [OIE-06](#oie-06) | Engine | Irregular REST responses (empty 204, empty body, boolean in 200) | Minor | Worked around |
| [OIE-07](#oie-07) | Engine | First-login wizard must be disabled via API | Minor | Worked around |
| [OIE-08](#oie-08) | Engine | Docker image built from source | Minor | To verify |
| [OIE-09](#oie-09) | Engine | Restart required after installing an extension | Minor | Open |
| [OIE-10](#oie-10) | Engine | API JARs missing from Maven Central | Minor | Open |
| [OIE-11](#oie-11) | Engine | Message sent via API: no default destination | Inconvenient | Worked around |
| [OIE-12](#oie-12) | Engine | Stopping a destination without queue: "done", but nothing happens | Inconvenient | Worked around |

---

## Web Admin 1.3.0

### WA-01

**Messages: no status filter in URL.** · Inconvenient · Worked around

- **Finding.** The Messages view only reads `?messageId=` and `?metaDataId=`. No status,
  no date range, no text filter.
- **Evidence.** `assets/messages-*.js`: the component receives `query` and only reads
  those two keys (`includedMetaDataIds = [Number(query.metaDataId)]`).
- **Impact.** Clicking the *Errored* counter cannot open only errored messages. The
  mapper ticked the *Status* menu by simulating clicks.
- **Workaround.** Messages opens filtered by connector; the tooltip says so.
- **Upstream request.** `?status=ERROR` (comma-separated list), then `?startDate=` /
  `?endDate=`.

### WA-02

**Channel editor: no URL for a tab, a destination, a script.** · Inconvenient · Resolved (with URL params)

- **Finding.** Originally, filters, transformers and responses had routes without a
  step parameter, and the editor's active tab, selected destination and displayed
  script were internal component state.
- **Resolution.** Web Admin (`feat/editor-url-params`) added `?tab=`, `?metaDataId=`
  and `?script=` on `/channels/:id/edit`, plus `?step=` on
  `/channels/:id/{filter|transformer|response}/:metaDataId`, preserving the unsaved
  draft across in-flow `/channels/:id/` navigation. Flow UI's `src/host/routes.js` and
  `src/host/editor.js` now navigate directly using these URL parameters; the
  former DOM workaround (`src/host/editor-dom.js`) has been removed.

### WA-03

**Plugin tabs placed after built-in ones, never default.** · Inconvenient · Worked around

- **Finding.** The order is fixed: `Summary`, `Source`, `Destinations`, `Scripts`, then
  plugin tabs. No way to open the editor on a plugin tab.
- **Evidence.** `assets/channel-editor-*.js`:
  `["Summary","Source","Destinations","Scripts",...channelTabs().map(t => t.label)]`.
- **Impact.** Automatically opening Flow, validated in v2, required a hack.
- **Workaround.** Channel Flow becomes a Design view; the tab remains, without
  automatic opening.
- **Upstream request.** `registerChannelTab({ default: true })` or a "default opening
  tab" user preference.

### WA-04

**Channel tabs not filtered by RBAC task.** · Minor · Worked around

- **Finding.** Dashboard tabs are filtered by `checkTask("dashboard", tab.task)`.
  Channel editor tabs are not: the `task` field is ignored.
- **Evidence.** `assets/dashboard-*.js` (filter present) and `assets/channel-editor-*.js`
  (no filter on `channelTabs()`).
- **Impact.** A plugin tab is displayed regardless of role.
- **Workaround.** The tab checks permissions itself and hides its actions.
- **Upstream request.** Honour `task` (group `channel`) on `registerChannelTab`.

### WA-05

**No public subscription to route changes.** · Minor · Worked around

- **Finding.** `platform.router` only offers `navigate` and `currentPath`. The router
  dispatches a `CustomEvent("route:changed")` on `window`, outside the documented API.
- **Evidence.** `core/router.js` (`window.dispatchEvent(new CustomEvent('route:changed', …))`)
  and `core/platform.js` (`router: { navigate, currentPath }`).
- **Impact.** Reacting to navigation requires a non-contractual event.
- **Workaround.** Flow UI does not listen to routes: everything goes through its views'
  lifecycle.
- **Upstream request.** `platform.router.subscribe(listener)` or `platform.events` with
  a documented event name.

### WA-06

**User preferences not exposed to plugins.** · Minor · Worked around

- **Finding.** Web Admin has a preferences module (`getPref`, `setPrefs`,
  `onPrefsChange`) but does not expose it to plugins.
- **Evidence.** `core/prefs.js`; absent from `core/platform.js` and `@oie/web-*`
  packages.
- **Impact.** Without a workaround, plugin settings would stay tied to the browser, not
  to the user.
- **Workaround.** User preferences stored in OIE via the REST API
  (`PUT /api/users/{id}/preferences/flowui.settings`). The `person_preference` table
  accepts arbitrary keys. Verified on 2026-11-11: a user with a restricted RBAC role
  writes and reads back their own preferences. Falls back to `localStorage` on failure.
  Code in `src/host/preferences.js`.
- **Upstream request.** `platform.prefs` with a per-plugin namespace.

### WA-07

**No i18n mechanism.** · Inconvenient · Worked around

- **Finding.** Web Admin is entirely in English, with no catalog or language setting.
- **Evidence.** No trace of i18n in the main bundle (only `Intl` is used for formatting).
- **Impact.** Each plugin picks its language alone; risk of a mixed-language UI.
- **Workaround.** Plugin-owned i18n (`src/i18n/`), browser language, English fallback.
- **Upstream request.** User language and loading of plugin catalogs.

### WA-08

**WAR: entry imported from `blob:`, relative imports impossible.** · Inconvenient · Worked around

- **Finding.** In WAR deployment, Web Admin downloads the plugin entry with the
  `X-Requested-With` header, then imports it from a `blob:` URL. Relative imports do
  not resolve. Node/Docker deployment, however, accepts them: the same plugin behaves
  differently depending on hosting.
- **Evidence.** `core/platform.js`, `loadPluginsOnce` (comment and `war` branch).
- **Impact.** A multi-file plugin does not load in WAR. The mapper reloaded each file
  with `getAssetText` and then `import(blob:)`.
- **Workaround.** esbuild bundle into a single `plugin.js`; only `@oie/*` imports
  (import map) remain external.
- **Upstream request.** Resolve relative imports in WAR (for example via a service
  worker or per-plugin import map), or document the single-file requirement.

### WA-09

**`platform.store` keys undocumented.** · Minor · Worked around

- **Finding.** Keys such as `editingChannel`, `serverVersion` or `user` are read or
  written by plugins without being documented as a contract. The mapper writes
  `editingChannel` before opening a filter route.
- **Impact.** An upgrade could rename them without warning.
- **Workaround.** Accesses grouped in `src/host/editor.js` and `routes.js`. Verified:
  from the Design view, a transformer route opens without writing `editingChannel`.
  Flow UI only writes it from the Flow tab to keep the draft, and reads
  `editingChannelDirty` to signal unsaved changes.
- **Upstream request.** List of stable keys, or dedicated functions
  (`platform.channelEditor.open(channel, target)`).

### WA-10

**Dashboard: no display mode added by a plugin.** · Minor · Worked around

- **Finding.** The Dashboard offers cards and table views. A plugin can add a tab under
  the Dashboard or a column, not a third display mode.
- **Evidence.** Observed during mapper v2; API limited to `registerDashboardTab` and
  `registerDashboardColumn`.
- **Impact.** Flows Monitoring cannot be a view inside the Dashboard.
- **Workaround.** Separate entry under Monitor (`registerView` + `registerNavItem`).
- **Upstream request.** `registerDashboardView({ id, label, component })`.

### WA-11

**CSS tokens undocumented.** · Minor · Worked around

- **Finding.** Variables `--bg0..3`, `--text`, `--text-dim`, `--line`, `--accent`,
  `--ok`, `--warn`, `--err`, `--violet`, `--font-mono` exist in the compiled CSS
  without being documented as a contract. Dark theme by default, light with
  `[data-theme=light]`.
- **Evidence.** `assets/index-*.css`.
- **Impact.** Renaming them would break plugin colours.
- **Workaround.** `tokens.css` derives everything from these variables with fallback
  values. The *Settings › Flow UI* tab reuses the `panel`, `panel-header` and
  `panel-body` classes of the other tabs so it looks like them: those are not a
  contract either.
- **Upstream request.** Document the stable tokens.

### WA-12

**`apiMin`: API version distinct from engine version.** · Minor · Open

- **Finding.** The contract states that the API version follows the OIE version line,
  but Web Admin 1.3.0 declares `4.10.0` on a 4.7.0 engine. It is unclear which value to
  declare to require "Web Admin 1.3 APIs".
- **Evidence.** `core/platform.js`, `OIE_API_VERSION = '4.10.0'`.
- **Impact.** Risk of declaring `apiMin` too low (plugin loads, then errors) or too
  high (plugin rejected).
- **Workaround.** Set in phase 0 according to the APIs actually used.
- **Upstream request.** Table mapping "API version → added functions".

### WA-13

**Types of `@oie/web-*` packages: publication uncertain.** · Minor · To verify

- **Finding.** The sources indicate that type declarations are generated for plugin
  authors; whether they are published (npm or elsewhere) is not established.
- **Impact.** Plugin type-checking must be done without official types.
- **Workaround.** Local JSDoc in `src/host/`.

### WA-14

**SVG markers not rendered in some cases.** · Minor · To verify

- **Finding.** The mapper draws arrowheads as `path` elements because SVG `marker`s
  "do not render in all hosts". Cause not established.
- **Workaround.** Arrowheads drawn as `path` elements, as in the mapper.

### WA-15

**Messages: URL connector does not show in the *Connector* field.** · Inconvenient · Open

- **Finding.** `/messages/<channel>?metaDataId=2` does filter on the connector, but via
  the *advanced* filter: the *Current Search* line says "Connectors: …" and the
  *Advanced* button shows a dot, while the toolbar's *Connector* dropdown still shows
  *Any*. Users believe the filter is missing.
- **Evidence.** Demo, click on a Flows Monitoring counter (screenshot on 2026-11-11).
- **Impact.** Clicking a counter appears not to filter; status, meanwhile, is genuinely
  not filtered (WA-01).
- **Workaround.** None without manipulating the Messages page. The user guide and Flows
  Monitoring help explain where to read the active filter.
- **Upstream request.** Reflect `metaDataId` in the *Connector* field; accept
  `?status=` (WA-01).

## Web Support 1.3.0 (server)

### WS-01

**Extension without Java code: served or not.** · Blocking if not · Resolved (verified on 2026-11-11)

- **Finding.** Web Support discovers `extensions/<path>/webadmin/plugin.json` from
  installed plugin metadata. A `plugin.xml` with neither `serverClasses` nor library
  should suffice, but nothing guaranteed it.
- **Evidence.** `WebSupportServlet.class` (`getPluginMetaData`, `WEBADMIN_DIR`,
  `plugin.json`).
- **Impact.** If not, Flow UI would have to bundle an empty Java class.
- **Result.** Verified with OIE 4.7.0 and Web Support 1.3.0: a `plugin.xml` without
  classes or libraries is accepted, and `/api/extensions/websupport/webplugins` lists
  `flow-ui`. Flow UI stays Java-free.

### WS-02

**Plugin UIs absent without Web Support.** · Minor · Open

- **Finding.** Without Web Support (nor native engine endpoints), Web Admin loads no
  plugin UI served by the engine.
- **Evidence.** `core/platform.js`, `fetchEngineManifests`.
- **Impact.** Web Support is a prerequisite for Flow UI; to be documented in the README.

## Role Based Access Control 1.3.0

### RB-01

**Unknown task allowed; no plugin-specific permission without Java.** · Inconvenient · Worked around

- **Finding.** `checkTask` returns `true` for a task absent from its tables. A
  plugin-specific permission must be declared server-side (Java extension permissions)
  and returned via `/extensions/rbac/permissions/extensions`.
- **Evidence.** `rbac/webadmin/web/plugin.js`, `checkTask` (`if (required == null) return true`).
- **Impact.** Flow UI, without Java, cannot have a "View Flows" permission; inventing
  a task name would effectively allow everything.
- **Workaround.** Reuse native tasks (`doShowDashboard`, `doShowChannel`,
  `doShowMessages`, `doEditChannel`).
- **Upstream request.** Permissions declared in `plugin.json` in Web Admin, or default
  denial for an unknown task prefixed by a plugin id.

### RB-02

**Transient denial until permissions are loaded.** · Minor · To verify

- **Finding.** While permissions are not yet loaded, `checkTask` returns `false` and
  triggers a reload. No public event notifies plugins when they arrive.
- **Evidence.** `rbac/webadmin/web/plugin.js`, `checkTask` (`permissions == null`).
- **Impact.** A button evaluated too early could stay hidden until the next render.
- **Workaround.** Evaluate permissions on render, never once and for all; verify in the
  demo.

### RB-03

**Links inside plugin views not covered.** · Minor · Worked around

- **Finding.** RBAC hides menu entries, task buttons and actions tagged with a task.
  Links drawn by a plugin view are not affected.
- **Evidence.** Mapper: *Edit* shown without `manageChannels`, editor replies *Access
  denied*.
- **Workaround.** Every link and action checks `platform.checkTask` (plan §3.5).

### RB-04

**Role import format undocumented.** · Minor · Worked around

- **Finding.** `POST /api/extensions/rbac/roles/_import` exists (options `dryRun`,
  `applyChannels`, `matchChannelsByName`); the file format has to be inferred from an
  export.
- **Impact.** Demo initialization (roles and accounts).
- **Workaround.** The demo creates roles one by one via `POST
  /api/extensions/rbac/roles` (`com.diridium.rbac.Role` XML, format read from plugin
  code), without using import.

### RB-05

**Authorization plugin failure: all plugins blocked.** · Minor · Open

- **Finding.** If RBAC fails to load, Web Admin blocks all permission checks and
  registration of other plugins.
- **Evidence.** `core/platform.js` (mandatory authorization plugin, `blockAuthorization`).
- **Impact.** Intended security behaviour, but Flow UI disappears along with it. Mention
  in troubleshooting.

### RB-06

**Restriction by channel list, not by group.** · Inconvenient · Open

- **Finding.** A restricted role lists channels one by one. There is no "all channels
  in group X" restriction.
- **Evidence.** Database schema: `rbac_role.restricted` and
  `rbac_role_channel (role_id, channel_id)`, with no reference to groups.
- **Impact.** A "laboratory viewer" role does not track the group: a channel later
  added to the *Laboratory* group stays invisible until added to the role. In the demo,
  the `lab-viewer` role is frozen at dump time.
- **Workaround.** None in Flow UI; documented in the demo guide.
- **Upstream request.** Restriction by channel group, evaluated on each request.

### RB-07

**Another user's preferences readable and writable.** · Security · Reported

- **Finding.** With RBAC 1.3.0, a user with a restricted role (without `manageUsers`)
  can read and modify any account's preferences, including the administrator's: `GET`
  and `PUT /api/users/{id}/preferences/...` return 200 and 204 for another `id`.
- **Evidence.** Demo, `lab-viewer` account (*Laboratory viewer* role): wrote
  `flowui.settings` on user 1, read back from database table `person_preference`.
- **Impact.** None for Flow UI, which only writes the signed-in user's preferences.
  However, a user can alter another user's settings (Web Admin also stores its
  preferences there, including `firstlogin`).
- **Workaround.** None in the plugin.
- **Cause.** The engine declares no permission on `getUserPreferences`,
  `getUserPreference`, `setUserPreferences`, `setUserPreference` and
  `userNotificationAcknowledged`; for another user's id, it delegates the decision to
  the authorization controller (`checkUserAuthorized(userId, false)`).
  `RbacAuthorizationController` does not know these operations and allows them
  ("unknown operation -> allow").
- **Upstream request.** Map these operations to `manageUsers` in RBAC; give them a
  permission on the engine side. Reported:
  [diridium-com/role-based-access-control#55](https://github.com/diridium-com/role-based-access-control/issues/55).

## Open Integration Engine 4.7.0

### OIE-01

**`waitForPrevious` always `false` in statuses.** · Inconvenient · Worked around

- **Finding.** Dashboard statuses (`/api/channels/statuses`) always report
  `waitForPrevious = false` for destinations.
- **Evidence.** Observed during mapper v2.
- **Impact.** Destination chains have to come from the full channel configuration,
  which is expensive with many channels. A user without `viewChannels` cannot read it:
  for them, chains are unknown.
- **Workaround.** Configuration read on load and on *Refresh* only. Without
  `viewChannels`, Flows Monitoring shows destinations in order, on one line, without
  *then* arrows, and says so (*Chains hidden*). Same for groups without
  `viewChannelGroups` (*Groups hidden*, one list).
- **Upstream request.** Populate `waitForPrevious` in `DashboardStatus`.

### OIE-02

**Statuses limited to deployed connectors.** · Minor · Worked around

- **Finding.** Disabled destinations do not appear in statuses.
- **Impact.** Flows Monitoring does not show them, whereas Channel Flow draws them.
- **Workaround.** Intentional and documented: Flows Monitoring shows what is running.

### OIE-03

**Queued outside the statistics map.** · Minor · Worked around

- **Finding.** *Queued* is a separate field (`queued`), not an entry in `statistics`;
  statistics exist in current and `lifetimeStatistics` versions.
- **Workaround.** Reading centralized in `shared/model/stats.js`.

### OIE-04

**No statistics history.** · Inconvenient · To verify

- **Finding.** The API appears to expose only cumulative counters, with no time series.
- **Impact.** Throughput or trends only by browser-side sampling, lost on reload.
- **Workaround.** No trends in v1; to reconsider.

### OIE-05

**`X-Requested-With` required on all API endpoints.** · Minor · Worked around

- **Finding.** Every `/api` request must carry `X-Requested-With`. A browser `import()`
  cannot attach it, hence the `blob:` loading in [WA-08](#wa-08).
- **Workaround.** Not applicable to Flow UI beyond the single bundle; demo scripts send
  the header.

### OIE-06

**Irregular REST responses.** · Minor · Worked around

- **Finding.** `GET /channels/{id}` for a missing channel: HTTP 204 with empty body.
  `POST /channels/{id}/_deploy?returnErrors=true`: empty body on success. Some refusals
  respond HTTP 200 with `<boolean>false</boolean>`.
- **Evidence.** `demo/oie-init/init-channels.sh` in the mapper.
- **Workaround.** Init helper functions handle all three cases.

### OIE-07

**First-login wizard must be disabled via API.** · Minor · Worked around

- **Finding.** Until an account's `firstlogin` preference is `false`, Web Admin forces a
  password change.
- **Workaround.** Init writes `PUT /users/{id}/preferences/firstlogin` = `false`.

### OIE-08

**Docker image built from source.** · Minor · To verify

- **Finding.** The mapper demo builds OIE 4.7.0 from the repository (slow Gradle
  build). Existence of an official published image to verify.
- **Workaround.** `OIE_ENGINE_IMAGE` to reuse an already built image.

### OIE-09

**Restart required after installing an extension.** · Minor · Open

- **Impact.** Testing a new plugin version outside the demo requires restarting the
  engine. The demo rebuilds the image.

### OIE-10

**API JARs missing from Maven Central.** · Minor · Open

- **Finding.** Engine JARs have to be extracted from an installation or the image.
- **Impact.** None while Flow UI remains Java-free; revisit if [WS-01](#ws-01)
  requires a Java class.

### OIE-11

**Message sent via API: no default destination.** · Inconvenient · Worked around

- **Finding.** `POST /api/channels/{id}/messages` without a `destinationMetaDataId`
  parameter processes the message in the source only: it is counted as *Received* but
  reaches no destination. Nothing in the response warns about it.
- **Evidence.** Demo: 23 messages sent to `BILL · Claims to insurer` stayed at
  *Transformed* in the source; with `?destinationMetaDataId=1`, the message arrives in
  the destination queue.
- **Workaround.** The demo script passes the list of active destinations of each
  channel (`seed/generated/messages.txt`).
- **Upstream request.** Document this behaviour, or send to all destinations by default
  like the administrator's *Send Message* dialog.

### OIE-12

**Stopping a destination without queue: "done", but nothing happens.** · Inconvenient · Worked around

- **Finding.** `POST /api/channels/{id}/connector/{n}/_stop` on a destination whose
  queue is disabled returns 204, even with `returnErrors=true`, yet the destination
  stays started. The refusal only appears in the server log: "Destination connectors
  must have queueing enabled to be stopped individually".
- **Evidence.** Demo, *Laboratory (LIS)* destination of *LAB · Orders to LIS (ORM)*.
- **Workaround.** Flows Monitoring only offers stopping a destination when its queue
  is enabled (`queueEnabled` in status); otherwise its card has no stop button. After
  each command, statuses are re-read: if the state did not change, a toast says so.
- **Upstream request.** Return an error (HTTP 4xx, or the message when
  `returnErrors=true`) when the stop is refused.
- **Also worth knowing.** Stopping the source pauses the channel (`PAUSED`); starting it
  again returns it to `STARTED`.
