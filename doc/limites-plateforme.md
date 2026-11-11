# Limites de la plateforme

Registre des défauts, manques et limites constatés dans OIE et dans les plugins dont
dépend Flow UI : API publique insuffisante, comportements gênants, points non
documentés. Il sert à trois choses :

- justifier les choix de conception de Flow UI (ce qui est contourné, ce qui est
  abandonné) ;
- préparer les demandes aux projets amont ;
- savoir quoi revérifier à chaque montée de version.

## Versions concernées

| Composant | Version | Source |
|---|---|---|
| Open Integration Engine | 4.7.0 | Build officiel depuis le tag `v4.7.0` |
| Web Support (Web Admin) | 1.3.0 (API plugin `4.10.0`) | [gibson9583/oie-web-support-plugin](https://github.com/gibson9583/oie-web-support-plugin) |
| Role Based Access Control | 1.3.0 | [diridium-com/role-based-access-control](https://github.com/diridium-com/role-based-access-control) |

## Tenir le registre

Une entrée par constat, avec un identifiant stable (`WA-` Web Admin, `WS-` Web Support
côté serveur, `RB-` RBAC, `OIE-` moteur). Une entrée n'est jamais renumérotée ; une
entrée résolue reste, avec la version qui la corrige.

| Champ | Contenu |
|---|---|
| Constat | Ce qui manque ou ne va pas, en une ou deux phrases |
| Preuve | Où on l'a vu : fichier, comportement observé, test |
| Impact | Conséquence pour Flow UI |
| Contournement | Ce que fait Flow UI, sans hack ; « aucun » si la fonction est abandonnée |
| Demande amont | Ce qu'il faudrait côté projet concerné, lien vers l'issue une fois ouverte |

**Statut** : *À vérifier* (supposé, pas encore prouvé), *Ouvert* (prouvé, rien de
fait), *Contourné* (Flow UI vit avec), *Signalé* (issue ouverte), *Résolu* (version).
**Gravité** : *Bloquant* (empêche une fonction), *Gênant* (dégrade l'usage),
*Mineur* (inconfort, documentation).

## Synthèse

| ID | Composant | Constat | Gravité | Statut |
|---|---|---|---|---|
| [WA-01](#wa-01) | Web Admin | Messages : pas de filtre de statut dans l'URL | Gênant | Contourné |
| [WA-02](#wa-02) | Web Admin | Éditeur de canal : pas d'URL pour un onglet, une destination, un script | Gênant | Contourné |
| [WA-03](#wa-03) | Web Admin | Onglets de plugin après les natifs, jamais par défaut | Gênant | Contourné |
| [WA-04](#wa-04) | Web Admin | Onglets de canal non filtrés par tâche RBAC | Mineur | Contourné |
| [WA-05](#wa-05) | Web Admin | Pas d'abonnement public aux changements de route | Mineur | Contourné |
| [WA-06](#wa-06) | Web Admin | Préférences utilisateur non exposées aux plugins | Mineur | À vérifier |
| [WA-07](#wa-07) | Web Admin | Aucun mécanisme i18n | Gênant | Contourné |
| [WA-08](#wa-08) | Web Admin | WAR : entrée importée depuis `blob:`, imports relatifs impossibles | Gênant | Contourné |
| [WA-09](#wa-09) | Web Admin | Clés de `platform.store` non documentées | Mineur | À vérifier |
| [WA-10](#wa-10) | Web Admin | Dashboard : pas de mode d'affichage ajouté par un plugin | Mineur | Contourné |
| [WA-11](#wa-11) | Web Admin | Jetons CSS non documentés | Mineur | Contourné |
| [WA-12](#wa-12) | Web Admin | `apiMin` : version d'API distincte de celle du moteur | Mineur | Ouvert |
| [WA-13](#wa-13) | Web Admin | Types des paquets `@oie/web-*` : publication incertaine | Mineur | À vérifier |
| [WA-14](#wa-14) | Web Admin | Marqueurs SVG non rendus dans certains cas | Mineur | À vérifier |
| [WS-01](#ws-01) | Web Support | Extension sans code Java : servie ou non | Bloquant si non | À vérifier |
| [WS-02](#ws-02) | Web Support | Interfaces des plugins absentes sans Web Support | Mineur | Ouvert |
| [RB-01](#rb-01) | RBAC | Tâche inconnue autorisée ; pas de permission propre sans Java | Gênant | Contourné |
| [RB-02](#rb-02) | RBAC | Refus transitoire tant que les permissions ne sont pas chargées | Mineur | À vérifier |
| [RB-03](#rb-03) | RBAC | Liens internes aux vues de plugin non couverts | Mineur | Contourné |
| [RB-04](#rb-04) | RBAC | Format d'import des rôles non documenté | Mineur | À vérifier |
| [RB-05](#rb-05) | RBAC | Échec du plugin d'autorisation : tous les plugins bloqués | Mineur | Ouvert |
| [RB-06](#rb-06) | RBAC | Restriction par liste de canaux, pas par groupe | Gênant | Ouvert |
| [OIE-01](#oie-01) | Moteur | `waitForPrevious` toujours `false` dans les statuts | Gênant | Contourné |
| [OIE-02](#oie-02) | Moteur | Statuts limités aux connecteurs déployés | Mineur | Contourné |
| [OIE-03](#oie-03) | Moteur | *Queued* hors de la table des statistiques | Mineur | Contourné |
| [OIE-04](#oie-04) | Moteur | Pas d'historique des statistiques | Gênant | À vérifier |
| [OIE-05](#oie-05) | Moteur | `X-Requested-With` exigé sur toute l'API | Mineur | Contourné |
| [OIE-06](#oie-06) | Moteur | Réponses REST irrégulières (204 vide, corps vide, booléen en 200) | Mineur | Contourné |
| [OIE-07](#oie-07) | Moteur | Assistant de première connexion à désactiver par l'API | Mineur | Contourné |
| [OIE-08](#oie-08) | Moteur | Image Docker construite depuis les sources | Mineur | À vérifier |
| [OIE-09](#oie-09) | Moteur | Redémarrage nécessaire après installation d'une extension | Mineur | Ouvert |
| [OIE-10](#oie-10) | Moteur | JAR d'API absents de Maven Central | Mineur | Ouvert |

---

## Web Admin 1.3.0

### WA-01

**Messages : pas de filtre de statut dans l'URL.** · Gênant · Contourné

- **Constat.** La vue Messages ne lit que `?messageId=` et `?metaDataId=`. Ni statut,
  ni période, ni texte.
- **Preuve.** `assets/messages-*.js` : le composant reçoit `query` et n'en lit que ces
  deux clés (`includedMetaDataIds = [Number(query.metaDataId)]`).
- **Impact.** Un clic sur le compteur *Errored* ne peut pas ouvrir les seuls messages
  en erreur. Le mapper cochait le menu *Status* en simulant des clics.
- **Contournement.** Messages filtré sur le connecteur ; l'info-bulle le dit.
- **Demande amont.** `?status=ERROR` (liste séparée par des virgules), puis
  `?startDate=` / `?endDate=`.

### WA-02

**Éditeur de canal : pas d'URL pour un onglet, une destination, un script.** · Gênant · Contourné

- **Constat.** Les filtres, transformers et responses ont leur route
  (`/channels/:id/filter/:metaDataId`…). L'onglet actif de l'éditeur, la destination
  sélectionnée et le script affiché sont un état interne, sans route ni API.
- **Preuve.** `assets/channel-editor-*.js` : l'onglet courant est un état React local.
- **Impact.** Un clic sur un connecteur ou un script dans Channel Flow ne peut pas
  ouvrir le bon endroit. Le mapper passait par le DOM (focus d'onglet Radix, setter
  natif de `select`, lignes `.dest-grid`).
- **Contournement.** Ouverture de l'éditeur du canal, sans ciblage.
- **Demande amont.** `/channels/:id/edit?tab=destinations&metaDataId=3`,
  `?tab=scripts&script=deploy`, `?tab=source`.

### WA-03

**Onglets de plugin après les natifs, jamais par défaut.** · Gênant · Contourné

- **Constat.** L'ordre est fixe : `Summary`, `Source`, `Destinations`, `Scripts`, puis
  les onglets de plugin. Aucun moyen d'ouvrir l'éditeur sur un onglet de plugin.
- **Preuve.** `assets/channel-editor-*.js` :
  `["Summary","Source","Destinations","Scripts",...channelTabs().map(t => t.label)]`.
- **Impact.** L'ouverture automatique de Flow, validée en v2, demandait un hack.
- **Contournement.** Channel Flow devient une vue Design ; l'onglet reste, sans
  ouverture automatique.
- **Demande amont.** `registerChannelTab({ default: true })` ou préférence utilisateur
  « onglet d'ouverture ».

### WA-04

**Onglets de canal non filtrés par tâche RBAC.** · Mineur · Contourné

- **Constat.** Les onglets du Dashboard sont filtrés par
  `checkTask("dashboard", tab.task)`. Les onglets de l'éditeur de canal ne le sont pas :
  le champ `task` serait ignoré.
- **Preuve.** `assets/dashboard-*.js` (filtre présent) et
  `assets/channel-editor-*.js` (aucun filtre sur `channelTabs()`).
- **Impact.** Un onglet de plugin s'affiche quel que soit le rôle.
- **Contournement.** L'onglet vérifie lui-même les droits et masque ses actions.
- **Demande amont.** Respecter `task` (groupe `channel`) sur `registerChannelTab`.

### WA-05

**Pas d'abonnement public aux changements de route.** · Mineur · Contourné

- **Constat.** `platform.router` n'offre que `navigate` et `currentPath`. Le routeur
  émet un `CustomEvent("route:changed")` sur `window`, hors de l'API documentée.
- **Preuve.** `core/router.js` (`window.dispatchEvent(new CustomEvent('route:changed', …))`)
  et `core/platform.js` (`router: { navigate, currentPath }`).
- **Impact.** Réagir à une navigation demande un événement non contractuel.
- **Contournement.** Flow UI n'écoute pas les routes : tout passe par le cycle de vie
  de ses vues.
- **Demande amont.** `platform.router.subscribe(listener)` ou `platform.events` avec un
  nom d'événement documenté.

### WA-06

**Préférences utilisateur non exposées aux plugins.** · Mineur · Contourné

- **Constat.** Web Admin a un module de préférences (`getPref`, `setPrefs`,
  `onPrefsChange`) mais ne le transmet pas aux plugins.
- **Preuve.** `core/prefs.js` ; absent de `core/platform.js` et des paquets
  `@oie/web-*`.
- **Impact.** Sans contournement, les réglages du plugin resteraient propres au
  navigateur, pas à l'utilisateur.
- **Contournement.** Préférences de l'utilisateur dans OIE par l'API REST
  (`PUT /api/users/{id}/preferences/flowui.*`). La table `person_preference` accepte
  des noms libres (la démo y écrit déjà `firstlogin`) ; reste à vérifier qu'un
  utilisateur sans droits d'administration peut écrire les siennes. Repli sur
  `localStorage` en cas d'échec. Code dans `src/host/preferences.js`.
- **Demande amont.** `platform.prefs` avec un espace de noms par plugin.

### WA-07

**Aucun mécanisme i18n.** · Gênant · Contourné

- **Constat.** Web Admin est entièrement en anglais, sans catalogue ni réglage de
  langue.
- **Preuve.** Aucune trace d'i18n dans le bundle principal (seul `Intl` est utilisé pour
  les formats).
- **Impact.** Chaque plugin choisit sa langue seul ; risque d'interface mélangée.
- **Contournement.** i18n propre au plugin (`src/i18n/`), langue du navigateur, repli
  sur l'anglais.
- **Demande amont.** Langue de l'utilisateur et chargement des catalogues des plugins.

### WA-08

**WAR : entrée importée depuis `blob:`, imports relatifs impossibles.** · Gênant · Contourné

- **Constat.** En déploiement WAR, Web Admin télécharge l'entrée du plugin avec
  l'en-tête `X-Requested-With`, puis l'importe depuis une URL `blob:`. Les imports
  relatifs ne se résolvent pas. Le déploiement Node/Docker, lui, les accepte : le même
  plugin se comporte différemment selon l'hébergement.
- **Preuve.** `core/platform.js`, `loadPluginsOnce` (commentaire et branche `war`).
- **Impact.** Un plugin en plusieurs fichiers ne se charge pas en WAR. Le mapper
  rechargeait chaque fichier avec `getAssetText` puis `import(blob:)`.
- **Contournement.** Build esbuild vers un seul `plugin.js` ; seuls les imports
  `@oie/*` (import map) restent externes.
- **Demande amont.** Résoudre les imports relatifs en WAR (par exemple un service
  worker ou un import map par plugin), ou documenter l'exigence d'un fichier unique.

### WA-09

**Clés de `platform.store` non documentées.** · Mineur · À vérifier

- **Constat.** Des clés comme `editingChannel`, `serverVersion` ou `user` sont lues ou
  écrites par les plugins sans être décrites comme contrat. Le mapper écrit
  `editingChannel` avant d'ouvrir la route d'un filtre.
- **Impact.** Une montée de version peut les renommer sans prévenir.
- **Contournement.** Accès regroupés dans `src/host/` ; à vérifier en phase 0 si l'écriture
  de `editingChannel` est nécessaire pour ouvrir un filtre depuis la vue Design.
- **Demande amont.** Liste des clés stables, ou fonctions dédiées
  (`platform.channelEditor.open(channel, target)`).

### WA-10

**Dashboard : pas de mode d'affichage ajouté par un plugin.** · Mineur · Contourné

- **Constat.** Le Dashboard propose cartes et tableau. Un plugin peut ajouter un onglet
  sous le Dashboard ou une colonne, pas un troisième mode d'affichage.
- **Preuve.** Constaté pendant la v2 du mapper ; API limitée à
  `registerDashboardTab` et `registerDashboardColumn`.
- **Impact.** Flows Monitoring ne peut pas être une vue du Dashboard.
- **Contournement.** Entrée séparée dans Monitor (`registerView` + `registerNavItem`).
- **Demande amont.** `registerDashboardView({ id, label, component })`.

### WA-11

**Jetons CSS non documentés.** · Mineur · Contourné

- **Constat.** Les variables `--bg0..3`, `--text`, `--text-dim`, `--line`, `--accent`,
  `--ok`, `--warn`, `--err`, `--violet`, `--font-mono` existent dans le CSS compilé,
  sans être décrites comme contrat. Thème sombre par défaut, clair avec
  `[data-theme=light]`.
- **Preuve.** `assets/index-*.css`.
- **Impact.** Un renommage casserait les couleurs du plugin.
- **Contournement.** `tokens.css` dérive tout de ces variables avec des valeurs de
  repli.
- **Demande amont.** Documenter les jetons stables.

### WA-12

**`apiMin` : version d'API distincte de celle du moteur.** · Mineur · Ouvert

- **Constat.** Le contrat dit que la version d'API suit la ligne de version d'OIE, mais
  Web Admin 1.3.0 déclare `4.10.0` sur un moteur 4.7.0. On ne sait pas quelle valeur
  déclarer pour exiger « les API de Web Admin 1.3 ».
- **Preuve.** `core/platform.js`, `OIE_API_VERSION = '4.10.0'`.
- **Impact.** Risque de déclarer un `apiMin` trop bas (plugin chargé, puis erreur) ou
  trop haut (plugin refusé).
- **Contournement.** À fixer en phase 0 d'après les API réellement utilisées.
- **Demande amont.** Table « version d'API → fonctions ajoutées ».

### WA-13

**Types des paquets `@oie/web-*` : publication incertaine.** · Mineur · À vérifier

- **Constat.** Les sources indiquent que les déclarations de types sont générées pour
  les auteurs de plugins ; leur publication (npm ou autre) n'est pas établie.
- **Impact.** Vérification de types du plugin à faire sans les types officiels.
- **Contournement.** JSDoc locale dans `src/host/`.

### WA-14

**Marqueurs SVG non rendus dans certains cas.** · Mineur · À vérifier

- **Constat.** Le mapper dessine les pointes de flèche en `path` parce que les
  `marker` SVG « ne s'affichent pas dans tous les hôtes ». Cause non établie.
- **Contournement.** Pointes dessinées en `path`, comme dans le mapper.

## Web Support 1.3.0 (serveur)

### WS-01

**Extension sans code Java : servie ou non.** · Bloquant si non · À vérifier

- **Constat.** Web Support découvre `extensions/<path>/webadmin/plugin.json` à partir
  des métadonnées des plugins installés. Un `plugin.xml` sans `serverClasses` ni
  bibliothèque devrait suffire, mais rien ne le garantit.
- **Preuve.** `WebSupportServlet.class` (`getPluginMetaData`, `WEBADMIN_DIR`,
  `plugin.json`).
- **Impact.** Si ce n'est pas le cas, Flow UI doit embarquer une classe Java vide.
- **Contournement.** À trancher en phase 0.

### WS-02

**Interfaces des plugins absentes sans Web Support.** · Mineur · Ouvert

- **Constat.** Sans Web Support (ni points d'accès natifs du moteur), Web Admin ne
  charge aucune interface de plugin servie par le moteur.
- **Preuve.** `core/platform.js`, `fetchEngineManifests`.
- **Impact.** Web Support est un prérequis de Flow UI ; à écrire dans le README.

## Role Based Access Control 1.3.0

### RB-01

**Tâche inconnue autorisée ; pas de permission propre sans Java.** · Gênant · Contourné

- **Constat.** `checkTask` renvoie `true` pour une tâche absente de ses tables. Une
  permission propre à un plugin se déclare côté serveur (permissions d'extension Java)
  et remonte par `/extensions/rbac/permissions/extensions`.
- **Preuve.** `rbac/webadmin/web/plugin.js`, `checkTask` (`if (required == null) return true`).
- **Impact.** Flow UI, sans Java, ne peut pas avoir de permission « View Flows » ;
  inventer un nom de tâche reviendrait à tout autoriser.
- **Contournement.** Réutiliser les tâches natives (`doShowDashboard`, `doShowChannel`,
  `doShowMessages`, `doEditChannel`).
- **Demande amont.** Permissions déclarées dans `plugin.json` côté Web Admin, ou
  refus par défaut d'une tâche inconnue préfixée par un id de plugin.

### RB-02

**Refus transitoire tant que les permissions ne sont pas chargées.** · Mineur · À vérifier

- **Constat.** Tant que les permissions ne sont pas chargées, `checkTask` renvoie
  `false` et relance un chargement. Aucun événement public ne prévient les plugins
  quand elles arrivent.
- **Preuve.** `rbac/webadmin/web/plugin.js`, `checkTask` (`permissions == null`).
- **Impact.** Un bouton évalué trop tôt peut rester masqué jusqu'au rendu suivant.
- **Contournement.** Évaluer les droits au rendu, jamais une fois pour toutes ; à
  vérifier dans la démo.

### RB-03

**Liens internes aux vues de plugin non couverts.** · Mineur · Contourné

- **Constat.** RBAC masque les entrées de menu, boutons de tâches et actions marqués
  d'une tâche. Les liens dessinés par une vue de plugin ne sont pas concernés.
- **Preuve.** Mapper : *Edit* affiché sans `manageChannels`, l'éditeur répond
  *Access denied*.
- **Contournement.** Chaque lien et action vérifie `platform.checkTask` (plan §3.5).

### RB-04

**Format d'import des rôles non documenté.** · Mineur · À vérifier

- **Constat.** `POST /api/extensions/rbac/roles/_import` existe (options `dryRun`,
  `applyChannels`, `matchChannelsByName`) ; le format du fichier est à établir à
  partir d'un export.
- **Impact.** Initialisation de la démo (rôles et comptes).
- **Contournement.** Créer les rôles dans l'interface, exporter, versionner l'export.

### RB-05

**Échec du plugin d'autorisation : tous les plugins bloqués.** · Mineur · Ouvert

- **Constat.** Si RBAC ne se charge pas, Web Admin bloque toutes les vérifications de
  droits et l'enregistrement des autres plugins.
- **Preuve.** `core/platform.js` (plugin d'autorisation obligatoire, `blockAuthorization`).
- **Impact.** Comportement de sécurité voulu, mais Flow UI disparaît avec lui. À
  mentionner dans le dépannage.

### RB-06

**Restriction par liste de canaux, pas par groupe.** · Gênant · Ouvert

- **Constat.** Un rôle restreint liste des canaux un par un. Il n'existe pas de
  restriction « tous les canaux du groupe X ».
- **Preuve.** Schéma de la base : `rbac_role.restricted` et
  `rbac_role_channel (role_id, channel_id)`, sans référence aux groupes.
- **Impact.** Un rôle « consultation du laboratoire » ne suit pas le groupe : un canal
  ajouté ensuite au groupe *Laboratory* reste invisible tant qu'on ne l'ajoute pas au
  rôle. Dans la démo, le rôle `lab-viewer` est figé au moment du dump.
- **Contournement.** Aucun dans Flow UI ; documenté dans le guide de la démo.
- **Demande amont.** Restriction par groupe de canaux, évaluée à chaque requête.

## Open Integration Engine 4.7.0

### OIE-01

**`waitForPrevious` toujours `false` dans les statuts.** · Gênant · Contourné

- **Constat.** Les statuts du Dashboard (`/api/channels/statuses`) indiquent toujours
  `waitForPrevious = false` pour les destinations.
- **Preuve.** Constaté pendant la v2 du mapper.
- **Impact.** Les chaînes de destinations doivent venir de la configuration complète
  des canaux, coûteuse avec beaucoup de canaux.
- **Contournement.** Configuration lue à l'ouverture et sur *Refresh* seulement.
- **Demande amont.** Renseigner `waitForPrevious` dans `DashboardStatus`.

### OIE-02

**Statuts limités aux connecteurs déployés.** · Mineur · Contourné

- **Constat.** Les destinations désactivées ne figurent pas dans les statuts.
- **Impact.** Flows Monitoring ne les montre pas, alors que Channel Flow les dessine.
- **Contournement.** Assumé et documenté : Flows Monitoring montre ce qui tourne.

### OIE-03

**Queued hors de la table des statistiques.** · Mineur · Contourné

- **Constat.** *Queued* est un champ à part (`queued`), pas une entrée de
  `statistics` ; les statistiques existent en version courante et `lifetimeStatistics`.
- **Contournement.** Lecture centralisée dans `shared/model/stats.js`.

### OIE-04

**Pas d'historique des statistiques.** · Gênant · À vérifier

- **Constat.** L'API semble ne donner que des compteurs cumulés, sans série temporelle.
- **Impact.** Débit ou tendance seulement par échantillonnage côté navigateur, perdu au
  rechargement.
- **Contournement.** Pas de tendance dans la v1 ; à reconsidérer.

### OIE-05

**`X-Requested-With` exigé sur toute l'API.** · Mineur · Contourné

- **Constat.** Toute requête `/api` doit porter `X-Requested-With`. Un `import()` de
  navigateur ne peut pas l'ajouter, d'où le chargement par `blob:` de [WA-08](#wa-08).
- **Contournement.** Sans objet pour Flow UI au-delà du bundle unique ; les scripts de
  la démo envoient l'en-tête.

### OIE-06

**Réponses REST irrégulières.** · Mineur · Contourné

- **Constat.** `GET /channels/{id}` d'un canal absent : HTTP 204 sans corps.
  `POST /channels/{id}/_deploy?returnErrors=true` : corps vide en cas de succès.
  Certains refus répondent HTTP 200 avec `<boolean>false</boolean>`.
- **Preuve.** `demo/oie-init/init-channels.sh` du mapper.
- **Contournement.** Fonctions d'appel de l'init qui traitent ces trois cas.

### OIE-07

**Assistant de première connexion à désactiver par l'API.** · Mineur · Contourné

- **Constat.** Tant que la préférence `firstlogin` du compte n'est pas `false`, Web Admin
  impose un changement de mot de passe.
- **Contournement.** L'init écrit `PUT /users/{id}/preferences/firstlogin` = `false`.

### OIE-08

**Image Docker construite depuis les sources.** · Mineur · À vérifier

- **Constat.** La démo du mapper construit OIE 4.7.0 depuis le dépôt (build Gradle
  long). Existence d'une image officielle publiée à vérifier.
- **Contournement.** `OIE_ENGINE_IMAGE` pour réutiliser une image déjà construite.

### OIE-09

**Redémarrage nécessaire après installation d'une extension.** · Mineur · Ouvert

- **Impact.** Chaque essai d'une nouvelle version du plugin hors démo demande un
  redémarrage du moteur. La démo reconstruit l'image.

### OIE-10

**JAR d'API absents de Maven Central.** · Mineur · Ouvert

- **Constat.** Les JAR du moteur s'extraient d'une installation ou de l'image.
- **Impact.** Aucun tant que Flow UI reste sans Java ; à reprendre si [WS-01](#ws-01)
  impose une classe Java.
