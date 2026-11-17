// SPDX-License-Identifier: MPL-2.0
// French translation catalog. Keys missing here fall back to English (en.js).
export default {
  common: {
    help: "Aide",
    loading: "Chargement…",
    dismissHint: "Masquer cet indice"
  },

  status: {
    RECEIVED: "Reçus",
    FILTERED: "Filtrés",
    QUEUED: "En file",
    SENT: "Envoyés",
    ERROR: "Erreurs"
  },

  state: {
    STARTED: "démarré",
    STARTING: "démarrage",
    STOPPED: "arrêté",
    STOPPING: "arrêt",
    PAUSED: "en pause",
    PAUSING: "mise en pause",
    DEPLOYING: "déploiement",
    UNDEPLOYING: "retrait",
    UNDEPLOYED: "non déployé",
    SYNCING: "synchronisation",
    UNKNOWN: "inconnu",
    null: "inconnu"
  },

  settings: {
    title: "Réglages",
    titleOf: "Réglages · {screen}",
    panelLabel: "Flow UI",
    tasksTitle: "Tâches Flow UI",
    panelIntro: "Réglages serveur par défaut pour Suivi des flux et Flux du canal, inclus dans Backup Config et Restore Config d’OIE. Cliquer sur Enregistrer dans Tâches Flow UI pour appliquer. Chaque utilisateur peut aussi surcharger les réglages localement depuis le bouton engrenage d’un écran.",
    alsoInSettings: "Préférence personnelle · valeurs serveur par défaut dans Manage › Settings › Flow UI.",
    savedLocally: "Vos réglages Flow UI n’ont pas pu être enregistrés sur le serveur. Ils sont conservés uniquement dans ce navigateur.",
    saved: "Réglages Flow UI enregistrés",
    saveFailed: "Échec de l’enregistrement : {error}",
    loadTitle: "Impossible de charger les réglages Flow UI",
    loadFailed: "Échec du chargement des réglages Flow UI : {error}",
    noReadPermission: "Vous n’avez pas la permission d’afficher les réglages Flow UI.",
    refreshTitle: "Abandonner les modifications non enregistrées ?",
    refreshConfirm: "Recharger les réglages depuis le serveur et abandonner vos modifications non enregistrées ?",
    showHints: "Réafficher les indices",
    resetOverrides: "Réinitialiser les surcharges personnelles aux défauts serveur",
    resetBrowser: "Réinitialiser les paramètres du navigateur",
    resetBrowserTitle: "Effacer la langue, les surcharges personnelles, les indices masqués et les filtres enregistrés",
    resetBrowserDone: "Paramètres du navigateur réinitialisés",
    task: {
      refresh: "Actualiser",
      save: "Enregistrer",
      restoreDefaults: "Valeurs par défaut",
      restoreDefaultsTitle: "Rétablir les valeurs par défaut du plugin dans le formulaire (cliquer sur Enregistrer pour appliquer)",
      resetBrowser: "Réinit. navigateur"
    },
    expandedGroups: {
      label: "Groupes ouverts",
      first: "Le premier groupe",
      all: "Tous les groupes",
      none: "Aucun"
    },
    visibleSteps: {
      label: "Étapes affichées par bloc",
      3: "3, puis « +N autres »",
      5: "5, puis « +N autres »",
      8: "8, puis « +N autres »",
      0: "Toutes"
    },
    refreshSeconds: {
      label: "Actualiser les compteurs",
      5: "Toutes les 5 secondes",
      10: "Toutes les 10 secondes",
      30: "Toutes les 30 secondes",
      60: "Toutes les minutes",
      0: "Uniquement sur Actualiser"
    },
    defaultLayout: {
      label: "Vue par défaut",
      auto: "Auto",
      line: "Ligne",
      columns: "Colonnes",
      bands: "Bandes"
    },
    minimap: {
      label: "Mini-carte",
      auto: "Si nécessaire",
      off: "Masquée"
    },
    interface: {
      title: "Interface"
    },
    language: {
      label: "Langue",
      auto: "Langue du navigateur",
      en: "English",
      fr: "Français",
      note: "Appliquée immédiatement dans ce navigateur ; non incluse dans les défauts du serveur."
    }
  },

  flows: {
    title: "Suivi des flux",
    mode: {
      label: "Vue",
      rows: "Lignes",
      rowsTitle: "Canaux et leurs connecteurs, une ligne par canal",
      links: "Carte des liens",
      linksTitle: "Graphe des liens Channel Writer → Channel Reader entre groupes"
    },
    totalsLabel: "Totaux des canaux affichés",
    filter: "Filtrer les canaux",
    filterWithTags: "Filtrer canaux et tags",
    lifetime: "Depuis création",
    lifetimeTitle: "Compteurs depuis la création des canaux, au lieu de la dernière remise à zéro des statistiques",
    details: "Détails",
    detailsTitle: "Afficher le type et l’adresse de chaque connecteur ainsi que les tags des canaux",
    links: "Liens",
    linksTitle: "Afficher quels canaux appellent lesquels (Channel Writer → Channel Reader)",
    stoppedOnly: "En pause / arrêtés",
    stoppedOnlyTitle: "N’afficher que les canaux en pause/arrêtés ou ayant un connecteur en pause/arrêté",
    control: {
      group: "Démarrer, suspendre ou arrêter {name}",
      start: "Démarrer {name}",
      resume: "Reprendre {name}",
      pause: "Suspendre {name} : la source cesse de recevoir, les destinations continuent d’envoyer",
      stop: "Arrêter {name}",
      startConnector: "Démarrer {name}",
      stopConnector: "Arrêter {name}",
      confirm: {
        stop: { title: "Arrêter le canal ?", message: "{name} cesse de recevoir et d’envoyer des messages jusqu’à son redémarrage.", ok: "Arrêter" },
        stopConnector: { title: "Arrêter le connecteur ?", message: "{name} reste arrêté jusqu’à son redémarrage. Le reste du canal continue de tourner.", ok: "Arrêter" }
      },
      done: {
        start: "{name} démarré",
        resume: "{name} repris",
        pause: "{name} suspendu",
        stop: "{name} arrêté",
        startConnector: "{name} démarré",
        stopConnector: "{name} arrêté"
      },
      failed: "{name} n’a pas pu changer d’état : {error}",
      unchanged: "{name} n’a pas changé d’état. Le journal serveur peut en indiquer la raison."
    },
    link: {
      to: "Envoie vers {name}",
      from: "Appelé par {name}",
      unknown: "un autre canal",
      show: "Afficher {name}",
      hidden: "Canal non visible ou non déployé"
    },
    expandAll: "Tout déplier",
    collapseAll: "Tout replier",
    refresh: "Actualiser",
    refreshTitle: "Recharger les groupes, chaînes et compteurs",
    updated: "Mis à jour à {time}",
    refreshFailed: "Échec de l’actualisation : {error}",
    empty: {
      none: "Aucun canal déployé",
      noneHelp: "Déployez un canal pour voir son flux et ses compteurs ici.",
      filtered: "Aucun canal ne correspond au filtre"
    },
    group: {
      default: "Groupe par défaut",
      all: "Canaux",
      unreadable: "Groupes masqués",
      unreadableTitle: "Votre rôle ne permet pas de lire les groupes de canaux (permission viewChannelGroups) : les canaux sont regroupés dans une seule liste.",
      channels: { one: "{count} canal", other: "{count} canaux" },
      totals: "Totaux de {name}"
    },
    totals: {
      RECEIVED: "reçus",
      FILTERED: "filtrés",
      QUEUED: "en file",
      SENT: "envoyés",
      ERROR: "en erreur"
    },
    counter: {
      open: "{status} : {count}. Ouvre les messages de {where}.",
      value: "{status} : {count}"
    },
    card: {
      source: "Source",
      destination: "D{id}",
      openMessages: "Ouvrir les messages de {where}"
    },
    channel: {
      openMessages: "Ouvrir les messages de {name}",
      flow: "Flux",
      flowTitle: "Afficher le diagramme de ce canal"
    },
    chain: {
      then: "puis",
      waitsFor: "Attend D{id}",
      unknown: "Chaînes masquées",
      unknownTitle: "Votre rôle ne permet pas de lire les configurations des canaux (permission viewChannels) : les destinations sont affichées dans l’ordre, sans leurs chaînes.",
      none: "Aucune destination"
    },
    help: {
      reading: "Lire une ligne",
      row: "Chaque ligne correspond à un canal déployé, lu de gauche à droite : le canal, sa source, puis ses destinations.",
      then: "La destination suivante attend la fin de la précédente (même chaîne).",
      parallel: "Les chaînes reçoivent le message en parallèle.",
      links: "Avec Liens : le canal vers lequel envoie un Channel Writer (→), ou ceux qui appellent ce canal (←). Un clic met ce canal en évidence.",
      linksMap: "Carte des liens",
      linksMapBody: "Dessine le graphe des liens Channel Writer → Channel Reader entre groupes. Cliquez sur une carte pour mettre en évidence ses appels amont et aval.",
      details: "Avec Détails : le type et l’adresse du connecteur.",
      counters: "Compteurs",
      status: {
        RECEIVED: "Reçus par la source ou envoyés par une destination.",
        FILTERED: "Arrêtés par un filtre.",
        QUEUED: "En file d’attente pour une nouvelle tentative d’envoi.",
        ERROR: "En échec dans ce connecteur."
      },
      cards: "Cartes",
      cardError: "Ce connecteur contient des erreurs.",
      cardQueued: "Ce connecteur a des messages en file d’attente.",
      cardStopped: "Ce connecteur est arrêté ou en pause.",
      clicks: "Clics",
      clickCounter: "Une carte ou un compteur ouvre Messages filtré sur ce connecteur. Le nom du canal ouvre Messages pour tout le canal.",
      noStatusFilter: "Messages s’ouvre filtré sur le connecteur (voir « Current Search » : le champ Connector affiche encore Any). Le filtre par statut ne peut pas encore être pré-rempli : choisissez-le dans son menu Status."
    },
    linksGraph: {
      linkedOnly: "Liés uniquement",
      linkedOnlyTitle: "N’afficher que les canaux impliqués dans un lien Channel Writer → Channel Reader",
      showAll: "Afficher tous les canaux",
      clearFocus: "Réinitialiser le focus",
      clearFocusTitle: "Réafficher tous les liens sans mise en évidence (Échap)",
      showInRows: "Voir dans Lignes",
      showInRowsTitle: "Revenir sur la vue Lignes centrée sur {name}",
      focusChain: "Mettre en évidence la chaîne",
      diagramLabel: "Carte des liens entre canaux",
      emptyNoLinks: "Aucun lien entre les canaux visibles",
      emptyNoLinksHelp: "Aucun lien Channel Writer ne correspond au filtre actuel, ou les canaux déployés ne sont pas reliés entre eux.",
      emptyUnreadable: "Liens entre canaux masqués",
      emptyUnreadableHelp: "Votre rôle ne permet pas de lire les configurations des canaux (permission viewChannels) : les liens Channel Writer → Channel Reader ne peuvent pas être inspectés.",
      hiddenTarget: "Canal non déployé ou masqué",
      help: {
        reading: "Lire la carte des liens",
        intro: "Les cadres regroupent les canaux déployés. Chaque carte affiche le nom du canal, ses compteurs source juste sous le titre, son état et ses actions ; les flèches tracent les liens Channel Writer → Channel Reader.",
        forwardEdge: "Appelle un autre canal (orange si en file, rouge en erreur, gris pointillé si la cible est arrêtée ou masquée).",
        backEdge: "Boucle / cycle appelant un canal situé en amont.",
        edgeLabel: "Destination appelante (affiche D1 avec Détails). Cliquer pour ouvrir ses Messages.",
        cardActions: "Lignes revient sur ce canal dans la vue Lignes ; Focus isole sa chaîne amont et aval (Échap ou clic dans le fond réinitialise).",
        details: "Avec Détails : affiche le connecteur source, tous les tags et l’identifiant D1 des destinations.",
        moving: "Se déplacer",
        wheel: "La molette déplace ; Maj + molette décale latéralement ; ⌘/Ctrl + molette ou pincement zoome.",
        drag: "Glisser le fond ou utiliser les flèches pour se déplacer. Mini-carte ou + − 0 1 pour zoomer et centrer.",
        clicks: "Clics",
        clickBody: "Le nom du canal ou un compteur ouvre Messages sur tout le canal ; une étiquette de lien ouvre Messages sur cette destination. Cliquer sur une carte ou Focus met sa chaîne en évidence."
      }
    }
  },

  channelFlow: {
    title: "Flux du canal",
    tab: "Flux",
    action: "Voir le flux",
    actionTitle: "Voir le trajet d’un message dans ce canal",
    layout: "Vue",
    layoutTitle: {
      line: "Tout se lit de gauche à droite. Adapté aux canaux avec peu de destinations.",
      columns: "De haut en bas, une colonne par chaîne. Adapté à plusieurs chaînes courtes.",
      bands: "Source, destinations et post-traitement en trois bandes, un bloc par ligne. Adapté aux nombreuses destinations ou chaînes longues."
    },
    autoTitle: "Choisit la vue selon la forme du canal (actuelle : {layout})",
    hint: "Pincer ou ⌘/Ctrl + molette pour zoomer · molette, deux doigts ou glisser pour déplacer",
    zoom: "Zoom",
    zoomIn: "Zoom avant (+)",
    zoomOut: "Zoom arrière (−)",
    fit: "Tout",
    fitTitle: "Afficher tout le diagramme (0)",
    startTitle: "Taille réelle, au début du flux (1)",
    minimap: {
      label: "Mini-carte",
      hide: "Masquer la mini-carte",
      navigate: "Cliquer ou glisser pour se déplacer"
    },
    diagram: "Flux de {name}",
    diagramRole: "diagramme",
    breadcrumb: "Emplacement",
    saved: "Version enregistrée",
    savedTitle: "Le diagramme affiche le canal tel qu’enregistré. L’onglet Flux de l’éditeur affiche vos modifications non enregistrées.",
    unsavedDraft: "Modifications non enregistrées dans l’éditeur",
    edit: "Modifier le canal",
    messages: "Messages",
    notFound: "Ce canal n’existe pas ou vous ne pouvez pas le consulter.",
    loadFailed: "Impossible de charger le canal",
    picker: {
      intro: "Choisissez un canal pour voir comment un message le traverse.",
      filter: "Filtrer canaux et tags…",
      filterNameOnly: "Rechercher un canal",
      tag: "Tag",
      allTags: "Tous les tags",
      clearFilters: "Effacer les filtres",
      count: { one: "{count} canal", other: "{count} canaux" },
      filteredCount: "{shown} sur {total}",
      failed: "Impossible de charger les canaux",
      noMatch: "Aucun canal correspondant",
      none: "Aucun canal"
    },
    sender: {
      external: "Émetteur",
      polled: "Sondage",
      channel: "Canal appelant"
    },
    band: {
      source: "Traitement source",
      destinations: "Traitement destinations",
      postprocessing: "Post-traitement et réponse"
    },
    note: {
      noDestinations: "Aucune destination",
      chain: "Chaîne {number}",
      chainParallel: "Chaîne {number} · en parallèle"
    },
    block: {
      source: "Source",
      destination: "Destination {id}",
      channel: "Canal",
      lifecycle: "Cycle de vie",
      postprocessing: "Post-traitement",
      disabled: "Désactivée"
    },
    tile: {
      connector: "Connecteur",
      attachments: "Pièces jointes",
      preprocessor: "Préprocesseur",
      filter: "Filtre",
      transformer: "Transformateur",
      response: "Réponse",
      deploy: "Déploiement",
      undeploy: "Retrait",
      postprocessor: "Postprocesseur",
      reply: "Réponse à l’émetteur"
    },
    empty: {
      filter: "Aucune règle · accepte tout",
      transformer: "Aucune étape",
      response: "Aucune étape",
      script: "Aucun script"
    },
    scriptSet: "Script défini",
    reply: {
      none: "Aucune réponse",
      destination: "Destination {id} · {name}",
      map: "Response map · {name}",
      after: "après traitement",
      before: "avant traitement"
    },
    edge: {
      waitsFor: "attend D{id}",
      disabled: "désactivée",
      parallel: "en parallèle",
      replied: "réponse renvoyée"
    },
    step: {
      disabled: "{name} (désactivée)"
    },
    more: "+{count} autres",
    stepList: {
      rules: { one: "{what} · {count} règle", other: "{what} · {count} règles" },
      steps: { one: "{what} · {count} étape", other: "{what} · {count} étapes" }
    },
    open: "Ouvrir {what} · {where}",
    openConnector: "Ouvrir le connecteur de {where}",
    add: "Ajouter à {what}",
    addTo: "Ajouter à {what} · {where}",
    added: "{type} ajouté à {what} · {where}. Enregistrez le canal pour le conserver.",
    addFailed: "Impossible d’ajouter l’étape : {error}",
    noStepTypes: "Aucun type d’étape disponible",
    openTab: {
      source: "Ouvrez l’onglet Source pour modifier le connecteur source.",
      destination: "Ouvrez l’onglet Destinations, destination {id}, pour modifier ce connecteur.",
      script: "Ouvrez l’onglet Scripts, {script}, pour modifier ce script.",
      attachments: "Ouvrez l’onglet Summary pour modifier les pièces jointes.",
      step: "Sélectionnez l’étape {index} ({name}) dans la liste pour la modifier."
    },
    help: {
      reading: "Lire le diagramme",
      blocks: "Un message entre à gauche (ou en haut), traverse la source puis chaque chaîne de destinations. Les chaînes le reçoivent en parallèle.",
      arrow: {
        message: "Chemin du message.",
        wait: "La destination attend la fin de la précédente.",
        reply: "Réponse renvoyée à l’émetteur.",
        off: "Destination désactivée : elle ne reçoit rien."
      },
      saved: "Depuis le menu Design, le diagramme montre le canal enregistré. Dans l’éditeur de canal, son onglet Flux montre vos modifications non enregistrées.",
      moving: "Se déplacer",
      device: {
        trackpadMove: "Pavé tactile",
        pinch: "Pavé tactile",
        wheel: "Souris",
        drag: "Souris",
        minimap: "Mini-carte"
      },
      gesture: {
        trackpadMove: "Deux doigts déplacent le diagramme.",
        pinch: "Pincer pour zoomer.",
        wheel: "La molette déplace ; Maj + molette déplace horizontalement ; ⌘/Ctrl + molette zoome.",
        drag: "Glisser le fond pour déplacer. Espace + glisser fonctionne partout.",
        minimap: "Cliquer ou glisser dans l’aperçu en coin sur les grands diagrammes.",
        arrows: "Déplacer.",
        zoomKeys: "Zoomer et dézoomer.",
        fitKey: "Afficher tout le diagramme.",
        startKey: "Taille réelle, depuis le début du flux."
      },
      clicks: "Clics",
      clickOpen: "Un bloc ou une tuile ouvre son éditeur. Une étape ouvre son filtre ou transformateur. + ajoute une étape, dans l’onglet Flux de l’éditeur.",
      clickLimits: "Web Admin ne sait pas encore ouvrir directement une étape, un onglet ou une destination précise : l’éditeur s’ouvre sur sa première page."
    }
  }
};
