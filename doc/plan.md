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
  Une extension sans code Java (un `plugin.xml` sans `serverClasses`) devrait donc
  suffire. **À confirmer en phase 0.**
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
| Navigation vers Scripts / Destinations par le DOM (setter natif de `select`, `.dest-grid`) | Dépend du markup interne | Ouvre l'éditeur du canal ; ciblage fin quand Web Admin aura les paramètres d'URL (§10) |
| Lien *Edit* affiché sans `manageChannels` | Mène à *Access denied* | Masqué via `platform.checkTask` |
| Deux règles de chaînage (`destinationChains` et `channelLanes`) | Logique dupliquée | Un module `model/chains` partagé |
| Géométrie des flèches mesurée dans le DOM et divisée par l'échelle | Couplage au rendu, difficile à tester | Mise en page calculée par des fonctions pures (§5.3) |
| Libellés anglais en dur | Pas de traduction possible | Catalogue i18n, aucune chaîne en dur dans les composants |
| Détection souris / pavé tactile par `wheelDelta % 120` | Heuristique non isolée | Module de gestes isolé, testé, avec réglage manuel de secours |

Le principe : **n'utiliser que l'API publique de Web Admin**. Ce qu'elle ne permet pas
est soit abandonné, soit dégradé proprement, et fait l'objet d'une demande en amont.

## 3. Architecture

### 3.1 Arborescence

```text
oie-flow-ui-plugin/
  README.md                 présentation (en), captures, installation
  LICENSE                   MPL-2.0, comme le mapper dont le code est issu
  CHANGELOG.md
  package.json              scripts build / test / lint ; dépendances de dev seulement
  build.mjs                 esbuild : src/ → dist/, puis ZIP d'extension
  extension/
    plugin.xml              métadonnées OIE (version injectée au build)
    plugin.json             manifeste Web Admin (apiMin, entry)
  src/
    index.js                register(platform) : branche les deux écrans, rien d'autre
    host/                   seul endroit qui touche `platform`
      react.js              liaison au React de l'hôte (JSX)
      routes.js             chemins Messages, éditeur, filtre/transformer, vues du plugin
      permissions.js        tâches RBAC utilisées et `can(task)`
      api.js                statuts, groupes, canaux (appels platform.api typés en JSDoc)
      styles.js             injection unique des feuilles du plugin
      preferences.js        préférences locales (localStorage, espace `oie.flow-ui.*`)
    i18n/
      index.js              t(key, params), pluriels (Intl.PluralRules), nombres, dates
      locales/en.js         catalogue anglais (référence)
    shared/
      model/chains.js       règle de chaînage des destinations (unique)
      model/stats.js        lecture des statistiques du moteur
      ui/                   Button, IconButton, SegmentedControl, Counter, Tooltip,
                            HelpPopover, EmptyState, Icon (un composant par fichier)
      styles/tokens.css     jetons du plugin dérivés des jetons de l'hôte
      styles/controls.css   boutons, segments, champs, popovers
    flows-monitoring/
      FlowsMonitoringView.jsx, Toolbar.jsx, GroupSection.jsx, ChannelRow.jsx,
      ConnectorCard.jsx, Totals.jsx, Legend.jsx
      useStatuses.js        rafraîchissement, pause onglet caché
      model.js              groupes → lignes → chaînes → compteurs
      flows-monitoring.css
    channel-flow/
      ChannelFlowView.jsx   vue routée Design (sélecteur de canal + schéma)
      ChannelFlowTab.jsx    onglet de l'éditeur (même schéma, brouillon en cours)
      ChannelPicker.jsx, Toolbar.jsx, Diagram.jsx, Block.jsx, Tile.jsx, Edge.jsx,
      StepList.jsx, AddStepMenu.jsx, Legend.jsx
      model/flow-model.js   canal → blocs et tuiles
      model/pick-layout.js  choix Auto
      layout/               line.js, columns.js, bands.js, geometry.js (positions + tracés)
      viewport/             viewport.js (état pan/zoom), gestures.js, keyboard.js
      editing.js            ajout d'une étape comme le fait l'éditeur
      channel-flow.css
  test/
    unit/                   node:test, miroir de src/
    e2e/                    Playwright contre la démo (Chromium, WebKit pour Safari)
  demo/                     voir §7
  doc/
    prompt.md, plan.md
    architecture.md         modules, flux de données, règles de dépendance
    user-guide.md           mode d'emploi des deux écrans (captures)
    i18n.md                 ajouter une langue
    decisions/              une fiche par décision (format ADR court)
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
  rouge. Carte en erreur bordée de rouge, en file d'attente bordée d'orange,
  connecteur arrêté en pointillés.
- Clic sur une carte ou un compteur : Messages filtré sur le connecteur. Le statut
  n'est pas présélectionné tant que Web Admin n'accepte pas `?status=` ; l'info-bulle
  le dit (« Opens messages of this connector »).
- Nouveaux liens : **Flow** sur chaque ligne (ouvre Channel Flow du canal), *Edit*
  soumis au droit.
- Rafraîchissement des compteurs toutes les 5 s, onglet visible seulement ;
  structure (groupes, chaînes) au chargement et sur *Refresh*. *Lifetime*, filtre par
  nom, groupes repliables (état mémorisé).
- Aides : légende des couleurs et des bordures (bouton `?`), info-bulle par compteur
  (« Errored: messages that failed in this connector »), états vides explicites.
- Nom dans le menu : **Flows Monitoring** comme proposé (à valider, §11).

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
- Cinq étapes visibles par filtre, transformer ou response ; *+N more* ouvre la liste.
- Vues **Line**, **Columns**, **Bands** et **Auto** (Bands à partir de 5 destinations
  ou d'une chaîne de 3, Columns si plusieurs chaînes, sinon Line). Choix mémorisé.
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
| Molette de souris | Zoom autour du pointeur (décision v2) ; `Shift` + molette : défilement horizontal |
| Glisser le fond, ou `Espace` + glisser, ou bouton du milieu | Déplacement |
| Clavier, schéma focalisé | Flèches : déplacement (`Shift` : plus vite) ; `+` / `-` : zoom ; `0` : ajuster ; `1` : 100 % |
| Barre d'outils | `−`, niveau, `+`, *Fit*, *100%* |

- Une seule transformation CSS sur la scène, appliquée dans `requestAnimationFrame`.
  Aucun rendu React pendant un geste (vérifié par un test).
- Détection souris / pavé tactile isolée dans `gestures.js` et testée. Réglage de
  secours dans le menu du zoom : *Wheel zooms* / *Wheel scrolls* (pour les souris à
  défilement fin mal reconnues).
- Changement de vue : la scène s'ajuste (*Fit*) avec une transition courte, coupée si
  `prefers-reduced-motion`. Zoom borné entre 15 % et 300 %.

### 5.5 Aides

Bouton `?` : légende des flèches et des blocs, tableau des gestes. Indice discret au
premier affichage (« Pinch or ⌘ + wheel to zoom… »), masquable et mémorisé. Info-bulles
sur chaque bouton de la barre et sur *Auto* (vue choisie et pourquoi).

## 6. Exigences UX conservées

Décisions validées pendant la v2 dans le mapper, à respecter :

- Interface en anglais ; schéma plein écran.
- Blocs source et destination de même dessin et de même largeur, titre tronqué avec
  info-bulle.
- Tous les liens sont des flèches ; aucun lien sous un bloc ; lecture de gauche à
  droite (sauf vue Columns).
- 5 étapes visibles par composant, *+N more* ouvre une liste.
- Flows : une ligne par canal alignée en haut, compteurs colorés cliquables.

Changement assumé : Flow ne s'ouvre plus automatiquement à l'entrée dans un canal
(c'était un hack) ; il devient une vue Design dédiée et reste un onglet de l'éditeur.

## 7. Démo

Même principe que la démo du mapper, sans FHIR, et démarrable à côté d'elle.

### 7.1 Services (`demo/compose.yaml`)

| Service | Contenu |
|---|---|
| `oie-engine` | Build officiel d'OIE 4.7.0 (profil `build`). `OIE_ENGINE_IMAGE` permet de réutiliser une image déjà construite, par exemple celle du mapper |
| `oie-db` | PostgreSQL 18 |
| `oie-app` | OIE + Web Support 1.3.0 + RBAC 1.3.0 (archives vérifiées par SHA-256) + Flow UI construit dans un étage Node |
| `oie-init` | Script Python (bibliothèque standard) : import, déploiement, rôles, trafic initial |
| `traffic` | Facultatif (profil `traffic`) : envoie des messages en continu pour voir les compteurs bouger |

Port d'administration par défaut **8444** et ports d'exemple **8181-8199** (le mapper
utilise 8443 et 8081-8099), tous réglables dans `.env`. Projet compose
`oie-flow-ui-demo`.

### 7.2 Initialisation (`demo/oie-init/init.py`)

Idempotente : un canal présent n'est pas remplacé, sauf `OIE_INIT_FORCE=true`. Le
trafic initial n'est rejoué que si les canaux viennent d'être importés.

1. Attendre l'API ; marquer la première connexion de `admin` comme faite.
2. Importer les canaux (`channels/*.xml`) et les groupes (`groups.json`).
3. Déployer ; laisser un canal arrêté et un canal en pause pour l'exemple.
4. Importer les rôles RBAC (`rbac/roles.json`) et créer les comptes de démo :
   `operator` (Monitor seulement, deux groupes), `designer` (Design, sans Messages),
   `viewer` (lecture seule).
5. Jouer un jeu de messages déterministe (`messages/`) par l'API
   `POST /api/channels/{id}/messages`, pour obtenir des compteurs variés et
   reproductibles.
6. Afficher un résumé : canaux, compteurs attendus, comptes et mots de passe.

### 7.3 Canaux d'exemple

Chaque canal illustre un point de lecture. Seuls des connecteurs et types natifs
(MLLP/TCP, HTTP, File, Channel Reader/Writer, JavaScript ; HL7v2, JSON, XML, Raw).

| Groupe | Canal | Ce qu'il montre |
|---|---|---|
| Admissions | ADT inbound → archive | Vue Line : une source, une destination |
| Admissions | ADT router | Trois chaînes parallèles (Columns) ; filtre qui écarte les messages de test (*Filtered*) |
| Admissions | ADT to billing (Channel Reader) | Émetteur *Calling channel* ; canal appelé par le routeur |
| Laboratory | Lab results pipeline | Destinations chaînées (*waits for*) : validate → store → notify |
| Laboratory | Lab orders over HTTP | Réponse renvoyée à l'émetteur (flèche violette), postprocessor |
| Laboratory | Lab results file drop | Source interrogée (*Polled*) |
| Integration hub | Hub fan-out | 7 destinations, une désactivée, deux chaînes : Auto choisit Bands |
| Integration hub | Partner gateway | File d'attente vers un hôte injoignable (*Queued*), erreurs de transformer sur un message incomplet (*Errored*) |
| Integration hub | Heavy transformer | 12 étapes : *+7 more*, types d'étapes variés |
| Sandbox | Stopped channel / Paused channel | États arrêté et en pause |

### 7.4 Exemples et parcours

- `demo/examples/send.py` : envoie un message vers les vrais listeners (MLLP, HTTP).
- `demo/examples/demo.http` : appels REST commentés (client REST de l'éditeur).
- `doc/user-guide.md` : parcours de démonstration en cinq minutes (Flows Monitoring →
  compteur Errored → Messages → Flow du canal → étape fautive), puis le même parcours
  avec les comptes `operator` et `viewer` pour montrer RBAC.

## 8. Qualité

- **Tests unitaires** (`node --test`) : modèle de canal, chaînes, statistiques,
  choix Auto, géométrie des trois vues, gestes, i18n. Reprise des cas de
  `channel-flow.test.mjs` et `flow-dashboard.test.mjs` du mapper.
- **Tests de bout en bout** (Playwright, Chromium et WebKit) contre la démo : menus,
  navigation, compteurs, gestes simulés, thèmes clair et sombre, comptes RBAC.
  Captures de la documentation produites par ces tests.
- **Accessibilité** : tout est atteignable au clavier, rôles et libellés ARIA,
  `focus-visible`, contraste vérifié dans les deux thèmes.
- **Performances** : Flows Monitoring avec 200 canaux (option de la démo
  `OIE_DEMO_SCALE`) ; Channel Flow avec 30 destinations. Aucun rendu React pendant un
  geste, rafraîchissement sans saut de mise en page.
- **CI** (GitHub Actions) : lint, tests unitaires, build ; sur tag `vX.Y.Z`, ZIP
  d'extension et `SHA256SUMS` publiés en release, comme le mapper.

## 9. Phases

Chaque phase se termine par une vérification visuelle dans la démo.

| Phase | Contenu | Terminé quand |
|---|---|---|
| **0. Socle et vérifications** | Squelette du dépôt, build esbuild, ZIP sans Java, injection CSS, i18n minimal, deux vues « hello » (Monitor et Design) | Le ZIP s'installe dans OIE 4.7.0 ; les vues apparaissent et respectent RBAC ; les points marqués « à confirmer » sont tranchés (§1) |
| **1. Démo** | compose, Dockerfile, `init.py`, canaux et groupes, rôles RBAC, trafic initial et continu | `docker compose up` donne des compteurs variés et reproductibles et trois comptes de démo |
| **2. Fondations partagées** | Jetons et contrôles UI, `host/`, `model/chains`, `stats`, permissions, aides (`HelpPopover`, `Tooltip`) | Composants communs testés et utilisés par les deux écrans |
| **3. Flows Monitoring** | Vue complète (§4) | Parité avec Flows du mapper, sans hack, liens Flow et droits |
| **4. Channel Flow — schéma** | Modèle, mise en page calculée des trois vues, rendu, vue Design, sélecteur, action Channels | Les canaux d'exemple se lisent correctement dans les trois vues |
| **5. Channel Flow — interaction** | Zoom et déplacement (§5.4), onglet de l'éditeur, ouverture des éditeurs, `+` | Fluide au pavé tactile, à la souris et au clavier, Chrome et Safari |
| **6. Aides et finitions** | Légendes, indices de premier usage, états vides, accessibilité, thèmes | Revue de l'ensemble des écrans, captures à jour |
| **7. Documentation et livraison** | README, guide, architecture, i18n, ADR, CI et release | Release `v0.1.0` installable |
| **8. Retrait dans le mapper** | Supprimer Flow et Flows du mapper, renvoyer vers Flow UI | Les deux plugins installés ensemble ne dupliquent aucune entrée |

## 10. Demandes à faire en amont (Web Admin)

À proposer au projet Web Support / Web Admin. En attendant, le plugin dégrade
proprement, sans manipuler le DOM. Le détail des constats, preuves et contournements
est tenu dans [limites-plateforme.md](limites-plateforme.md).

1. Messages : paramètre `?status=` (et éventuellement `?status=ERROR,QUEUED`).
2. Éditeur de canal : paramètres d'URL pour l'onglet, la destination et le script
   (`?tab=scripts&script=deploy`, `?tab=destinations&metaDataId=3`).
3. Onglet de plugin ouvert par défaut (`registerChannelTab({ default: true })`) ou
   préférence utilisateur.
4. Mécanisme i18n commun (langue de l'utilisateur, catalogues des plugins).

Le plugin détecte ces capacités par `platform.apiVersion` et les active dès qu'elles
existent.

## 11. Décisions à valider

| # | Question | Proposition |
|---|---|---|
| 1 | Où vit Channel Flow ? | Vue Design dédiée + onglet de l'éditeur sans ouverture automatique (§5.1) |
| 2 | Clic sur un compteur de statut | Messages filtré sur le connecteur seulement, jusqu'à `?status=` en amont |
| 3 | Outillage | esbuild + JSX + JSDoc vérifié par `tsc`, pas de TypeScript compilé |
| 4 | Géométrie du schéma | Calculée (§5.3) plutôt que mesurée dans le DOM |
| 5 | Molette de souris | Zoom par défaut (décision v2), réglage *Wheel scrolls* disponible |
| 6 | Identité du plugin | Nom « OIE Flow UI », id et dossier d'extension `flow-ui`, licence MPL-2.0 |
| 7 | Libellés du menu | « Flows Monitoring » (Monitor) et « Channel Flow » (Design) |
| 8 | Langue de la documentation | README en anglais, `doc/` en français (comme le mapper) |
| 9 | Ports de la démo | 8444 et 8181-8199, pour tourner à côté de la démo du mapper |

## 12. Idées pour plus tard

- Compteurs superposés sur les blocs de Channel Flow (pont entre les deux écrans).
- Mini-carte pour les très grands canaux.
- Mode compact de Flows Monitoring (une ligne par canal sans cartes) au-delà de
  200 canaux.
- Liens entre canaux (Channel Writer → Channel Reader) dessinés dans Flows Monitoring.
