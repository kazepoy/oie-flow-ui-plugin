# TODO

Travaux demandés ou repérés, pas encore faits. Les décisions et le contexte sont
dans le [plan](plan.md) ; les limites de la plateforme dans
[limites-plateforme.md](limites-plateforme.md).

## Fonctions

- [x] **Démarrer, mettre en pause, arrêter depuis Flows Monitoring** (fait le
  2026-11-11) : commandes du canal selon son état, arrêt et démarrage de chaque
  connecteur d'un canal démarré, confirmation avant un arrêt, tâches RBAC `doStart`,
  `doPause`, `doStop`, `doStartConnector`, `doStopConnector` (`startStopChannels`).
  Reste à envisager : l'arrêt forcé (*Halt*) et des commandes groupées par groupe.
- [ ] **Vue des liens entre canaux.** Les mentions *Sends to* / *Called by* sont
  faites (option *Links*). Reste une vue dédiée qui dessine ces liens (graphe des
  canaux, groupes en cadres), utile quand les canaux liés sont dans des groupes
  différents.
- [ ] **Mini-carte** pour les très grands canaux, dans Channel Flow.
- [ ] Filtre de statut dans Messages depuis un compteur, dès que Web Admin accepte
  `?status=` (WA-01), et champ *Connector* à jour (WA-15) ; ouverture d'un onglet, d'une destination ou d'une étape précis
  de l'éditeur (WA-02).

## Qualité

- [ ] Essai réel au pavé tactile (deux doigts, pincement) et dans Safari (événements
  `gesture*`), à la souris à molette crantée et à défilement fin (molette = défilement,
  Ctrl/⌘ + molette = zoom).
- [ ] Revue d'accessibilité : navigation au clavier dans le schéma, lecteur d'écran,
  contraste des deux thèmes.
- [ ] ESLint (`react/jsx-no-literals`) et Stylelint (couleurs hors `tokens.css`),
  prévus au plan.
- [ ] Performances avec 200 canaux (second dump `oie-scale.sql.gz`).
- [ ] Faire tourner la CI (`.github/workflows/build.yml`) une fois le dépôt publié.

## Projet

- [ ] Retirer Flow et Flows du FHIR Profile Mapper (phase 8 du plan).
- [ ] Signaler en privé RB-07 (préférences d'autres utilisateurs modifiables) aux
  projets RBAC et OIE.
- [ ] Proposer à Web Admin les demandes du §10 du plan (`?status=`, paramètres
  d'URL de l'éditeur, onglet par défaut, i18n).
