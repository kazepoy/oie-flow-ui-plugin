# Sources de la base de démo

Pour les mainteneurs : comment est produit `demo/db/oie-demo.sql.gz`.

```text
channels.mjs         les canaux, groupes, rôles et comptes : la source à modifier
dsl.mjs              le vocabulaire de channels.mjs (connecteurs, étapes, règles)
messages/            les messages joués ({{n}} : numéro, {{ts}} : horodatage)
generated/           produit par tools/generate.mjs : ne pas modifier à la main
tools/               générateur et chargement des modules de Web Admin
build-dump.sh        construit la base et l'exporte
traffic.sh           trafic continu (profil traffic de compose.yaml)
```

## Régénérer

```sh
cd demo
docker compose build oie-app                     # l'image de la démo
seed/tools/extract-webadmin.sh                   # extrait Web Admin dans seed/.webadmin/
cd seed
WEBADMIN_DIR=$PWD/.webadmin node --import ./tools/webadmin/register.mjs tools/generate.mjs
./build-dump.sh                                  # ~5 minutes
```

### Pourquoi passer par Web Admin

`tools/generate.mjs` part des valeurs par défaut que Web Admin donne à un nouveau
connecteur, type de données, étape ou règle : il charge les modules de Web Admin
dans Node (`tools/webadmin/`). Les canaux générés sont donc ceux que l'interface
aurait créés, et `channels.mjs` ne liste que ce qui diffère.

### Ce que fait build-dump.sh

1. Démarre un OIE vide dans un projet compose à part (`oie-flow-ui-seed`, port
   8454) : la démo en cours n'est pas touchée.
2. Importe canaux, groupes, rôles RBAC et comptes par l'API REST, puis déploie.
3. Joue les messages de `generated/messages.txt` par l'API, en nommant les
   destinations : sans elles, l'API n'en sert aucune (OIE-11).
4. Met les canaux dans leur état de démo (en pause, arrêté) et fixe leur état initial.
5. Arrête OIE, exporte la base avec `pg_dump`, supprime le projet.

La base est liée à OIE 4.7.0, RBAC 1.3.0 et au `SERVER_ID` de `compose.yaml` : les
statistiques sont enregistrées par serveur. Régénérer après tout changement de
version ou de canal.
