# Démo OIE Flow UI

OIE 4.7.0 avec Web Support 1.3.0, Role Based Access Control 1.3.0 et Flow UI, sur
une base déjà remplie : la plateforme d'intégration d'un hôpital, 19 canaux en
8 groupes, des messages traités et des comptes de démonstration.

## Lancer

```sh
cd demo
cp .env.example .env    # facultatif
docker compose up -d --build
```

Le premier lancement compile le moteur OIE 4.7.0 depuis ses sources (plusieurs
minutes). Pour réutiliser une image déjà construite, celle de la démo du FHIR
Profile Mapper par exemple, indiquer dans `.env` :

```sh
OIE_ENGINE_CONTEXT=docker-image://fhir-profile-mapper-demo-engine:4.7.0
```

Administration : <https://localhost:8444/oie-webadmin/> (certificat autosigné).

| Compte | Mot de passe | Rôle | Ce qu'il voit |
|---|---|---|---|
| `admin` | `demo-oie-password` | Administrateur | Tout |
| `lab-viewer` | `demo-oie-password` | Laboratory viewer | Flows Monitoring et Messages, groupe *Laboratory* seulement ; chaînes masquées (pas de lecture des canaux) |
| `ops` | `demo-oie-password` | Operations | Flows Monitoring, Messages et Channel Flow (lecture), tous les canaux ; démarrer et arrêter |
| `integrator` | `demo-oie-password` | Integrator | Design et Monitor : Channel Flow, éditeur, `+` |
| `auditor` | `demo-oie-password` | Auditor | Flows Monitoring sans Messages : compteurs visibles, non cliquables |

## Revenir à l'état initial

```sh
./reset.sh      # docker compose down -v, puis up : la base est rechargée
```

La base vient de `db/oie-demo.sql.gz`, chargée par PostgreSQL à la création de son
volume. Tout ce qui a été modifié depuis est perdu.

## Faire bouger les compteurs

```sh
docker compose --profile traffic up -d     # un message toutes les 3 s (TRAFFIC_INTERVAL)
./examples/send.sh adt                     # admission par le listener MLLP 8181
./examples/send.sh result                  # résultat de laboratoire (MLLP 8184)
./examples/send.sh critical                # résultat critique : bip du biologiste
./examples/send.sh incomplete              # résultat incomplet : erreur de validation
./examples/send.sh claim                   # demande de remboursement : file d'attente
./examples/send.sh hie                     # demande HIE : la synthèse revient à l'appelant
```

Avec le compte `ops` ou `admin`, Flows Monitoring démarre, met en pause et arrête
les canaux et leurs connecteurs depuis leurs cartes ; `./reset.sh` remet tout en
place.

[`examples/demo.http`](examples/demo.http) regroupe des appels REST commentés.

## Canaux

| Groupe | Canal | Ce qu'il montre |
|---|---|---|
| Patient Administration | ADT · HIS inbound | Listener MLLP 8181, filtre des messages de test (*Filtered*), deux chaînes |
| | ADT · Broadcast to departments | Appelé par le précédent ; 7 destinations, une désactivée : vue Bands |
| | ADT · Patient merge (A40) | Destinations chaînées (*waits for*) |
| Laboratory | LAB · Orders to LIS (ORM) | Vue Line, transformer de réponse |
| | LAB · Results from LIS (ORU) | Chaîne validate → store → notify ; résultats incomplets en erreur (*Errored*) |
| | LAB · Critical values | Filtre de 9 règles (*+4 more*) ; presque tout est filtré |
| Radiology | RAD · Orders to RIS | Trois chaînes parallèles : vue Columns |
| | RAD · Reports to EHR (MDM) | Pièce jointe (tuile *Attachments*) |
| Pharmacy | PHARM · Prescriptions (RDE) | Transformer de 12 étapes de types variés, *Destination Set Filter* |
| Billing | BILL · Daily charges | Source fichier interrogée (*Polled*), CSV |
| | BILL · Claims to insurer | Hôte injoignable : messages en file d'attente (*Queued*) |
| External Partners | HIE · Regional exchange API | Réponse de la destination 2 renvoyée à l'appelant (flèche violette) |
| | GP · Discharge letters | En pause, erreurs SMTP |
| Operations | OPS · Heartbeat | Source JavaScript interrogée chaque minute, scripts deploy/undeploy |
| | OPS · Legacy interface | Arrêté |
| Simulators | SIM · LIS, RIS, EHR, Pharmacy | Systèmes externes simulés (accusés de réception) |

## Ports

| Port | Usage |
|---|---|
| 8444 | Administration web et API (`OIE_HTTPS_PORT`) |
| 8181-8199 | Listeners des canaux (`OIE_CHANNEL_PORTS`) |

Ils diffèrent de ceux de la démo du mapper (8443, 8081-8099) : les deux démos
tournent côte à côte.

## Modifier la démo

Les canaux, groupes, rôles, comptes et messages se décrivent dans
[`seed/`](seed/README.md), qui régénère la base.
