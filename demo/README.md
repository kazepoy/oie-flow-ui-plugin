# Démo OIE Flow UI

OIE 4.7.0 avec Web Support 1.3.0, Role Based Access Control 1.3.0 et Flow UI,
initialisé au démarrage avec la plateforme d'intégration d'un hôpital : 12 canaux
en 4 groupes, des messages traités et des comptes de démonstration.

## Lancer

Docker avec Compose **2.23.1 ou ultérieur** est nécessaire (`configs.content`).

```sh
cd demo
docker compose up -d --build
docker compose logs -f oie-init
```

Le premier lancement compile le moteur OIE 4.7.0 depuis ses sources (plusieurs
minutes).

Administration : <https://localhost:8444/oie-webadmin/> (certificat autosigné).

| Compte | Mot de passe | Rôle | Ce qu'il voit |
|---|---|---|---|
| `admin` | `admin` | Administrateur | Tout |
| `lab-viewer` | `admin` | Laboratory viewer | Flows Monitoring et Messages, groupe *Laboratory* seulement ; chaînes masquées (pas de lecture des canaux) |
| `ops` | `admin` | Operations | Flows Monitoring, Messages et Channel Flow (lecture), tous les canaux ; démarrer et arrêter |
| `integrator` | `admin` | Integrator | Design et Monitor : Channel Flow, éditeur, `+` |
| `auditor` | `admin` | Auditor | Flows Monitoring sans Messages : compteurs visibles, non cliquables |

## Revenir à l'état initial

```sh
docker compose up -d oie-init
# ou, en repartant de volumes vides :
docker compose down -v && docker compose up -d
```

Au démarrage, le service `oie-init` appelle l'API REST d'OIE ([oie-init/init-channels.sh](oie-init/init-channels.sh))
pour restaurer la configuration de base, importer les 12 canaux, groupes, tags,
rôles RBAC et comptes, déployer et rejouer les messages initiaux. Les extensions
éventuelles placées dans `custom-extensions/` sont montées dans `/opt/engine/custom-extensions`.

## Faire bouger les compteurs

Le service `traffic` démarre automatiquement dès la fin de `oie-init` et envoie
un trafic pondéré en continu (~0,2 s entre messages, `TRAFFIC_INTERVAL`).

```sh
docker compose stop traffic                  # suspendre le trafic continu
docker compose up -d traffic                 # le relancer
./examples/send.sh adt                     # admission par le listener MLLP 8181
./examples/send.sh result                  # résultat de laboratoire (MLLP 8184)
./examples/send.sh critical                # résultat critique : bip du biologiste
./examples/send.sh incomplete              # résultat incomplet : erreur de validation
./examples/send.sh claim                   # demande de remboursement : file d'attente
./examples/send.sh hie                     # demande HIE : la synthèse revient à l'appelant
```

Avec le compte `ops` ou `admin`, Flows Monitoring démarre, met en pause et arrête
les canaux et leurs connecteurs depuis leurs cartes ; `docker compose up -d oie-init`
remet la configuration et les états initiaux en place.

[`examples/demo.http`](examples/demo.http) regroupe des appels REST commentés.

## Canaux

| Groupe | Canal | Ce qu'il montre |
|---|---|---|
| Billing & Partners | BILL · Claims to insurer | Hôte injoignable : messages en file d'attente (*Queued*) |
| | HIE · Regional exchange API | Réponse de la destination 2 renvoyée à l'appelant (flèche violette) |
| Laboratory | LAB · Orders to LIS (ORM) | Vue Line, transformer de réponse |
| | LAB · Results from LIS (ORU) | Chaîne validate → store → notify ; résultats incomplets en erreur (*Errored*) |
| | LAB · Critical values | Filtre de 9 règles (*+4 more*) ; presque tout est filtré |
| Operations & Simulators | OPS · Heartbeat | Source JavaScript interrogée chaque minute, scripts deploy/undeploy |
| | SIM · MLLP | Systèmes externes simulés (MLLP, port 7101) |
| | SIM · EHR | Dossier patient informatisé simulé (HTTP, port 7103) |
| Patient Care | ADT · HIS inbound | Listener MLLP 8181, filtre des messages de test (*Filtered*), deux chaînes |
| | ADT · Broadcast to departments | Appelé par le précédent ; 7 destinations, une désactivée : vue Bands |
| | RAD · Orders to RIS | Trois chaînes parallèles : vue Columns |
| | PHARM · Prescriptions (RDE) | Transformer de 12 étapes de types variés, *Destination Set Filter* |

## Ports

| Port | Usage |
|---|---|
| 8444 | Administration web et API (`OIE_HTTPS_PORT`) |
| 8181-8199 | Listeners des canaux (`OIE_CHANNEL_PORTS`) |

Ils diffèrent de ceux de la démo du mapper (8443, 8081-8099) : les deux démos
tournent côte à côte.

## Modifier la démo

La configuration serveur, les canaux, groupes, tags, rôles RBAC, comptes, états
initiaux et messages exemples sont directement dans [`oie-init/data/`](oie-init/data/)
au format XML / REST natif d'OIE. Les modifier puis relancer
`docker compose up -d oie-init` applique les changements.
