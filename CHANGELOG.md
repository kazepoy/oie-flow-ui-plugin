# Changelog

## 0.8.6 (2026-11-15)

- **Internationalization**: added the bundled French translation catalog
  (`src/i18n/locales/fr.js`) and a live language selector (**Browser language** /
  **English** / **Français**) under **Manage › Settings › Flow UI** (*Interface ›
  Language*) and each screen's ⚙ menu, persisted per browser in `localStorage`
  without marking server defaults dirty.
- **Demo**: renamed the `traffic` service and script (`demo/examples/traffic.sh`)
  to `message-gun` (`demo/examples/message-gun.sh`).
- **Documentation & tests**: noted in `README.md` that the plugin is in
  development (pre-1.0); refreshed all documentation screenshots at 100% zoom
  with expanded groups and updated *Settings* / *Channel Flow* captures; sped up
  `npm run test:e2e` by sharing one browser instance across isolated sessions
  and replacing fixed viewport sleeps with explicit DOM waits.

## 0.8.5 (2026-11-14)

- **Demo**: relaxed OIE password minimum length in `demo/compose.yaml`
  (`_MP_PASSWORD_MINLENGTH: "0"`) and switched the default password for all
  demo accounts (`admin`, `lab-viewer`, `ops`, `integrator`, `auditor`), REST
  init, traffic, examples, E2E tests and documentation to `admin`.

## 0.8.4 (2026-11-14)

- **Settings**: added server-wide defaults under **Manage › Settings › Flow UI**
  stored in OIE extension properties (`extensions/Flow UI/properties`) with
  *Refresh*, *Save* and *Restore Defaults* actions and native *Backup Config* /
  *Restore Config* synchronization, layered under sparse per-user overrides
  (`flowui.settings`). Serialized all server defaults so *Restore Config*
  restores default values as well.
- **Demo**: replaced the pre-built PostgreSQL dump and `seed/` generator with
  REST API initialization (`demo/oie-init/init-channels.sh` and native XML/text
  files under `demo/oie-init/data/`) creating users first, simplified to 12
  step-rich channels in 4 groups with per-step timing traces and automatic
  continuous `traffic` once initialization completes.
- **Documentation**: updated [plan.md](doc/plan.md),
  [platform-limits.md](doc/platform-limits.md), [TODO.md](doc/TODO.md),
  [demo/README.md](demo/README.md) and [README.md](README.md).

## 0.8.3 (2026-11-13)

- **Channel Flow**: channel picker redesigned with channel cards grouped by
  collapsible channel group, colored channel tags, and a filter bar by channel
  name and tag.
- **Flows Monitoring**: colored channel tags displayed when *Details* is
  checked, and text filter matches both channel names and tag names.
- Demo: 8 sample channel tags seeded in the database dump, with RBAC `viewTags`
  granted to *Operations* and *Integrator*.

## 0.8.2 (2026-11-13)

- **Channel Flow**: minimap in the bottom-right corner when a diagram overflows
  the viewport, with click/drag navigation, close button and a *Minimap* setting
  to reopen or disable it.
- **Flows Monitoring**: all groups open by default and *Details* unchecked by
  default.
- Documentation: [platform-limits.md](doc/platform-limits.md) translated into
  English.

## 0.8.1 (2026-11-11)

- **Channel Flow**: a click on a script (Deploy, Undeploy, Preprocessor,
  Postprocessor), a connector or a step now opens that script, that destination
  or that step in the editor, instead of the *Summary* tab or the first step. If
  the editor's controls cannot be reached, a message says where to click.
- Demo: one password for every account, `demo-oie-password`, as in the FHIR
  Profile Mapper demo.

## 0.8.0 (2026-11-11)

First version, rebuilt from the Flow and Flows screens of the FHIR Profile Mapper.

- **Flows Monitoring** (Monitor): deployed channels by group, one row per channel,
  counters per connector opening Messages; groups closed except the first; filter,
  Lifetime, state kept for the session; channel links (Channel Writer → Channel
  Reader) with a *Links* option; connector type and address with a *Details* option; start, pause, resume and stop channels and
  connectors (with confirmation before a stop, RBAC startStopChannels).
- **Channel Flow** (Design): saved channel diagram in three views (Line, Columns,
  Bands, Auto), computed layout, zoom and move with trackpad, mouse and keyboard,
  view kept for the session; steps shown per tile set by the user; channel picker;
  *Show flow* in the channel list; **Flow** tab of the channel editor on the draft,
  with `+` to add a step.
- Standard mouse wheel in Channel Flow: the wheel moves, Ctrl/⌘ + wheel zooms.
- User settings saved in the OIE user preferences, from each screen's gear button
  (that screen's settings) or Manage › Settings › Flow UI; contextual help; i18n ready.
- RBAC: every link and action follows the user's rights.
- No Java code; only the public plugin API of Web Admin 1.3.
- Demo: hospital integration platform (19 channels, 8 groups, 5 accounts) loaded
  from a database dump, optional continuous traffic.
