# TODO

Travaux demandés ou repérés, pas encore faits. Les décisions et le contexte sont
dans le [plan](plan.md) ; les limites de la plateforme dans
[limites-plateforme.md](limites-plateforme.md).

## Fonctions

- [ ] **Démarrer, mettre en pause, arrêter depuis Flows Monitoring.** Sur la carte du
  canal : démarrer, pause, reprise, arrêt ; sur chaque carte de connecteur :
  démarrer et arrêter le connecteur. API de Web Admin : `platform.api.status.start /
  pause / resume / stop` et `startConnector / stopConnector`. Droit RBAC
  `startStopChannels` (tâches `doStart`, `doPause`, `doStop`… à confirmer dans la table
  du plugin RBAC) ; boutons masqués sans le droit ; confirmation avant un arrêt ;
  compteurs et état relus aussitôt après l'action.
- [ ] **Vue des liens entre canaux.** Les pastilles « → canal » / « ← canal » sont
  faites (option *Links*). Reste une vue dédiée qui dessine ces liens (graphe des
  canaux, groupes en cadres), utile quand les canaux liés sont dans des groupes
  différents.
- [ ] **Mini-carte** pour les très grands canaux, dans Channel Flow.
- [ ] Filtre de statut dans Messages depuis un compteur, dès que Web Admin accepte
  `?status=` (WA-01) ; ouverture d'un onglet, d'une destination ou d'une étape précis
  de l'éditeur (WA-02).

## Qualité

- [ ] Essai réel au pavé tactile (deux doigts, pincement) et dans Safari (événements
  `gesture*`), à la souris à molette crantée et à défilement fin.
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
