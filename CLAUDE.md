# Conventions du projet ApiTunnelv2

## Convention de nommage : camelCase

Tous les **noms de champs** des payloads JSON (mock-routes, swagger, code serveur) doivent
respecter la convention `camelCase`.

### Règles

- Les **clés** des objets JSON sont en `camelCase` : `postalCode`, `minimumBaseRent`,
  `sousTypeMarketingFr`, `uxcRole`, `sourceUtmCampaign`, etc.
- Les **valeurs** énumérées (codes métier) restent en `SCREAMING_SNAKE_CASE` :
  `OFFER_SUMMER_2026`, `T1_BIS`, `STEP_1__EXPRESS_CONDITIONS`, `AVAILABLE`, etc.
- Les **clés-identifiants** (UUID, codes énum utilisés comme clés de dictionnaire)
  restent dans leur format natif :
  - UUID : `ff5544a8-4fa7-ef11-b8e9-6045bd19a503`
  - Codes : `STEP_1__EXPRESS_CONDITIONS`
- Les schémas dans `swagger.yaml` doivent refléter exactement les clés des payloads
  (mêmes noms, même casse).

### À éviter

- `snake_case` pour un nom de champ (ex : `postal_code`, `label_fr`, `uxc_role`).
- `PascalCase` pour un nom de champ (ex : `MinimumBaseRent`, `Sous_type`).
- `kebab-case` pour un nom de champ (ex : `sous-type-marketing-fr`).
- Un mélange dans le même payload (ex : `MinimumBaseRent` à côté de `lowestUnitPrice`).

### Lors de l'ajout de nouveaux champs

- Toujours utiliser `camelCase` directement à la création.
- Mettre à jour `swagger.yaml` avec le même nom.
- Si un champ se trouve à la fois dans `mock-routes/*.json` et `swagger.yaml`, vérifier
  que les deux sont alignés.

## Structure du projet

- `server.js` : serveur Express qui sert les mocks via différentes routes.
- `mock-routes/*.json` : fichiers de données chargés par `server.js` (source de vérité
  des payloads renvoyés par l'API mock).
- `swagger.yaml` : spécification OpenAPI servie sur `/docs` et `/openapi.yaml`.
- `scripts/` : scripts utilitaires de migration ponctuelle des mocks.
- `structure/` : templates de référence pour les payloads.

## Vérification

Avant de committer un changement de payload :

1. Démarrer le serveur : `node server.js`.
2. Hitter les endpoints modifiés (`curl http://localhost:8081/...`) et vérifier que les
   clés retournées sont bien en `camelCase`.
3. Vérifier que `swagger.yaml` reflète les mêmes noms de champs.
