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
| `GetAllResidences.json` | `GET /residences` | Listing : residences[] avec commercialName, tag, typologyTags, photos, offerSummaries |
| `GetOneResidenceById.json` | `GET /residences/:id` | Fiche complete par UUID : typologyScenarios, adminOverlay, photos, tag, offers |
| `GetAdminTR.json` | `GET /admin-tr` | Config tunnel : modals FR/EN par step+trigger, steps informatifs |
| `GetOffers.json` | `GET /offers` | Referentiel offres (aussi injecte dans les deux routes residences) |
| `PostReservationAccepted.json` | `POST /reservations` | Reponse fixe de confirmation |

## Routes — synthese rapide

| Methode | Route | Cas d'usage | Status | Reponse |
| --- | --- | --- | --- | --- |
| GET | `/residences` | Dezoom map — catalogue global France | 200 | `{ offersContext, residences[] }` |
| GET | `/cities/:cityAlias/residences` | Selection ville (ex. Paris → 4 ECLA) | 200 | `{ cityAlias, offersContext, residences[] }` |
| GET | `/cities/:cityAlias/residences` | Ville inconnue | 200 | `residences: []` (vide) |
| GET | `/cities/:cityAlias/residences/:id` | Fiche complete d'une residence | 200 | Detail + typologyScenarios + adminOverlay + offers + photos |
| GET | `/cities/:cityAlias/residences/:id` | UUID inconnu | 404 | `{ error, cityAlias, residenceId }` |
| GET | `/admin-tr` | Config globale tunnel (modals, steps) | 200 | `{ modals, steps }` |
| GET | `/offers` | Referentiel offres global | 200 | `{ bookingDate, city, offers[] }` |
| POST | `/reservations` | Soumission reservation (body ignore) | 200 | `{ status: "ACCEPTED", quoteRequestId, eccoOpportunityId, message }` |
| GET | `/docs` | Swagger UI (navigateur) | 200 | HTML |
| GET | `/openapi.yaml` | Spec OpenAPI brute | 200 | YAML |

## Routes — detail

### GET /residences

Catalogue global France (dezoom map). Retourne les 10 residences sans filtre.

**Champs par residence :**

| Champ | Type | Description |
| --- | --- | --- |
| `residenceId` | string (UUID) | Identifiant unique |
| `name` | string | Nom technique |
| `commercialName` | string | Nom commercial (peut differer du nom technique) |
| `brand` | string | `ECLA` ou `UXCO STUDENT` |
| `city` / `cityAlias` | string | Ville reelle / alias de recherche |
| `tag` | object or null | Badge residence : `{ code, label }` — codes : POPULAR, SPECIAL_OFFER, NEW, LAST_UNITS |
| `typologyTags` | object | Badge par typologyCode : `{ STUDIO: { code, label } }` — un seul actif par typologie |
| `photos` | array | URLs S3 simulees — contextes : HERO, COMMON, TYPOLOGY |
| `typologies` | array | Preview par typologie (code, label, baseRent, lowestUnitPrice) |
| `offerSummaries` | array | Offres applicables (injectees par le serveur) |

La racine inclut `offersContext` (`bookingDate`, `city`) pour aligner le cache React.

```bash
curl "http://localhost:8081/residences"
```

### GET /cities/:cityAlias/residences

Residences d'une ville. Filtre sur `cityAlias` ou `city`. Retourne un tableau vide si la ville n'existe pas.

```bash
curl "http://localhost:8081/cities/Paris/residences"     # 4 ECLA
curl "http://localhost:8081/cities/Lyon/residences"       # 1 residence
curl "http://localhost:8081/cities/Inconnu/residences"    # => residences: []
```

### GET /cities/:cityAlias/residences/:id

Fiche residence complete en un seul appel. Le `cityAlias` dans le path alimente les etats in-app.

**Champs supplementaires par rapport au listing :**

| Champ | Type | Description |
| --- | --- | --- |
| `description` | string | Texte descriptif de la residence |
| `commonAmenities` | array | Equipements communs `{ code, label }` |
| `typologyScenarios` | object | 3 scenarios de pricing : `STANDARD`, `EARLY_BIRD`, `HIGH_DEMAND`. Chacun contient `typologies[]` avec pricing, amenities, optionGroups |
| `adminOverlay` | object | Surcouche back-office : managementCompany, contractType, complianceStatus, etc. |
| `offers` | array | Offres completes filtrees par residence |
| `offerSummaries` | array | Resume des offres |
| `offersContext` | object | Metadonnees offres pour le cache |

**Cas d'erreur :**

| Cas | Status | Reponse |
| --- | --- | --- |
| UUID existant | 200 | Fiche complete |
| UUID inconnu | 404 | `{ "error": "Residence not found", "cityAlias": "...", "residenceId": "..." }` |

```bash
curl "http://localhost:8081/cities/Paris/residences/19f2179b-7d14-f011-998a-6045bd1919a1"   # ECLA GENEVE ARCHAMPS
curl "http://localhost:8081/cities/Lyon/residences/ff5544a8-4fa7-ef11-b8e9-6045bd19a503"    # ALBERT THOMAS
curl "http://localhost:8081/cities/Paris/residences/id-inexistant"                            # => 404
```

### GET /admin-tr

Configuration globale du tunnel (independante de la residence). Charge une seule fois au boot.

**Structure :**

| Champ | Type | Description |
| --- | --- | --- |
| `modals` | object | Cle = identifiant modal (ex. `STEP_1__EXPRESS_CONDITIONS`). Valeur = `{ step, trigger, fr, en }` |
| `modals[].step` | integer | Numero de step du tunnel |
| `modals[].trigger` | string | Evenement declencheur (ex. `EXPRESS_BOOKING_CLICK`, `PAYMENT_STEP_ENTER`) |
| `modals[].fr` / `.en` | object | `{ title, subtitle, sections[] }` — chaque section : `{ icon, title, description, listHeading, listItems[], infoBox }` |
| `steps` | array | Etapes ordonnees du tunnel : `{ stepCode, order, fr, en }` |

**Modals disponibles :**

| Cle | Step | Trigger | Contenu |
| --- | --- | --- | --- |
| `STEP_1__EXPRESS_CONDITIONS` | 1 | `EXPRESS_BOOKING_CLICK` | Conditions reservation express (documents, solvabilite, disponibilite) |
| `STEP_2__PAYMENT_INFO` | 2 | `PAYMENT_STEP_ENTER` | Informations de paiement (frais, echeancier) |
| `STEP_3__DOCUMENTS_UPLOAD` | 3 | `DOCUMENTS_STEP_ENTER` | Envoi des documents (formats, validation) |

**Steps du tunnel :**

| Order | Code | FR | EN |
| --- | --- | --- | --- |
| 1 | `CHOOSE_RESIDENCE` | Choisissez votre residence | Choose your residence |
| 2 | `CONFIGURE_STAY` | Configurez votre sejour | Configure your stay |
| 3 | `PAYMENT` | Paiement | Payment |
| 4 | `DOCUMENTS` | Documents | Documents |
| 5 | `CONFIRMATION` | Confirmation | Confirmation |

```bash
curl "http://localhost:8081/admin-tr"
```

### GET /offers

Referentiel offres global (vue Fabric / outils). Pour le tunnel React, privilegier les offres embarquees dans `GET /residences` et `GET /residences/:id`.

```bash
curl "http://localhost:8081/offers"
```

### POST /reservations

Retourne une reponse fixe de confirmation. Le body est ignore (mock).

| Champ reponse | Valeur |
| --- | --- |
| `status` | `ACCEPTED` |
| `quoteRequestId` | `BQ-2026-000123` |
| `eccoOpportunityId` | `OPP-2026-XXXXX` |
| `message` | Reservation creee avec succes dans ECCO. |

```bash
curl -X POST "http://localhost:8081/reservations" \
  -H "Content-Type: application/json" \
  -d "{\"any\":\"payload\"}"
```

## Residences mock

| UUID | Nom | Nom commercial | Marque | Ville | Alias | Tag |
| --- | --- | --- | --- | --- | --- | --- |
| `ff5544a8-…-6045bd19a503` | ALBERT THOMAS | Residence Albert Thomas | UXCO STUDENT | Lyon | Lyon | POPULAR |
| `045644a8-…-6045bd19a503` | ANDROMAQUE | Residence Andromaque | UXCO STUDENT | Villeurbanne | Villeurbanne | — |
| `065644a8-…-6045bd19a503` | AQUITAINE | Residence Aquitaine | UXCO STUDENT | Begles | Begles | NEW |
| `6ff9af84-…-6045bd6d55ca` | ATLAS | Residence Atlas | UXCO STUDENT | Toulouse | Toulouse | SPECIAL_OFFER |
| `0c5644a8-…-6045bd19a503` | BABYLONE | Residence Babylone | UXCO STUDENT | Villeneuve-d'Ascq | Villeneuve-d'Ascq | — |
| `359b3195-…-6045bd6bf874` | BAKER HILL | Residence Baker Hill | UXCO STUDENT | Saint-Etienne | Saint-Etienne | POPULAR |
| `19f2179b-…-6045bd1919a1` | ECLA GENEVE ARCHAMPS | Ecla Geneve-Archamps | ECLA | Archamps | Paris | SPECIAL_OFFER |
| `195644a8-…-6045bd19a503` | ECLA MP | Ecla Massy-Palaiseau | ECLA | Massy | Paris | POPULAR |
| `1d5644a8-…-6045bd19a503` | ECLA PALAISEAU EXT. OPCO | Ecla Palaiseau OPCO | ECLA | Massy | Paris | — |
| `1b5644a8-…-6045bd19a503` | ECLA NLG | Ecla Noisy-le-Grand | ECLA | Noisy-le-Grand | Paris | NEW |

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
