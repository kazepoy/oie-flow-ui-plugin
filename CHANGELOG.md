# Changelog

## 0.1.0 (not released)

First version, rebuilt from the Flow and Flows screens of the FHIR Profile Mapper.

- **Flows Monitoring** (Monitor): deployed channels by group, one row per channel,
  counters per connector opening Messages; groups closed except the first; filter,
  Lifetime, state kept for the session; channel links (Channel Writer → Channel
  Reader) with a *Links* option; start, pause, resume and stop channels and
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
