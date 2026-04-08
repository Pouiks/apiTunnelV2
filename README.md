# Mock API (Snaplogic contracts)

API REST mock en Node.js + Express pour simuler les appels Snaplogic pendant le developpement du tunnel de reservation.

## Prerequis

- Node.js installe

## Installation et lancement

```bash
npm install
npm run dev
```

Serveur disponible sur `http://localhost:8081`.

## Donnees mock (fichiers par route)

Les reponses statiques sont chargees depuis le dossier [`mock-routes/`](mock-routes/) au demarrage.

| Fichier | Route | Contenu |
| --- | --- | --- |
| `GetAllResidences.json` | `GET /residences` | Listing leger : `brands`, `residences[]` (10 residences, pas de typologyScenarios) |
| `GetOneResidenceById.json` | `GET /residences/:id` | Fiche complete par UUID : description, commonAmenities, typologyScenarios (3 scenarios), adminOverlay |
| `GetOffers.json` | `GET /offers` | Referentiel offres (aussi injecte dans les deux routes residences) |
| `PostReservationAccepted.json` | `POST /reservations` | Reponse fixe de confirmation |

## Routes disponibles

### GET /residences

Retourne le catalogue complet (10 residences : 4 ECLA, 6 UXCO STUDENT).
Filtre optionnel par `?city=` sur `city` ou `cityAlias`.

Chaque residence inclut **`offerSummaries`** (offres applicables). La racine inclut **`offersContext`** (`bookingDate`, `city`) pour aligner le cache React.

```bash
curl "http://localhost:8081/residences"
curl "http://localhost:8081/residences?city=Paris"
curl "http://localhost:8081/residences?city=Lyon"
```

### GET /residences/:id

Fiche residence complete en un seul appel. Inclut :

- **`typologyScenarios`** : les 3 scenarios de pricing (STANDARD, EARLY_BIRD, HIGH_DEMAND), chacun avec typologies/pricing/options/amenities
- **`adminOverlay`** : surcouche back-office (managementCompany, contractType, complianceStatus, etc.)
- **`offerSummaries`** + **`offers`** : offres filtrees par residence
- **`offersContext`** : metadonnees offres pour le cache

```bash
curl "http://localhost:8081/residences/19f2179b-7d14-f011-998a-6045bd1919a1"
curl "http://localhost:8081/residences/ff5544a8-4fa7-ef11-b8e9-6045bd19a503"
```

### GET /offers

Referentiel offres global (vue Fabric / outils). Pour le tunnel React, privilegier les offres embarquees dans `GET /residences` et `GET /residences/:id`.

```bash
curl "http://localhost:8081/offers"
```

### POST /reservations

Retourne une reponse fixe de confirmation.

```bash
curl -X POST "http://localhost:8081/reservations" \
  -H "Content-Type: application/json" \
  -d "{\"any\":\"payload\"}"
```

## Residences mock

| UUID | Nom | Marque | Ville | Alias |
| --- | --- | --- | --- | --- |
| `ff5544a8-4fa7-ef11-b8e9-6045bd19a503` | ALBERT THOMAS | UXCO STUDENT | Lyon | Lyon |
| `045644a8-4fa7-ef11-b8e9-6045bd19a503` | ANDROMAQUE | UXCO STUDENT | Villeurbanne | Villeurbanne |
| `065644a8-4fa7-ef11-b8e9-6045bd19a503` | AQUITAINE | UXCO STUDENT | Begles | Begles |
| `6ff9af84-6e14-f011-998a-6045bd6d55ca` | ATLAS | UXCO STUDENT | Toulouse | Toulouse |
| `0c5644a8-4fa7-ef11-b8e9-6045bd19a503` | BABYLONE | UXCO STUDENT | Villeneuve-d'Ascq | Villeneuve-d'Ascq |
| `359b3195-7814-f011-998a-6045bd6bf874` | BAKER HILL | UXCO STUDENT | Saint-Etienne | Saint-Etienne |
| `19f2179b-7d14-f011-998a-6045bd1919a1` | ECLA GENEVE ARCHAMPS | ECLA | Archamps | Paris |
| `195644a8-4fa7-ef11-b8e9-6045bd19a503` | ECLA MP | ECLA | Massy | Paris |
| `1d5644a8-4fa7-ef11-b8e9-6045bd19a503` | ECLA PALAISEAU EXTENSION OPCO | ECLA | Massy | Paris |
| `1b5644a8-4fa7-ef11-b8e9-6045bd19a503` | ECLA NLG | ECLA | Noisy-le-Grand | Paris |

## Bascule vers Snaplogic reel

Changer uniquement la baseURL du front :

- de `http://localhost:8081`
- vers l'URL Snaplogic

Les contrats d'interface restent identiques.

## Swagger / OpenAPI

La spec OpenAPI est disponible dans `swagger.yaml`.

Avec le serveur mock lance :

- Swagger UI : `http://localhost:8081/docs`
- Spec brute : `http://localhost:8081/openapi.yaml`
