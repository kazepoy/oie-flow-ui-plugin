# Plan — OIE Flow UI

Plugin Web Admin pour Open Integration Engine qui reprend les écrans **Flow** et
**Flows** du projet [FHIR Profile Mapper](../../oie-fhir-profile-mapper-plugin/README.md)
et les reconstruit proprement, hors de tout lien avec FHIR.

| Écran | Menu | Rôle |
|---|---|---|
| **Flows Monitoring** | Monitor | Canaux déployés par groupe, une ligne par canal, compteurs par connecteur |
| **Channel Flow** | Design | Schéma zoomable du parcours d'un message dans un canal |

Cible : OIE 4.7.0, Web Support 1.3.0 (Web Admin 1.3.0, API plugin 4.10), RBAC 1.3.0.

---

## 0. État d'avancement (2026-11-14)

| Phase | État |
|---|---|
| 0. Socle et vérifications | Fait : build esbuild, ZIP sans Java accepté (WS-01), menus et droits vérifiés |
| 1. Démo | Fait : initialisation REST `oie-init/` (12 canaux en 4 groupes), trafic continu automatique `traffic`, `examples/send.sh` |
| 2. Fondations partagées | Fait : `host/`, i18n, jetons, contrôles, réglages, état de session |
| 3. Flows Monitoring | Fait, vérifié dans la démo avec les comptes RBAC ; ajouts : liens entre canaux (*Links*), tags colorés, démarrer / pause / arrêt des canaux et connecteurs |
| 4. Channel Flow, schéma | Fait : trois vues calculées, sélecteur avec groupes et tags, action *Show flow* |
| 5. Channel Flow, interaction | Fait : zoom et déplacement (molette standard), mini-carte, onglet Flow, `+`, étapes visibles réglables. À vérifier sur un vrai pavé tactile et dans Safari |
| 6. Aides et finitions | Fait en partie : aides `?`, indice, états vides, réglages serveur dans Manage › Settings › Flow UI (*Backup/Restore Config*) et surcharges par utilisateur. Revue d'accessibilité à faire |
| 7. Documentation et livraison | Fait : README, guide avec captures, architecture, i18n, CI et releases publiées |
| 8. Retrait dans le mapper | Fait |

L'arborescence du §3.1 décrit le code tel qu'il est. Écart restant : ESLint et
Stylelint ne sont pas en place (vérification de types et tests seulement). Ce qui
reste à faire est suivi dans [TODO.md](TODO.md).

## 1. Ce que l'on sait de l'hôte (vérifié dans Web Admin 1.3.0)

Constats tirés du WAR de Web Admin et du plugin RBAC installés dans la démo du mapper.

- **Menu.** Trois sections : `Monitor`, `Design`, `Manage`. Un plugin y ajoute une
  entrée par `registerNavItem({ id, label, icon, path, section, order, task })`. Le
  champ `task` est vérifié par le contrôleur d'autorisation (RBAC) : l'entrée
  disparaît si le rôle ne l'accorde pas.
- **Points d'extension officiels utiles.** `registerView` (vue routée),
  `registerNavItem`, `registerChannelTab` (onglet de l'éditeur de canal),
  `registerChannelAction` (menu contextuel de la liste Channels, avec `task`),
  `registerCommand` (palette de commandes), `registerIcon`, `platform.checkTask`,
  `platform.api`, `platform.router`, `platform.store`, `platform.ui.toast`.
- **Chargement.** En déploiement WAR, l'entrée du plugin est téléchargée puis importée
  depuis une URL `blob:`. Les imports relatifs ne fonctionnent donc pas, mais les
  imports `@oie/web-ui`, `@oie/web-api` et `@oie/web-shell` sont résolus par l'import
  map de la page. Conséquence : **le plugin doit être livré en un seul fichier JS**,
  produit par un build à partir de sources découpées. Le mapper contourne le problème
  avec `getAssetText` + `blob:` pour chaque fichier, ce que l'on abandonne.
- **Plugins servis par le moteur.** Web Support expose le dossier
  `extensions/<path>/webadmin/` de chaque extension (recherche de `plugin.json`).
  Une extension sans code Java (un `plugin.xml` sans `serverClasses`) suffit :
  vérifié en phase 0 (WS-01).
- **Messages.** La vue ne lit que `?messageId=` et `?metaDataId=`. Aucun paramètre
  pour le statut : le mapper coche le menu *Status* par manipulation du DOM.
- **Éditeur de canal.** Routes dédiées pour filtre, transformer et response
  (`/channels/:id/filter/:metaDataId`, etc.). Aucune route ni API pour choisir un
  onglet (Source, Destinations, Scripts), une destination ou un script. Les onglets
  de plugin viennent après les quatre onglets natifs ; aucun moyen d'en faire l'onglet
  par défaut.
- **i18n.** Web Admin n'a pas de mécanisme de traduction : le plugin apporte le sien.
- **Rendu.** React 19.2.8 fourni par l'hôte (`platform.React`). Thème sombre par défaut,
  clair avec `[data-theme=light]`. Jetons CSS disponibles : `--bg0..3`, `--text`,
  `--text-dim`, `--text-faint`, `--line`, `--line-strong`, `--accent`, `--ok`,
  `--warn`, `--err`, `--amber`, `--violet`, `--font-mono`.
- **RBAC 1.3.0.** Associe les tâches aux permissions (`doShowDashboard` →
  `viewDashboard`, `doShowMessages` → `viewMessages`, `doShowChannel`,
  `doEditChannel` → `manageChannels`). Filtre côté serveur les canaux visibles.
  API d'import de rôles : `POST /api/extensions/rbac/roles/_import`.

## 2. Ce que l'on reprend, ce que l'on change

Le code du mapper (`webadmin/web/channel-flow.js`, 760 lignes ; `flow-dashboard.js`,
321 lignes ; deux fichiers de tests) sert de référence fonctionnelle, pas de base de
code. Les décisions UX validées sur la v2 sont conservées (voir §6).

| Dans le mapper | Problème | Dans Flow UI |
|---|---|---|
| Fichiers secondaires chargés par `getAssetText` puis `import(blob:)` | Contournement ad hoc | Build esbuild : sources découpées → un seul `plugin.js` |
| CSS dans des chaînes JS, règles compressées sur une ligne | Illisible, non outillable | Fichiers `.css` par composant, jetons communs, lint CSS |
| Filtre *Status* de Messages coché en simulant des clics (MutationObserver, `PointerEvent`) | Hack fragile, casse au moindre changement de Messages | Ouverture filtrée par connecteur seulement ; statut quand Web Admin aura `?status=` (§10) |
| Ouverture automatique de l'onglet Flow par focus d'un onglet Radix, écouteur global sur `window` | Hack, détourne le comportement de l'éditeur | Supprimée : Channel Flow devient une vue Design à part entière (§5.1) |
| Navigation vers Scripts / Destinations par le DOM (setter natif de `select`, `.dest-grid`) | Dépend du markup interne | Conservée, mais isolée dans `src/host/editor-dom.js`, couverte par un test e2e, avec un toast qui dit où cliquer si un contrôle manque ; à retirer quand Web Admin aura les paramètres d'URL (§10, [WA-02](platform-limits.md#wa-02)) |
| Lien *Edit* affiché sans `manageChannels` | Mène à *Access denied* | Masqué via `platform.checkTask` |
| Deux règles de chaînage (`destinationChains` et `channelLanes`) | Logique dupliquée | Un module `model/chains` partagé |
| Géométrie des flèches mesurée dans le DOM et divisée par l'échelle | Couplage au rendu, difficile à tester | Mise en page calculée par des fonctions pures (§5.3) |
| Libellés anglais en dur | Pas de traduction possible | Catalogue i18n, aucune chaîne en dur dans les composants |
| Molette = zoom, détection souris / pavé tactile par `wheelDelta % 120` | Heuristique non isolée, molette non standard | Module de gestes isolé et testé ; molette standard (défilement, Ctrl/⌘ + molette pour zoomer) |

Le principe : **n'utiliser que l'API publique de Web Admin**. Ce qu'elle ne permet pas
est soit abandonné, soit dégradé proprement, et fait l'objet d'une demande en amont.

## 3. Architecture

### 3.1 Arborescence

```text
oie-flow-ui-plugin/
  README.md, LICENSE (MPL-2.0), CHANGELOG.md
  package.json              scripts build / test / check / test:e2e ; dépendances de dev seulement
  build.mjs                 esbuild : src/ → dist/flow-ui/, puis ZIP d'extension
  jsconfig.json             vérification de types du JavaScript (tsc --checkJs)
  tools/zip.mjs             écriture du ZIP, sans outil externe
  extension/
    plugin.xml              métadonnées OIE (version injectée au build), sans Java
    plugin.json             manifeste Web Admin (apiMin, entry)
  .github/workflows/build.yml  tests, build ; release sur tag vX.Y.Z
  src/
    index.js                register(platform) : vues, menus, onglet, action, panneau Settings
    styles.js               ordre des feuilles CSS
    types.d.ts              déclarations pour la vérification de types
    host/                   seul endroit qui touche `platform`
      platform.js           platform, utilisateur, messages, confirmation
      react.js, jsx-runtime.js  React de l'hôte, h() pour le JSX
      api.js                statuts, groupes, canaux, tags, commandes, préférences
      routes.js             chemins des vues et navigation
      permissions.js        tâches RBAC et can()
      editor.js, editor-dom.js  types d'étapes, ajout d'une étape, ouverture des éditeurs
      preferences.js        réglages serveur (`extensions/Flow UI/properties`) et surcharges utilisateur (§5.6)
      session.js            état des vues pour la session (sessionStorage)
      styles.js             injection unique des feuilles
    i18n/
      index.js              t(key, params), pluriels, nombres, heures
      locales/en.js         catalogue anglais (référence)
    shared/
      model/                xstream.js, chains.js, stats.js, endpoint.js, tags.js
      ui/                   Button, Icon, Popover (+ place.js), Hint, EmptyState, Tag, useSettings
      styles/               tokens.css (couleurs), controls.css (contrôles communs)
    settings/
      SettingsButton.jsx    engrenage de chaque écran et panneau Manage › Settings › Flow UI
    flows-monitoring/
      FlowsMonitoringView.jsx, GroupSection.jsx, ChannelRow.jsx, ConnectorCard.jsx,
      Counters.jsx, ControlButtons.jsx, FlowsHelp.jsx
      model.js              groupes → lignes → chaînes → compteurs ; liens entre canaux
      controls.js           commandes permises selon l'état (démarrer, pause, arrêt)
      useStatuses.js        chargement et rafraîchissement
      flows-monitoring.css
    channel-flow/
      ChannelFlowView.jsx   vue Design (sélecteur ou canal enregistré) et onglet de l'éditeur
      ChannelFlow.jsx       barre d'outils, schéma, mini-carte, popovers
      ChannelPicker.jsx, Scene.jsx, Block.jsx, Tile.jsx, Minimap.jsx, StepPopovers.jsx, ChannelFlowHelp.jsx
      model/                flow-model.js (canal → blocs et tuiles, choix Auto), picker.js
      layout/               geometry, line, columns, bands, edges, parts, scene : positions et flèches
      viewport/             viewport.js (vue), gestures.js, keyboard.js, minimap.js, useViewport.js
      channel-flow.css
  test/
    unit/                   node:test : modèles, géométrie, gestes, i18n, réglages
    e2e/                    Playwright contre la démo (`demo.test.js`, `session.js`, `screenshots.mjs`)
  demo/                     voir §7
  doc/
    plan.md, TODO.md, platform-limits.md
    architecture.md, user-guide.md, i18n.md
    images/                 captures du README et du guide
```

### 3.2 Règles de code

- Un composant par fichier ; viser moins de 200 lignes par fichier. Logique pure
  (modèle, mise en page, gestes) séparée des composants et testée sans DOM.
- JSX compilé par esbuild avec la fabrique du React de l'hôte (`src/host/react.js`).
  Aucune copie de React dans le bundle. JavaScript + JSDoc, vérifié par
  `tsc --checkJs` (pas de compilation TypeScript à maintenir).
- `src/host/` est le seul module qui lit `platform` : le reste reçoit des fonctions.
  C'est aussi là que l'on documente chaque dépendance à Web Admin.
- Dépendances d'exécution : aucune. Dépendances de dev : esbuild, eslint, stylelint,
  typescript, playwright. Versions figées.
- Lint : `eslint` avec `react/jsx-no-literals` (aucun texte hors `t()`), `stylelint`
  avec interdiction des couleurs littérales hors `tokens.css`.

### 3.3 Styles

- Préfixe unique `ofu-` et nommage BEM léger (`ofu-card`, `ofu-card__title`,
  `ofu-card--error`).
- `tokens.css` dérive toutes les couleurs des jetons de l'hôte, avec des valeurs de
  repli. Sémantique unique, partagée par les deux écrans :

  | Jeton | Usage |
  |---|---|
  | `--ofu-source`, `--ofu-destination`, `--ofu-channel` | Nature du bloc |
  | `--ofu-message` (ambre) | Trajet du message |
  | `--ofu-reply` (violet) | Réponse à l'émetteur |
  | `--ofu-ok`, `--ofu-queued`, `--ofu-error`, `--ofu-filtered` | Statuts et compteurs |

- Mêmes rayons, espacements, typographie et dessin de carte dans les deux écrans.
  Thèmes clair et sombre testés ; la couleur n'est jamais le seul signal (libellé ou
  icône à côté).
- Les feuilles sont importées comme texte par esbuild et injectées une fois
  (`<style data-plugin="flow-ui">`), puis retirées si le plugin est rechargé.

### 3.4 Internationalisation

- UI en anglais ; toute chaîne visible passe par `t("flows.counter.errored")`.
  Clés hiérarchiques par écran, paramètres nommés (`{count}`, `{name}`), pluriels par
  `Intl.PluralRules`, nombres et heures par `Intl`.
- Langue : préférence du plugin si définie, sinon `navigator.languages`, sinon `en`.
  Repli clé par clé sur l'anglais.
- Tests : catalogue complet par rapport à `en`, clés inutilisées, paramètres cohérents.
  Ajouter une langue = ajouter `locales/<code>.js` (documenté dans `doc/i18n.md`).

### 3.5 Droits (RBAC)

Le plugin n'a pas d'accès propre : il lit avec la session de l'utilisateur, et le
serveur filtre les canaux autorisés. Côté interface, chaque action vérifie la tâche
correspondante avec `platform.checkTask`.

| Élément | Tâche (permission RBAC) | Sans le droit |
|---|---|---|
| Entrée Flows Monitoring | `doShowDashboard` (`viewDashboard`) | Entrée absente ; URL directe : message de permission |
| Entrée Channel Flow | `doShowChannel` | Entrée absente |
| Compteurs, titres → Messages | `doShowMessages` (`viewMessages`) | Affichés, non cliquables |
| *Edit channel*, ouvrir un composant | `doEditChannel` (`manageChannels`) | Masqués ; le schéma reste consultable |
| `+` (ajout d'étape) | `doEditChannel` | Masqué |

Sans plugin RBAC, `checkTask` autorise tout : même comportement que Web Admin.

## 4. Flows Monitoring (Monitor)

Reprise fonctionnelle de la vue Flows du mapper.

- Canaux déployés par groupe, *Default Group* en dernier ; une ligne par canal, de
  gauche à droite : canal et état, source, chaînes de destinations (*then* quand une
  destination attend la précédente). Cartes alignées d'une ligne à l'autre.
- Compteurs dans le même ordre partout : statut principal (Received pour la source,
  Sent pour une destination), Filtered, Queued, Errored. Vert, gris-bleu, orange,
  rouge. Carte en erreur ou en file d'attente : bordure de 1,5 px, barre à gauche et
  fond teinté (rouge ou orange) ; connecteur arrêté en pointillés.
- Clic sur une carte ou un compteur : Messages filtré sur le connecteur. Le statut
  n'est pas présélectionné tant que Web Admin n'accepte pas `?status=` ; l'info-bulle
  le dit (« Opens messages of this connector »).
- Nouveaux liens : **Flow** sur chaque ligne (ouvre Channel Flow du canal), *Edit*
  soumis au droit.
- **Liens entre canaux** (option *Links*) : dans sa carte, une destination Channel
  Writer indique le canal appelé (*Sends to*) ; la carte du canal appelé indique ses
  appelants (*Called by*). Un clic montre la ligne liée, même dans un autre groupe.
- **Détails des connecteurs** (option *Details*) : type et adresse sur une ligne grise
  de chaque carte, du même dessin que les liens.
- **Démarrer, pause, reprise, arrêt** du canal selon son état, et arrêt ou
  démarrage de chaque connecteur d'un canal démarré ; confirmation avant un arrêt ;
  droit `startStopChannels`.
- Sans `viewChannelGroups`, une seule liste (*Groups hidden*) ; sans `viewChannels`,
  les chaînes et les liens restent inconnus (*Chains hidden*, OIE-01).
- Rafraîchissement des compteurs toutes les 5 s, onglet visible seulement ;
  structure (groupes, chaînes) au chargement et sur *Refresh*. *Lifetime*, filtre par
  nom.
- **Groupes repliés par défaut, sauf le premier.** Les groupes jouent le rôle d'un
  mode compact : un groupe replié garde son en-tête avec ses totaux, et un compteur
  en erreur ou en file d'attente y reste visible. *Expand all* / *Collapse all* dans
  la barre. Un filtre par nom déplie les groupes qui contiennent un résultat. Le
  comportement par défaut est un réglage (§5.6).
- **État conservé pendant la session** : groupes dépliés, filtre, *Lifetime* et
  position de défilement sont retrouvés en revenant sur la page (§5.6).
- Aides : légende des couleurs et des bordures (bouton `?`), info-bulle par compteur
  (« Errored: messages that failed in this connector »), états vides explicites.
- Nom dans le menu : **Flows Monitoring**.

## 5. Channel Flow (Design)

### 5.1 Points d'entrée

1. **Vue Design « Channel Flow »** (`/channel-flow` et `/channel-flow/<id>`). Sans
   canal choisi : un sélecteur (recherche, groupes). Avec un canal : le schéma de sa
   **version enregistrée**, un fil d'Ariane et les liens *Edit channel*, *Messages*,
   *Flows Monitoring*.
2. **Action « Show flow »** dans le menu contextuel de la liste Channels
   (`registerChannelAction`), et lien *Flow* dans Flows Monitoring.
3. **Onglet « Flow » de l'éditeur** (`registerChannelTab`) : le même schéma sur le
   **brouillon en cours**, modifications non enregistrées comprises, avec le `+` qui
   ajoute une étape. Il ne s'ouvre plus automatiquement (pas d'API pour cela).

Règle simple à expliquer : la vue Design montre ce qui est enregistré, l'onglet
montre ce que l'on est en train de modifier. Un bandeau le rappelle dans la vue
quand l'éditeur contient des modifications non enregistrées pour ce canal.

### 5.2 Lecture et actions (reprises de la v2)

- Blocs Source, Destination n, Channel (lifecycle, postprocessing) de même dessin :
  titre, puis types de données ; titre tronqué avec info-bulle.
- Flèches : ambre (trajet), pointillés gris (*waits for Dn*), violet (réponse),
  pointillés clairs (destination désactivée). Chaînes parallèles signalées.
- Cinq étapes visibles par défaut par filtre, transformer ou response (réglage :
  3, 5, 8 ou toutes) ; *+N more* ouvre la liste.
- Vues **Line**, **Columns**, **Bands** et **Auto** (Bands à partir de 5 destinations
  ou d'une chaîne de 3, Columns si plusieurs chaînes, sinon Line). Vue par défaut
  réglable (§5.6) ; le choix fait sur un canal est conservé pendant la session.
- Clic sur filtre, transformer, response ou étape : route de l'éditeur
  correspondante. Clic sur connecteur, script ou pièces jointes : éditeur du canal,
  en attendant les paramètres d'URL demandés en amont (§10).

### 5.3 Mise en page calculée

La géométrie (position et taille des blocs et tuiles, tracés des flèches) est
calculée par des fonctions pures à partir du modèle : largeur de bloc fixe, hauteur
déduite du nombre de tuiles et d'étapes visibles. Le rendu place les blocs en
position absolue et dessine les flèches en SVG dans la même scène.

Bénéfices : aucune mesure du DOM, rendu identique à chaque zoom, géométrie testable
(« aucune flèche ne traverse un bloc », « tout se lit de gauche à droite »).

### 5.4 Zoom et déplacement

Objectif : fluide à 60 images/s au pavé tactile, à la souris et au clavier.

| Geste | Effet |
|---|---|
| Pavé tactile, deux doigts | Déplacement |
| Pavé tactile, pincement | Zoom autour des doigts (Chrome/Firefox : `wheel` + `ctrlKey` ; Safari : `gesturestart/change`) |
| Molette de souris | Déplacement (standard) ; `Shift` + molette : horizontal ; `⌘`/`Ctrl` + molette : zoom autour du pointeur |
| Glisser le fond, ou `Espace` + glisser, ou bouton du milieu | Déplacement |
| Clavier, schéma focalisé | Flèches : déplacement (`Shift` : plus vite) ; `+` / `-` : zoom ; `0` : ajuster ; `1` : 100 % |
| Barre d'outils | `−`, niveau, `+`, *Fit*, *100%* |

- Une seule transformation CSS sur la scène, appliquée dans `requestAnimationFrame`.
  Aucun rendu React pendant un geste (vérifié par un test).
- Détection souris / pavé tactile isolée dans `gestures.js` et testée.
- **Point de départ : le début du flux, lisible.** À la première ouverture d'un canal
  et à chaque changement de vue, le schéma s'affiche à 100 %, ancré sur l'émetteur
  (en haut à gauche, là où entre le message ; en haut au centre dans la vue Columns).
  Un schéma qui tient dans la fenêtre est centré. *Fit* reste à un clic ou sur `0`.
- Transition courte entre deux vues, coupée si `prefers-reduced-motion`. Zoom borné
  entre 15 % et 300 %.

### 5.5 Aides

Bouton `?` : légende des flèches et des blocs, tableau des gestes. Indice discret au
premier affichage (« Pinch or ⌘ + wheel to zoom… »), masquable et mémorisé. Info-bulles
sur chaque bouton de la barre et sur *Auto* (vue choisie et pourquoi).

### 5.6 Réglages et état de session (deux écrans)

Deux niveaux, à ne pas confondre :

| | Réglages | État de session |
|---|---|---|
| Quoi | Choix durables de l'utilisateur | Où il en était |
| Exemples | Vue par défaut (Auto, Line, Columns, Bands) ; groupes dépliés par défaut (premier, tous, aucun) ; étapes visibles par tuile ; intervalle de rafraîchissement ; aides masquées | Channel Flow, par canal : vue, zoom, position. Flows Monitoring : groupes dépliés, filtre, *Lifetime*, défilement |
| Stockage | Défauts serveur dans `extensions/Flow UI/properties` (*Backup/Restore Config*) ; surcharges utilisateur dans `flowui.settings` (`PUT /api/users/{id}/preferences/flowui.settings`), repli `localStorage` | `sessionStorage` : survit à la navigation et au rechargement, disparaît avec l'onglet |
| Où on les change | Manage › Settings › Flow UI (défauts du serveur), ou engrenage de chaque écran (surcharges personnelles) | Rien à faire : restauré au retour sur la page |

**Manage › Settings › Flow UI** définit les réglages par défaut du plugin au
niveau du serveur (*Refresh*, *Save* et *Restore Defaults*), inclus dans
*Backup/Restore Config*. L'engrenage de chaque écran permet à chaque utilisateur
d'ajuster ses propres préférences : RBAC peut refuser *Settings* à un utilisateur
qui consulte pourtant les flux. Si l'écriture des préférences OIE échoue, les
surcharges restent dans le navigateur (`localStorage`) et un message le signale
([WA-06](platform-limits.md#wa-06)).

## 6. Exigences UX conservées

Décisions validées pendant la v2 dans le mapper, à respecter :

- Interface en anglais ; schéma plein écran.
- Blocs source et destination de même dessin et de même largeur, titre tronqué avec
  info-bulle.
- Tous les liens sont des flèches ; aucun lien sous un bloc ; lecture de gauche à
  droite (sauf vue Columns).
- 5 étapes visibles par composant (réglable), *+N more* ouvre une liste.
- Flows : une ligne par canal alignée en haut, compteurs colorés cliquables.

Changement assumé : Flow ne s'ouvre plus automatiquement à l'entrée dans un canal
(c'était un hack) ; il devient une vue Design dédiée et reste un onglet de l'éditeur.

## 7. Démo

Même principe que la démo du mapper, sans FHIR, démarrable à côté d'elle, et **sans
Python** : l'initialisation passe directement par l'API REST d'OIE au démarrage.

### 7.1 Principe : initialisation REST au démarrage

La base PostgreSQL démarre vide ; OIE crée son schéma puis le service `oie-init`
([`demo/oie-init/init-channels.sh`](../demo/oie-init/init-channels.sh)) appelle
l'API REST pour restaurer `configuration.xml`, créer les comptes, importer les 4
groupes, les 12 canaux (et leurs tags) et les rôles RBAC, déployer les canaux,
puis rejouer les messages initiaux (`messages.txt`).

- **Réinitialiser** = relancer `docker compose up -d oie-init`, ou repartir de
  volumes vides (`docker compose down -v && docker compose up -d`).
- **Compteurs cohérents** : ils viennent de vrais messages traités par OIE
  (en nommant les destinations actives, [OIE-11](platform-limits.md#oie-11)), donc un
  clic sur un compteur ouvre Messages sur des messages qui existent.
- **Sources lisibles** : toute la configuration, les canaux XML, groupes, rôles
  RBAC, utilisateurs et messages sont directement versionnés dans
  `demo/oie-init/data/` au format natif d'OIE.

### 7.2 Services (`demo/compose.yaml`)

| Service | Contenu |
|---|---|
| `oie-engine` | Build officiel d'OIE 4.7.0 (profil `build`) |
| `oie-db` | PostgreSQL 18 (`postgres:18.3-alpine`) |
| `oie-app` | OIE 4.7.0 + Web Support 1.3.0 + RBAC 1.3.0 (archives vérifiées par SHA-256) + Flow UI construit dans un étage Node ; `SERVER_ID` fixe |
| `oie-init` | Image curl : exécute `oie-init/init-channels.sh` une fois `oie-app` sain |
| `traffic` | Démarre automatiquement dès la fin de `oie-init` : image curl, boucle pondérée (`examples/traffic.sh`, 0,2 s par défaut) qui alimente les compteurs |

Port d'administration par défaut **8444** et ports d'exemple **8181-8199** (le mapper
utilise 8443 et 8081-8099), tous réglables dans `.env`. Projet compose
`oie-flow-ui-demo`.

### 7.3 Sources (`demo/`)

```text
demo/
  compose.yaml, Dockerfile, .env.example, README.md
  custom-extensions/        extensions supplémentaires montées dans OIE
  oie-init/
    init-channels.sh        initialisation REST d'OIE au démarrage
    data/
      configuration.xml     réglages serveur, tags et carte de configuration
      channels/             12 canaux au format XML natif d'OIE
      groups/               4 groupes de canaux (XML)
      roles.xml             rôles RBAC (XML)
      users.txt             comptes de démo
      messages.txt          plan des messages initiaux et du trafic continu
      messages/             messages joués ({{n}} : numéro, {{ts}} : horodatage)
  examples/
    traffic.sh              trafic continu automatique après oie-init
    send.sh                 envoie un message vers un listener (MLLP par nc, HTTP par curl)
    demo.http               appels REST commentés
```

Les traces d'exécution de `oie-init/init-channels.sh` mesurent chaque étape (création
des utilisateurs, groupes, canaux, déploiement, envoi des messages initiaux).

### 7.4 Canaux d'exemple (12 canaux en 4 groupes)

Scénario réaliste : la plateforme d'intégration d'un hôpital. Les canaux prioritaires
montrent des étapes variées (filtres, transformers, destinations multiples, liens).
Les systèmes externes sont simulés par deux canaux du groupe *Operations & Simulators* :
tout le trafic reste dans la démo, sauf les destinations volontairement injoignables.
Connecteurs et types natifs seulement (MLLP/TCP, HTTP, File, Channel Reader/Writer,
JavaScript ; HL7v2, JSON, XML, Raw).

| Groupe | Canal | Complexité | Ce qu'il montre |
|---|---|---|---|
| Billing & Partners | `BILL · Claims to insurer` | Simple | Listener HTTP 8189 (`/claims`) ; hôte injoignable avec file d'attente (*Queued*) |
| Billing & Partners | `HIE · Regional exchange API` | Moyen | Listener HTTP JSON 8190 (`/hie`) ; réponse de la destination 2 renvoyée à l'appelant (flèche violette) ; postprocessor |
| Laboratory | `LAB · Orders to LIS (ORM)` | Simple | Listener MLLP 8183 ; vue Line, transformer de réponse |
| Laboratory | `LAB · Results from LIS (ORU)` | Moyen | Listener MLLP 8184 ; chaîne validate → store → notify ; erreurs sur résultats incomplets (*Errored*) |
| Laboratory | `LAB · Critical values` | Moyen | Appelé par le précédent ; filtre de 9 règles (*+4 more*) ; alerte HTTP |
| Operations & Simulators | `OPS · Heartbeat` | Simple | Source JavaScript interrogée chaque minute ; scripts deploy/undeploy |
| Operations & Simulators | `SIM · MLLP` | Simple | Systèmes externes simulés (MLLP, port 7101, ACK) |
| Operations & Simulators | `SIM · EHR` | Simple | Dossier patient informatisé simulé (HTTP, port 7103, ACK) |
| Patient Care | `ADT · HIS inbound` | Moyen | Listener MLLP 8181 ; filtre des messages de test (*Filtered*) ; deux chaînes |
| Patient Care | `ADT · Broadcast to departments` | Complexe | Appelé par le précédent (*Calling channel*) ; 7 destinations dont une désactivée : Auto choisit Bands |
| Patient Care | `RAD · Orders to RIS` | Simple | Listener MLLP 8186 ; trois destinations parallèles : Auto choisit Columns |
| Patient Care | `PHARM · Prescriptions (RDE)` | Complexe | Listener MLLP 8188 ; transformer de 12 étapes de types variés (*+7 more*), *Destination Set Filter* |

### 7.5 Comptes de démo

Mot de passe : `demo-oie-password` par défaut pour tous les comptes. Chaque compte
illustre une situation RBAC.

| Compte | Rôle | Ce qu'il voit |
|---|---|---|
| `admin` | Administrateur | Tout |
| `lab-viewer` | Laboratory viewer | Flows Monitoring et Messages, canaux du groupe *Laboratory* seulement ; ni Design ni lecture des canaux (*Chains hidden*) |
| `ops` | Operations | Flows Monitoring, Messages et Channel Flow en lecture, tous les canaux ; démarrer, pause, arrêt |
| `integrator` | Integrator | Design et Monitor complets : Channel Flow avec `+` et ouverture des éditeurs |
| `auditor` | Auditor | Flows Monitoring sans Messages : compteurs visibles, non cliquables, pas de commandes |

RBAC restreint par liste de canaux, pas par groupe ([RB-06](platform-limits.md#rb-06)) :
le rôle `lab-viewer` liste les canaux du groupe *Laboratory* dans
`demo/oie-init/data/roles.xml`.

### 7.6 Parcours

`doc/user-guide.md` décrit un parcours de cinq minutes : Flows Monitoring → compteur
*Errored* de `LAB · Results from LIS` → Messages → Channel Flow du canal → étape
fautive. Puis le même parcours avec `lab-viewer` et `auditor` pour montrer RBAC.

## 8. Qualité

- **Tests unitaires** (`node --test`) : modèle de canal, chaînes, statistiques,
  choix Auto, géométrie des trois vues, gestes, i18n. Reprise des cas de
  `channel-flow.test.mjs` et `flow-dashboard.test.mjs` du mapper.
- **Tests de bout en bout** (Playwright, Chromium et WebKit) contre la démo : menus,
  navigation, compteurs, gestes simulés, thèmes clair et sombre, comptes RBAC.
  Captures de la documentation produites par ces tests.
- **Accessibilité** : tout est atteignable au clavier, rôles et libellés ARIA,
  `focus-visible`, contraste vérifié dans les deux thèmes.
- **Performances** (à faire, voir TODO) : Flows Monitoring avec 200 canaux (jeu
  de charge à 200 canaux) ; Channel Flow
  avec 30 destinations. Aucun rendu React pendant un
  geste, rafraîchissement sans saut de mise en page.
- **CI** (GitHub Actions) : lint, tests unitaires, build ; sur tag `vX.Y.Z`, ZIP
  d'extension et `SHA256SUMS` publiés en release, comme le mapper.

## 9. Phases

Chaque phase se termine par une vérification visuelle dans la démo.

| Phase | Contenu | Terminé quand |
|---|---|---|
| **0. Socle et vérifications** | Squelette du dépôt, build esbuild, ZIP sans Java, injection CSS, i18n minimal, deux vues « hello » (Monitor et Design) | Le ZIP s'installe dans OIE 4.7.0 ; les vues apparaissent et respectent RBAC ; les points marqués « à confirmer » sont tranchés (§1) |
| **1. Démo** | compose, Dockerfile, initialisation REST `oie-init/`, trafic automatique `traffic`, `examples/send.sh` | `docker compose up` donne des compteurs variés et les cinq comptes ; `oie-init` réinitialise l'état |
| **2. Fondations partagées** | Jetons et contrôles UI, `host/`, `model/chains`, `stats`, permissions, aides (`HelpPopover`, `Tooltip`) | Composants communs testés et utilisés par les deux écrans |
| **3. Flows Monitoring** | Vue complète (§4) | Parité avec Flows du mapper, sans hack, liens Flow et droits |
| **4. Channel Flow — schéma** | Modèle, mise en page calculée des trois vues, rendu, vue Design, sélecteur, action Channels | Les canaux d'exemple se lisent correctement dans les trois vues |
| **5. Channel Flow — interaction** | Zoom et déplacement (§5.4), onglet de l'éditeur, ouverture des éditeurs, `+` | Fluide au pavé tactile, à la souris et au clavier, Chrome et Safari |
| **6. Aides et finitions** | Légendes, indices de premier usage, états vides, accessibilité, thèmes | Revue de l'ensemble des écrans, captures à jour |
| **7. Documentation et livraison** | README, guide, architecture, i18n, ADR, CI et release | Release `v0.1.0` installable |
| **8. Retrait dans le mapper** | Supprimer Flow et Flows du mapper, renvoyer vers Flow UI | Les deux plugins installés ensemble ne dupliquent aucune entrée |

## 10. Demandes à faire en amont (Web Admin)

À proposer au projet Web Support / Web Admin. En attendant, le plugin dégrade
proprement ; seule l'ouverture d'un onglet, d'un script, d'une destination ou d'une
étape de l'éditeur passe par le DOM (2.). Le détail des constats, preuves et contournements
est tenu dans [platform-limits.md](platform-limits.md).

1. Messages : paramètre `?status=` (et éventuellement `?status=ERROR,QUEUED`).
2. Éditeur de canal : paramètres d'URL pour l'onglet, la destination et le script
   (`?tab=scripts&script=deploy`, `?tab=destinations&metaDataId=3`).
3. Onglet de plugin ouvert par défaut (`registerChannelTab({ default: true })`) ou
   préférence utilisateur.
4. Mécanisme i18n commun (langue de l'utilisateur, catalogues des plugins).

Le plugin détecte ces capacités par `platform.apiVersion` et les active dès qu'elles
existent.

## 11. Décisions

### 11.1 Validées (2026-11-11)

| # | Question | Décision |
|---|---|---|
| 1 | Où vit Channel Flow ? | Vue Design dédiée + onglet de l'éditeur sans ouverture automatique (§5.1) |
| 2 | Clic sur un compteur de statut | Messages filtré sur le connecteur seulement, jusqu'à `?status=` en amont |
| 3 | Outillage | esbuild + JSX + JSDoc vérifié par `tsc`, pas de TypeScript compilé |
| 4 | Géométrie du schéma | Calculée (§5.3) plutôt que mesurée dans le DOM |
| 5 | Molette de souris | Comportement standard : la molette déplace, `⌘`/`Ctrl` + molette zoome (révisé le 2026-11-11, la v2 zoomait) ; pas de réglage |
| 6 | Identité du plugin | Nom « OIE Flow UI », id et dossier d'extension `flow-ui`, licence MPL-2.0 |
| 7 | Libellés du menu | « Flows Monitoring » (Monitor) et « Channel Flow » (Design) |
| 8 | Langue de la documentation | README en anglais, `doc/` en français (comme le mapper) |
| 9 | Ports de la démo | 8444 et 8181-8199, pour tourner à côté de la démo du mapper |
| 10 | Mode compact de Flows Monitoring | Non : les groupes en tiennent lieu, repliés par défaut sauf le premier (§4) |
| 11 | Compteurs superposés sur Channel Flow | Non |
| 12 | État des vues | Conservé pendant la session ; départ au début du flux, à 100 % (§5.4, §5.6) |
| 13 | Données de la démo | Chargement sans Python, initialement par dump PostgreSQL, remplacé depuis par l'initialisation REST `oie-init/` au démarrage (§7.1) |

### 11.2 Évolutions appliquées

| # | Question | Décision actuelle |
|---|---|---|
| 14 | Où ranger les réglages ? | Défauts serveur dans **Manage › Settings › Flow UI** (`extensions/Flow UI/properties`, inclus dans *Backup/Restore Config*) et surcharges personnelles depuis le bouton ⚙ (`flowui.settings`) (§5.6) |
| 15 | Forme du chargement | Fichiers XML/texte versionnés dans `demo/oie-init/data/` et importés par API REST (`oie-init/init-channels.sh`) au démarrage, remplaçant l'ancien dump `seed/` + `pg_dump` (§7.1, §7.3) |
| 16 | Scénario de démo | Plateforme d'intégration hospitalière : 4 groupes, 12 canaux prioritaires avec étapes variées, systèmes externes simulés (§7.4) |
| 17 | Comptes de démo | `admin`, `lab-viewer`, `ops`, `integrator`, `auditor` (§7.5) |

Le chargement REST exécute les vrais déploiements et envois de messages dans OIE :
le moteur crée lui-même ses tables de messages et les compteurs pointent vers des
messages existants dans Messages.

## 12. Idées pour plus tard

- **Mini-carte** pour les très grands canaux, dans Channel Flow : fait (v0.8.2).
- **Vue dédiée des liens entre canaux** (Channel Writer → Channel Reader). Les
  mentions *Sends to* / *Called by* de l'option *Links* sont faites. Le
  visuel reste à trouver, surtout quand les deux canaux sont dans des groupes
  différents. Piste : une vue dédiée de ces liens (graphe des canaux, groupes en
  cadres), ouverte depuis la barre de Flows Monitoring.
