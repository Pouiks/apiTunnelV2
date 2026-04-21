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

## Architecture des sources de donnees

Deux sources distinctes alimentent le tunnel :

- **Masterdata (Fabric)** : `GetAllResidences`, `GetOneResidenceById`, `GetOffers` — donnees metier entreprise (non modifiables par le marketing)
- **Admin (surcouche tunnel)** : `GetAdminTR` — donnees marketing/commerciales modifiables par les equipes (flags, photos, modals, steps)

Le serveur mock fusionne automatiquement les deux sources dans les reponses :

- **Flags** : l'admin definit des flags (POPULAR, NEW, etc.) par residence. Si aucune typologie n'est precisee, toutes heritent du flag. Les flags admin se fusionnent (merge) avec les tags masterdata.
- **Photos** : l'admin fournit les photos par residence/typologie. Elles remplacent integralement celles de la masterdata.

## Donnees mock (fichiers par route)

Les reponses statiques sont chargees depuis le dossier [`mock-routes/`](mock-routes/) au demarrage.

| Fichier | Route | Contenu |
| --- | --- | --- |
| `GetAllResidences.json` | `GET /residences` | Listing : residences[] avec commercialName, tag, typologyTags, photos, offerSummaries |
| `GetOneResidenceById.json` | `GET /residences/:id` | Fiche complete par UUID : typologyScenarios, adminOverlay, photos, tag, offers |
| `GetAdminTR.json` | `GET /admin-tr` | Config tunnel : modals, steps + `residenceOverrides` (flags et photos par residence, filtrable par ville) |
| `GetOffers.json` | `GET /offers` | Referentiel offres (aussi injecte dans les deux routes residences) |
| `Opportunity_locataire_seul_majeur.json` | `POST /reservations` | 1 locataire majeur, garant physique |
| `Opportunity_multi_locataire_majeur_garant_physique.json` | `POST /reservations` | 2 locataires majeurs, bail multi, garant physique |
| `Opportunity_locataire_seul_mineur_garant_physique.json` | `POST /reservations` | 1 locataire mineur + représentant légal, garant physique |
| `Opportunity_multi_locataire_dont_1_mineur.json` | `POST /reservations` | 2 locataires dont 1 mineur + représentant légal 2, garant physique |
| `Opportunity_multi_locataire_majeur_garant_moral.json` | `POST /reservations` | 2 locataires majeurs, bail multi, garant moral |
| `Opportunity_multi_locataire_1_mineur_garant_moral.json` | `POST /reservations` | 2 locataires dont 1 mineur + représentant légal 2, garant moral |
| `PostReservationAccepted.json` | `POST /reservations` | Confirmation incluse dans la reponse |

## Routes — synthese rapide

| Methode | Route | Cas d'usage | Status | Reponse |
| --- | --- | --- | --- | --- |
| GET | `/residences` | Dezoom map — catalogue global France | 200 | `{ offersContext, residences[] }` |
| GET | `/cities/:cityAlias/residences` | Selection ville (ex. Paris → 4 ECLA) | 200 | `{ cityAlias, offersContext, residences[] }` |
| GET | `/cities/:cityAlias/residences` | Ville inconnue | 200 | `residences: []` (vide) |
| GET | `/cities/:cityAlias/residences/:id` | Fiche complete d'une residence | 200 | Detail + typologyScenarios + adminOverlay + offers + photos |
| GET | `/cities/:cityAlias/residences/:id` | UUID inconnu | 404 | `{ error, cityAlias, residenceId }` |
| GET | `/admin-tr` | Config globale tunnel (modals, steps) | 200 | `{ modals, steps }` |
| GET | `/admin-tr?city=Paris` | Config tunnel + overrides d'une ville | 200 | `{ modals, steps, residenceOverrides }` |
| GET | `/offers` | Referentiel offres global | 200 | `{ bookingDate, city, offers[] }` |
| POST | `/reservations` | Creation opportunite ECCO (defaut : locataire_seul_majeur) | 200 | `{ status, opportunityId, scenario, availableScenarios, submittedPayload, confirmation }` |
| POST | `/reservations?scenario=multi_locataire_majeur_garant_physique` | 2 locataires majeurs, garant physique | 200 | idem |
| POST | `/reservations?scenario=locataire_seul_mineur_garant_physique` | 1 locataire mineur + représentant légal | 200 | idem |
| POST | `/reservations?scenario=multi_locataire_dont_1_mineur` | 2 locataires dont 1 mineur | 200 | idem |
| POST | `/reservations?scenario=multi_locataire_majeur_garant_moral` | 2 locataires majeurs, garant moral | 200 | idem |
| POST | `/reservations?scenario=multi_locataire_1_mineur_garant_moral` | 2 locataires dont 1 mineur, garant moral | 200 | idem |
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
| `tag` | object or null | Badge residence : `{ code, label }` — codes : POPULAR, SPECIAL_OFFER, NEW, LAST_UNITS. Fusionne avec les flags admin. |
| `typologyTags` | object | Badge par typologyCode : `{ STUDIO: { code, label } }` — un seul actif par typologie. Fusionne avec les flags admin (heritage parent-enfant). |
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

Fiche residence complete en un seul appel. Le `cityAlias` dans le path alimente les etats in-app. Les flags admin sont fusionnes dans `tag` / `typologyTags` et les photos admin remplacent les photos masterdata si presentes.

**Champs supplementaires par rapport au listing :**

| Champ | Type | Description |
| --- | --- | --- |
| `description` | string | Texte descriptif de la residence |
| `commonAmenities` | array | Equipements communs `{ code, label }` |
| `typologyScenarios` | object | 3 scenarios de pricing : `STANDARD`, `EARLY_BIRD`, `HIGH_DEMAND`. Chacun contient `typologies[]` avec pricing, amenities, optionGroups |
| `adminOverlay` | object | Surcouche back-office : managementCompany, contractType, complianceStatus, etc. |
| `photos` | array | Photos admin (remplacent les photos masterdata si un override admin existe) |
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

Configuration du tunnel. Deux modes de chargement :

| Appel | Retourne | Cas d'usage |
| --- | --- | --- |
| `GET /admin-tr` | `modals` + `steps` | Boot du tunnel (config globale) |
| `GET /admin-tr?city=Paris` | `modals` + `steps` + `residenceOverrides` | Selection de ville (flags + photos des residences) |

**Structure modals + steps :**

| Champ | Type | Description |
| --- | --- | --- |
| `modals` | object | Cle = identifiant modal (ex. `STEP_1__EXPRESS_CONDITIONS`). Valeur = `{ step, trigger, fr, en }` |
| `modals[].step` | integer | Numero de step du tunnel |
| `modals[].trigger` | string | Evenement declencheur (ex. `EXPRESS_BOOKING_CLICK`, `PAYMENT_STEP_ENTER`) |
| `modals[].fr` / `.en` | object | `{ title, subtitle, sections[] }` — chaque section : `{ icon, title, description, listHeading, listItems[], infoBox }` |
| `steps` | array | Etapes ordonnees du tunnel : `{ stepCode, order, fr, en }` |

**Structure residenceOverrides (present si `?city=` fourni) :**

| Champ | Type | Description |
| --- | --- | --- |
| `residenceOverrides` | object | Cle = residenceId (UUID). Overrides admin des residences de la ville. |
| `[].flag` | object | `{ code, label, typologies[] }` — flag marketing. Si `typologies` est vide, toutes heritent. |
| `[].photos` | array | Photos admin. Remplacent integralement les photos masterdata. `{ url, alt, order, context, typologyCode }` |

**Heritage parent-enfant des flags :**

- Flag sur residence **sans** typologies specifiees → toutes les typologies de la residence heritent du flag
- Flag sur residence **avec** typologies specifiees → seules celles-ci le portent
- Un seul flag actif a la fois par residence et par typologie

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
curl "http://localhost:8081/admin-tr"                # config globale uniquement
curl "http://localhost:8081/admin-tr?city=Paris"      # + overrides residences Paris
curl "http://localhost:8081/admin-tr?city=Lyon"       # + overrides residences Lyon
```

### GET /offers

Referentiel offres global (vue Fabric / outils). Pour le tunnel React, privilegier les offres embarquees dans `GET /residences` et `GET /residences/:id`.

```bash
curl "http://localhost:8081/offers"
```

### POST /reservations

Simule la creation d'une opportunite dans ECCO (CRM). Le query param `?scenario=` selectionne le fichier mock correspondant au cas metier.

**Scenarios disponibles :**

| Scenario | Fichier | Contacts |
| --- | --- | --- |
| `locataire_seul_majeur` (defaut) | `Opportunity_locataire_seul_majeur.json` | 1 locataire majeur |
| `multi_locataire_majeur_garant_physique` | `Opportunity_multi_locataire_majeur_garant_physique.json` | Locataire + Co-locataire, majeurs |
| `locataire_seul_mineur_garant_physique` | `Opportunity_locataire_seul_mineur_garant_physique.json` | Locataire mineur + Représentant Légal |
| `multi_locataire_dont_1_mineur` | `Opportunity_multi_locataire_dont_1_mineur.json` | Locataire + Co-locataire mineur + Représentant Légal 2 |
| `multi_locataire_majeur_garant_moral` | `Opportunity_multi_locataire_majeur_garant_moral.json` | Locataire + Co-locataire, garant moral |
| `multi_locataire_1_mineur_garant_moral` | `Opportunity_multi_locataire_1_mineur_garant_moral.json` | Locataire + Co-locataire mineur + Représentant Légal 2, garant moral |

**Structure du payload :**

Le tableau `contacts[]` est **dynamique** — seuls les contacts effectivement renseignes sont inclus. Chaque contact porte un `uxc_role` (picklist ECCO) :

| uxc_role.value | label |
| --- | --- |
| `944800000` | Locataire (locataire 1) |
| `944800005` | Co-locataire (locataire 2, bail multi) |
| `944800003` | Représentant Légal Locataire (loc. 1 mineur) |
| `944800011` | Représentant Légal 2 Locataire (loc. 2 mineur) |

Les garants ne sont pas des contacts — ils sont captures via `necessiteDeGarant` et `typeDeGarant` sur l'opportunity (Physique/Moral). Les equipes sales gerent les details apres la pre-reservation.

**Champs obligatoires sur chaque contact** (jamais `null`) : `prenom`, `nom`, `email`, `telephone`, `dateDeNaissance`, `lieuDeNaissance`, `nationalite`, `pays` (GUID Dataverse dans les mocks), `mineur`, `langueDeCommunication`, `adresse`, `codePostal`, `ville`. Le champ `profilLocataire` est **uniquement** pour les locataires / co-locataires (`uxc_role` 944800000 ou 944800005) — il n'est **pas** envoye pour les representants legaux (944800003, 944800011).

- `opportunity` — residence, typologie (`typeDeLot`), bail, dates, montants, picklists CRM (pas de champ `payeur` dans le payload)
  - Garantie : `necessiteDeGarant`, `typeDeGarant` (pas de contact garant dans le payload)
  - `options` / `abonnements` : tableaux de strings — ECCO gere les prix
  - `offres[]` : offres et codes promo (`type` : `offre` ou `code_promo`) ; les frais de dossier offerts passent par une offre (ex. 100 % sur `frais_de_dossier`), pas par un booleen separe

Les champs picklist suivent le format `{ value: <number>, label: "<texte>" }`.

```bash
curl -X POST "http://localhost:8081/reservations"
curl -X POST "http://localhost:8081/reservations?scenario=multi_locataire_majeur_garant_physique"
curl -X POST "http://localhost:8081/reservations?scenario=locataire_seul_mineur_garant_physique"
curl -X POST "http://localhost:8081/reservations?scenario=multi_locataire_dont_1_mineur"
curl -X POST "http://localhost:8081/reservations?scenario=multi_locataire_majeur_garant_moral"
curl -X POST "http://localhost:8081/reservations?scenario=multi_locataire_1_mineur_garant_moral"
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
