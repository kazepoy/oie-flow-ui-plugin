# Pistes techniques pour une future vue Statistiques

Ce document résume les contraintes techniques observées sur les APIs d’Open Integration Engine (OIE 4.7.0) et les choix d’architecture à trancher avant d’implémenter une vue dédiée aux statistiques de messages.

## 1. Ce que les APIs OIE fournissent déjà (sans surcoût)

L’endpoint déjà utilisé par *Suivi des flux* (`GET /api/channels/statuses`, un seul appel périodique) renvoie pour chaque canal et ses connecteurs (`childStatuses`) :

- `statistics` : compteurs cumulés depuis la dernière remise à zéro (`RECEIVED`, `FILTERED`, `SENT`, `ERROR`).
- `lifetimeStatistics` : compteurs cumulés depuis la création du canal.
- `queued` : taille instantanée de la file d’attente par connecteur.
- `state`, `deployedDate`, `deployedRevisionDelta`.

Complété au chargement par `/api/channelgroups`, `/api/channels` (configurations : noms, transports, destinations désactivées) et les tags de canaux, cet ensemble reste très léger côté serveur, même à 200 canaux.

## 2. Limites d’une approche 100 % navigateur (sans agrégation serveur)

Un prototype purement client basé uniquement sur `/api/channels/statuses` montre vite ses limites :

- **Pas de séries temporelles historiques** : OIE n’expose pas d’historique par heure, jour ou semaine sur `/api/channels/statuses`. Le client ne peut tracer qu’une courbe « depuis l’ouverture de la page » par delta entre deux rafraîchissements.
- **Pas de métriques temporelles fines** :
  - *Dernier message traité (date/heure)* : absent de `/api/channels/statuses`. Le lire via `GET /api/channels/{id}/messages?limit=1&includeContent=false` (`receivedDate.time` / `responseDate.time`) coûte `1` requête par canal à chaque rafraîchissement (`N` requêtes au lieu d’une), nécessite `viewMessages` et échoue si `messageStorageMode` ne stocke pas les métadonnées.
  - *Temps de traitement moyen* : absent de l’API. L’estimer côté client oblige à charger les `K` derniers messages (`limit=50..100`) de **chaque** canal pour calculer `responseDate - receivedDate` sur les `connectorMessages` — trop coûteux en base, réseau et parsing JSON, et faussé dès qu’une destination est en file d’attente ou en retry.
- **Pas de filtrage par période / granularité** (*1 h / 24 h / 7 j*, *par heure / par jour*) sans requêter `/api/channels/{id}/messages/count` ou `/messages` par tranche de dates, ce qui reste acceptable uniquement à la demande sur **1 canal** isolé.

## 3. Ce qui est pertinent à construire (Option A — Extension serveur OIE dédiée)

### Pourquoi un nouvel endpoint dédié plutôt que modifier un existant

- `/api/channels/statuses` est appelé toutes les ~5 s par *Suivi des flux*, le *Dashboard* et l’Administrator Swing. Il doit rester léger et instantané : y injecter des séries temporelles historiques alourdirait chaque tick de polling pour tous les clients.
- `/api/channels/{id}/messages/count` ne renvoie qu’un scalaire pour un canal et un jeu de filtres donné : reconstituer des courbes multi-canaux / multi-périodes côté client multiplierait les requêtes HTTP et les scans SQL unitaires.
- Un plugin serveur OIE ne modifie pas les routes Jersey du cœur ; exposer un endpoint dédié sous `/api/extensions/...` (ou une route dédiée dans OIE Core si intégration au cœur) permet d’obtenir en **1 seul appel** les séries et classements nécessaires :
  - Séries temporelles par **période** (`1 h`, `24 h`, `7 j`, `30 j`, plage personnalisée) et **granularité** (`minute`, `heure`, `jour`).
  - Filtres par **groupe**, **tag**, **canal**, **connecteur** (*Source* ou `D1…Dn`) et **statut**.
  - Date du **dernier message traité** et **temps de traitement** (moyenne / p95) calculés côté moteur/SQL.

### Préserver les performances du moteur OIE

1. **Ne pas requêter les tables brutes `d_m*` / `d_mm*` à la volée sur de longues plages** : maintenir des agrégats pré-calculés / *rollups* (par minute/heure/jour, par canal et statut) ou des compteurs glissants en mémoire alimentés au fil du traitement des messages.
2. **Cache court côté serveur (TTL ~10–30 s)** sur les requêtes d’agrégation pour absorber les ouvertures simultanées de plusieurs utilisateurs.
3. **Batching des widgets** : un appel `POST /api/extensions/.../statistics/query` (ou équivalent) acceptant la liste des widgets visibles afin de mutualiser les lectures SQL/mémoire en une seule passe.
4. **Pas de polling agressif sur l’historique** : rafraîchissement manuel (*Actualiser*) ou périodicité lente (ex. 30–60 s uniquement pour la fenêtre *1 h* ou *24 h*), sans recharger les plages *7 j / 30 j* toutes les 5 s.
5. **Garde-fous** : limitation de la plage maximale, timeout SQL dédié et exécution asynchrone/isolée des threads de traitement des canaux pour ne jamais bloquer le routage des messages.

---

## 4. Architecture UI — Tableau de bord par défaut + widgets personnalisables

### Principe général

L’écran **Statistiques** s’ouvre directement sur un **tableau de bord prêt à l’emploi** (sans configuration préalable requise), tout en permettant à un administrateur d’ajouter, réorganiser ou adapter des widgets déclaratifs.

- **Barre de contexte globale en en-tête** : sélecteur de période (`1 h`, `24 h`, `7 j`, `30 j`, plage personnalisée), granularité (`auto`, `minute`, `heure`, `jour`), filtres globaux rapides (groupe, tag, canal) et bouton *Actualiser*.
- **Mise en page par défaut (prête à l’emploi)** :
  1. **Ligne KPI** (4 cartes) : *Messages reçus*, *Messages envoyés*, *Erreurs & taux d’erreur (%)*, *Temps de traitement moyen / p95* (et file d’attente active).
  2. **Courbe temporelle globale** (pleine largeur) : évolution multi-statuts (`Reçus`, `Envoyés`, `Filtrés`, `En erreur`) + superposition optionnelle de la file d’attente.
  3. **Top canaux en erreur / en attente** (tableau ou barres horizontales triées) avec lien direct vers le canal.
  4. **Répartition par groupe ou par tag** (barres empilées par statut).

### Widgets personnalisés (`+ Ajouter un widget`)

Un bouton **`+ Ajouter un widget`** (en mode *Éditer le tableau de bord*) ouvre un configurateur déclaratif sans code :

- **Visualisation** : *KPI*, *Courbe temporelle*, *Taux d’erreur / filtrage (%)*, *Barres empilées*, *Top N (tableau)*, *Heatmap heure × jour*.
- **Métrique(s)** : volumes par statut (`Reçus`, `Envoyés`, `Filtrés`, `En erreur`, `En file`), taux (`% erreur`, `% filtrage`), latence (`moyenne`, `p95`), date du dernier message.
- **Périmètre** : tous les canaux, un ou plusieurs **groupes**, **tags**, **canaux**, ou **connecteurs** (*Source* / `D1…Dn`).
- **Période** : synchronisée sur la barre globale (par défaut) ou **figée** sur le widget (ex. un widget toujours en *30 j* à côté d’une vue globale en *24 h*).
- **Largeur** : `1/3`, `1/2`, `2/3` ou `pleine largeur` sur une grille responsive.
- **Actions en mode édition** : réordonner (glisser-déposer ou flèches), redimensionner, dupliquer, supprimer, et bouton ***Réinitialiser par défaut*** pour revenir à la disposition d’origine du plugin.

### Stockage de la configuration (partagée serveur uniquement)

- **Une seule vue partagée au niveau du serveur** — **aucune vue personnelle par utilisateur**.
- La configuration du tableau de bord (liste ordonnée et paramètres des widgets) est stockée côté serveur (ex. dans les propriétés de l’extension `extensions/Flow UI/properties` ou une ressource de configuration dédiée), éditable par les administrateurs et automatiquement incluse dans les sauvegardes/restaurations de configuration OIE (*Backup / Restore Config*).
- S’il n’existe aucune configuration personnalisée enregistrée sur le serveur, l’UI affiche automatiquement la mise en page par défaut intégrée au plugin.

### Visualisations pertinentes (SVG natif léger, sans dépendance externe)

- **Courbes temporelles multi-statuts** (`Reçus`, `Envoyés`, `Filtrés`, `En erreur`) + superposition de la file d’attente.
- **Taux d’erreur (%) et taux de filtrage (%) dans le temps** (plus parlants que les volumes bruts lors des variations jour/nuit).
- **Comparaison par barres empilées** (par canal, par destination d’un canal, par groupe ou par tag).
- **Heatmap heure × jour** pour identifier les pics de charge et les plages silencieuses.
