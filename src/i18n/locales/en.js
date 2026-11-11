// SPDX-License-Identifier: MPL-2.0
// English, the reference catalog: every key exists here. Other languages may
// leave keys out; they fall back to English (see ../index.js and doc/i18n.md).
// {name} is replaced by a parameter; an object of plural forms (one, other…)
// is chosen with the `count` parameter.
export default {
  common: {
    help: "Help",
    loading: "Loading…",
    dismissHint: "Hide this hint"
  },

  status: {
    RECEIVED: "Received",
    FILTERED: "Filtered",
    QUEUED: "Queued",
    SENT: "Sent",
    ERROR: "Errored"
  },

  state: {
    STARTED: "started",
    STARTING: "starting",
    STOPPED: "stopped",
    STOPPING: "stopping",
    PAUSED: "paused",
    PAUSING: "pausing",
    DEPLOYING: "deploying",
    UNDEPLOYING: "undeploying",
    UNDEPLOYED: "undeployed",
    SYNCING: "syncing",
    UNKNOWN: "unknown",
    null: "unknown"
  },

  settings: {
    title: "Settings",
    titleOf: "{screen} settings",
    panelLabel: "Flow UI",
    panelIntro: "Your own settings for Flows Monitoring and Channel Flow. They follow you from one browser to another and apply at once. Each screen also has them under its gear button.",
    alsoInSettings: "Also in Manage › Settings › Flow UI.",
    savedLocally: "Your Flow UI settings could not be saved on the server. They are kept in this browser only.",
    showHints: "Show the hints again",
    expandedGroups: {
      label: "Open groups",
      first: "The first group",
      all: "All groups",
      none: "None"
    },
    visibleSteps: {
      label: "Steps shown per tile",
      3: "3, then “+N more”",
      5: "5, then “+N more”",
      8: "8, then “+N more”",
      0: "All"
    },
    refreshSeconds: {
      label: "Refresh counters",
      5: "Every 5 seconds",
      10: "Every 10 seconds",
      30: "Every 30 seconds",
      60: "Every minute",
      0: "Only with Refresh"
    },
    defaultLayout: {
      label: "Default view",
      auto: "Auto",
      line: "Line",
      columns: "Columns",
      bands: "Bands"
    }
  },

  flows: {
    title: "Flows Monitoring",
    totalsLabel: "Totals of the channels shown",
    filter: "Filter channels",
    lifetime: "Lifetime",
    lifetimeTitle: "Counters since the channels were created, instead of since their statistics were last reset",
    links: "Links",
    linksTitle: "Show which channels send to which (Channel Writer → Channel Reader)",
    control: {
      group: "Start, pause or stop {name}",
      start: "Start {name}",
      resume: "Resume {name}",
      pause: "Pause {name}: the source stops receiving, destinations keep sending",
      stop: "Stop {name}",
      startConnector: "Start {name}",
      stopConnector: "Stop {name}",
      confirm: {
        stop: { title: "Stop the channel?", message: "{name} stops receiving and sending messages until it is started again.", ok: "Stop" },
        stopConnector: { title: "Stop the connector?", message: "{name} stops until it is started again. The rest of the channel keeps running.", ok: "Stop" }
      },
      done: {
        start: "{name} started",
        resume: "{name} resumed",
        pause: "{name} paused",
        stop: "{name} stopped",
        startConnector: "{name} started",
        stopConnector: "{name} stopped"
      },
      failed: "{name} could not change state: {error}"
    },
    link: {
      to: "Sends to {name}",
      from: "Called by {name}",
      unknown: "another channel",
      show: "Show {name}",
      hidden: "A channel you cannot see, or not deployed"
    },
    expandAll: "Open all groups",
    collapseAll: "Close all groups",
    refresh: "Refresh",
    refreshTitle: "Reload groups, chains and counters",
    updated: "Updated {time}",
    refreshFailed: "Refresh failed: {error}",
    empty: {
      none: "No deployed channels",
      noneHelp: "Deploy a channel to see its flow and counters here.",
      filtered: "No channel matches the filter"
    },
    group: {
      default: "Default Group",
      all: "Channels",
      unreadable: "Groups hidden",
      unreadableTitle: "Your role may not read channel groups (permission viewChannelGroups): channels are shown in one list.",
      channels: { one: "{count} channel", other: "{count} channels" },
      totals: "Totals of {name}"
    },
    totals: {
      RECEIVED: "received",
      FILTERED: "filtered",
      QUEUED: "queued",
      SENT: "sent",
      ERROR: "errored"
    },
    counter: {
      open: "{status}: {count}. Opens the messages of {where}.",
      value: "{status}: {count}"
    },
    card: {
      source: "Source",
      destination: "D{id}",
      openMessages: "Open the messages of {where}"
    },
    channel: {
      openMessages: "Open the messages of {name}",
      flow: "Flow",
      flowTitle: "Show the flow of this channel",
      edit: "Edit",
      editTitle: "Edit this channel"
    },
    chain: {
      then: "then",
      waitsFor: "Waits for D{id}",
      unknown: "Chains hidden",
      unknownTitle: "Your role may not read channel configurations (permission viewChannels): destinations are shown in order, without their chains.",
      none: "No destinations"
    },
    help: {
      reading: "Reading a row",
      row: "Each row is a deployed channel, read from left to right: the channel, its source, then its destinations.",
      then: "The next destination waits for the previous one (same chain).",
      parallel: "Chains receive the message in parallel.",
      links: "With Links: the channel a Channel Writer sends to (→), or the channels that call this one (←). A click shows that channel.",
      counters: "Counters",
      status: {
        RECEIVED: "Received by the source, or sent by a destination.",
        FILTERED: "Stopped by a filter.",
        QUEUED: "Waiting in the queue to be sent again.",
        ERROR: "Failed in this connector."
      },
      cards: "Cards",
      cardError: "This connector has errors.",
      cardQueued: "This connector has queued messages.",
      cardStopped: "This connector is stopped or paused.",
      clicks: "Clicks",
      clickCounter: "A card or a counter opens Messages on that connector. The channel name opens Messages for the whole channel.",
      noStatusFilter: "Messages opens filtered on the connector (see \"Current Search\": the Connector field still says Any). It cannot be opened on one status yet: choose it in its Status filter."
    }
  },

  channelFlow: {
    title: "Channel Flow",
    tab: "Flow",
    action: "Show flow",
    actionTitle: "Show how messages move through this channel",
    layout: "View",
    layoutTitle: {
      line: "Everything reads left to right. For channels with few destinations.",
      columns: "Top to bottom, one column per chain. For several short chains.",
      bands: "Source, destinations and postprocessing in three bands, one block per line. For many destinations or long chains."
    },
    autoTitle: "Chooses the view from the shape of the channel (now: {layout})",
    hint: "Pinch or ⌘/Ctrl + wheel to zoom · wheel, two fingers or drag to move",
    zoom: "Zoom",
    zoomIn: "Zoom in (+)",
    zoomOut: "Zoom out (−)",
    fit: "Fit",
    fitTitle: "Show the whole diagram (0)",
    startTitle: "Actual size, from the start of the flow (1)",
    diagram: "Flow of {name}",
    diagramRole: "diagram",
    breadcrumb: "Location",
    saved: "Saved version",
    savedTitle: "The diagram shows the channel as saved. The Flow tab of the channel editor shows unsaved changes.",
    unsavedDraft: "Unsaved changes in the editor",
    edit: "Edit channel",
    messages: "Messages",
    notFound: "This channel does not exist or you may not see it.",
    loadFailed: "The channel could not be loaded",
    picker: {
      intro: "Choose a channel to see how a message moves through it.",
      filter: "Find a channel",
      failed: "The channels could not be loaded",
      noMatch: "No channel matches",
      none: "No channels"
    },
    sender: {
      external: "Sender",
      polled: "Polled",
      channel: "Calling channel"
    },
    band: {
      source: "Source processing",
      destinations: "Destination processing",
      postprocessing: "Postprocessing & response"
    },
    note: {
      noDestinations: "No destinations",
      chain: "Chain {number}",
      chainParallel: "Chain {number} · in parallel"
    },
    block: {
      source: "Source",
      destination: "Destination {id}",
      channel: "Channel",
      lifecycle: "Lifecycle",
      postprocessing: "Postprocessing",
      disabled: "Disabled"
    },
    tile: {
      connector: "Connector",
      attachments: "Attachments",
      preprocessor: "Preprocessor",
      filter: "Filter",
      transformer: "Transformer",
      response: "Response",
      deploy: "Deploy",
      undeploy: "Undeploy",
      postprocessor: "Postprocessor",
      reply: "Response to sender"
    },
    empty: {
      filter: "No rules · accepts all",
      transformer: "No steps",
      response: "No steps",
      script: "No script"
    },
    scriptSet: "Script set",
    reply: {
      none: "No response",
      destination: "Destination {id} · {name}",
      map: "Response map · {name}",
      after: "after processing",
      before: "before processing"
    },
    edge: {
      waitsFor: "waits for D{id}",
      disabled: "disabled",
      parallel: "in parallel",
      replied: "response returned"
    },
    step: {
      disabled: "{name} (disabled)"
    },
    more: "+{count} more",
    stepList: {
      rules: { one: "{what} · {count} rule", other: "{what} · {count} rules" },
      steps: { one: "{what} · {count} step", other: "{what} · {count} steps" }
    },
    open: "Open {what} · {where}",
    openConnector: "Open the connector of {where}",
    add: "Add to {what}",
    addTo: "Add to {what} · {where}",
    added: "Added {type} to {what} · {where}. Save the channel to keep it.",
    addFailed: "The step could not be added: {error}",
    noStepTypes: "No step types available",
    openTab: {
      source: "Open the Source tab to edit the source connector.",
      destination: "Open the Destinations tab, destination {id}, to edit this connector.",
      script: "Open the Scripts tab, {script}, to edit this script.",
      attachments: "Open the Summary tab to edit the attachments."
    },
    help: {
      reading: "Reading the diagram",
      blocks: "A message enters on the left (or at the top), goes through the source, then through each chain of destinations. Chains receive it in parallel.",
      arrow: {
        message: "Path of the message.",
        wait: "The destination waits for the previous one.",
        reply: "Response returned to the sender.",
        off: "Disabled destination: it receives nothing."
      },
      saved: "From the Design menu, the diagram shows the saved channel. In the channel editor, its Flow tab shows your unsaved changes.",
      moving: "Moving around",
      device: {
        trackpadMove: "Trackpad",
        pinch: "Trackpad",
        wheel: "Mouse",
        drag: "Mouse"
      },
      gesture: {
        trackpadMove: "Two fingers move the diagram.",
        pinch: "Pinch to zoom.",
        wheel: "The wheel moves; Shift + wheel moves sideways; ⌘/Ctrl + wheel zooms.",
        drag: "Drag the background to move. Space + drag works anywhere.",
        arrows: "Move.",
        zoomKeys: "Zoom in and out.",
        fitKey: "Show the whole diagram.",
        startKey: "Actual size, from the start of the flow."
      },
      clicks: "Clicks",
      clickOpen: "A block or a tile opens its editor. A step opens its filter or transformer. + adds a step, in the channel editor's Flow tab.",
      clickLimits: "Web Admin cannot open a given step, editor tab or destination yet: the editor opens on its first page."
    }
  }
};
