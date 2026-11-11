# Architecture

## Principe

Flow UI n'utilise que l'API publique des plugins de Web Admin. Ce qu'elle ne
permet pas est dégradé proprement et noté dans [limites-plateforme.md](limites-plateforme.md).
Le but est que ce code puisse un jour rejoindre Web Admin.

## Chargement

`build.mjs` regroupe `src/` en un seul module (`webadmin/web/plugin.js`) avec
esbuild : en déploiement WAR, Web Admin importe l'entrée d'un plugin depuis une URL
`blob:`, où un import relatif ne fonctionne pas (WA-08). Les feuilles CSS sont
incluses comme texte et injectées une fois par `src/host/styles.js`. Le JSX est
compilé vers `h()` (`src/host/react.js`), lié au React de l'hôte : aucune copie de
React dans le bundle.

L'extension n'a pas de code Java : `plugin.xml` décrit l'extension, Web Support sert
son dossier `webadmin/` (WS-01, vérifié).

## Modules

```text
src/
  index.js            register(platform) : vues, entrées de menu, onglet, action
  styles.js           ordre des feuilles CSS
  host/               seul dossier qui lit `platform`
    platform.js         l'objet platform, l'utilisateur, les messages
    react.js            React de l'hôte, h() et hooks
    api.js              statuts, groupes, canaux, préférences (API de Web Admin)
    routes.js           chemins des vues et navigation
    permissions.js      tâches RBAC et can()
    editor.js           types d'étapes, ajout d'une étape, ouverture des éditeurs
    preferences.js      réglages de l'utilisateur (préférences OIE)
    session.js          état des vues pour la session (sessionStorage)
    styles.js           injection des feuilles
  i18n/               t(), pluriels, nombres ; locales/en.js
  shared/
    model/              lecture XStream, chaînes de destinations, statistiques
    ui/                 boutons, popover, aide, indice, état vide, réglages
    styles/             jetons (tokens.css) et contrôles communs
  settings/           bouton et panneau des réglages
  flows-monitoring/   écran Flows Monitoring
  channel-flow/
    model/              canal → blocs et tuiles, choix Auto, liste du sélecteur
    layout/             géométrie, trois vues, flèches : fonctions pures
    viewport/           zoom et déplacement : fonctions pures et hook
    *.jsx               vue Design, onglet de l'éditeur, schéma, popovers, aide
```

Règles :

- seul `src/host/` lit `platform` ; le reste reçoit des données et des fonctions ;
- la logique (modèles, mise en page, gestes) est en `.js`, testée sans navigateur ;
  les composants (`.jsx`) l'affichent ;
- toute couleur vient de `shared/styles/tokens.css`, dérivé des variables de Web
  Admin (thèmes clair et sombre) ;
- tout texte visible passe par `t()` ([i18n.md](i18n.md)).

## Flux de données

**Flows Monitoring.** `useStatuses` lit les statuts toutes les N secondes (onglet
visible), les groupes et les configurations des canaux au chargement et sur
*Refresh* : les statuts ne disent pas quelles destinations s'attendent (OIE-01).
`model.js` en tire groupes → lignes → chaînes → compteurs.

**Channel Flow.** `flowModel` transforme la configuration du canal (enregistrée,
ou brouillon de l'éditeur) en blocs et tuiles. `layoutScene` calcule les positions
et les flèches pour la vue choisie, à partir des tailles de `geometry.js`, sans
mesurer la page. `Scene.jsx` place tout en absolu. `useViewport` applique le zoom
et le déplacement par une transformation CSS, une fois par image, sans rendu React.

## État

| Quoi | Où | Durée |
|---|---|---|
| Réglages (vue par défaut, molette, groupes, rafraîchissement, aides masquées) | Préférence OIE `flowui.settings` de l'utilisateur ; repli `localStorage` | Permanents, sur tous ses navigateurs |
| Vue, zoom et position par canal ; filtre, groupes et défilement de Flows Monitoring | `sessionStorage`, clés `oie.flow-ui.*` | L'onglet du navigateur |

## Tests

- `npm test` : tests unitaires (`node:test`) des modèles, de la géométrie (rien ne se
  chevauche, aucune flèche ne traverse une tuile), des gestes, de l'i18n.
- `npm run check` : vérification de types du JavaScript (JSDoc, `tsc --checkJs`).
- `npm run test:e2e` : Playwright contre la démo, avec les comptes RBAC.
