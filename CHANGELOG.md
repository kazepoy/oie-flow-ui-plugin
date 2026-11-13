# Changelog

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
