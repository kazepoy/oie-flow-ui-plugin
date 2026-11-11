# OIE Flow UI

A plugin for the [Open Integration Engine](https://github.com/OpenIntegrationEngine/engine)
web administrator that shows how messages move through channels.

> **Status: planning.** No code yet. See the [project plan](doc/plan.md).

## Screens

| Screen | Menu | What it shows |
|---|---|---|
| **Flows Monitoring** | Monitor | Deployed channels by group, one row per channel, with message counters for each connector. A counter opens Messages on that connector. |
| **Channel Flow** | Design | A zoomable diagram of one channel: source, destination chains, postprocessing and response. Each component opens its editor. |

Both screens work with the Role Based Access Control plugin: they only show
what the user's role allows.

The interface is in English and ready for translation.

## Goal

The ultimate goal is for these features to become **native in OIE Web Admin**.

The plugin is a place to build and validate them first. It therefore uses only
the public plugin API of Web Admin, without workarounds, so that the code can be
moved into Web Admin later. When that API falls short, the plugin offers a
simpler behaviour and the gap is recorded as a request for Web Admin
([platform limits](doc/limites-plateforme.md)).

## Origin

I first wrote Flow and Flows quickly, by vibe coding, inside my
[FHIR Profile Mapper](https://github.com/kazepoy/oie-fhir-profile-mapper-plugin)
plugin, although they have nothing to do with FHIR. The reason was the
ergonomics inherited from Mirth Connect, which I find neither intuitive nor
suited to daily use: channels are hard to read at a glance, and the design looks
like Windows XP.

That first version worked but was not built to last. This project extracts the
two screens and rebuilds them properly as a standalone plugin.

## Requirements

- Open Integration Engine 4.7.0
- [Web Support](https://github.com/gibson9583/oie-web-support-plugin) 1.3.0
  (Web Admin 1.3.0)
- Optional: [Role Based Access Control](https://github.com/diridium-com/role-based-access-control) 1.3.0

## Try it (planned)

A Docker demo will start OIE with the required plugins, sample channels and
preloaded message counters:

```sh
cd demo
docker compose up -d --build
```

## Documentation

Detailed documentation is in French:

- [Project plan](doc/plan.md)
- [Platform limits](doc/limites-plateforme.md): gaps in OIE, Web Admin and RBAC
  that affect this plugin

## License

[Mozilla Public License 2.0](https://mozilla.org/MPL/2.0/) (proposed, see the plan).
