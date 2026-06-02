const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8081;

const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];

const MOCK_ROUTES_DIR = path.join(__dirname, "mock-routes");

function loadMockJSON(filename) {
  const fullPath = path.join(MOCK_ROUTES_DIR, filename);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

const allResidencesPayload = loadMockJSON("GetAllResidences.json");
const residenceDetailsById = loadMockJSON("GetOneResidenceById.json");
const adminTRPayload = loadMockJSON("GetAdminTR.json");
const opportunityScenarios = {
  locataire_seul_majeur: loadMockJSON("Opportunity_locataire_seul_majeur.json"),
  locataire_seul_mineur_garant_physique: loadMockJSON(
    "Opportunity_locataire_seul_mineur_garant_physique.json",
  ),
};
const postReservationAccepted = loadMockJSON("PostReservationAccepted.json");

const swaggerPath = path.join(__dirname, "swagger.yaml");

const adminOverrides = adminTRPayload.residenceOverrides || {};

function getAdminOverride(residenceId) {
  return adminOverrides[residenceId] || null;
}

function filterOverridesByCity(cityFilter) {
  const key = cityFilter.toLocaleLowerCase();
  const result = {};
  for (const [id, ov] of Object.entries(adminOverrides)) {
    if (
      (ov.city && ov.city.toLocaleLowerCase() === key) ||
      (ov.cityAlias && ov.cityAlias.toLocaleLowerCase() === key)
    ) {
      result[id] = ov;
    }
  }
  return result;
}

/**
 * Merge admin flag into residence tag + typologyTags.
 * - flag.typologies vide/absent = toutes les typologies heritent
 * - flag.typologies renseigne = seules celles-ci le portent
 * Les fichiers masterdata (`GetAllResidences`, `GetOneResidenceById`) ne contiennent pas
 * ces champs : ils viennent uniquement de l'admin. Les codes typologie pour le fallback
 * "toutes les typologies" sont lus depuis la source residence (listing ou detail).
 */
function applyAdminFlag(residence) {
  const ov = getAdminOverride(residence.residenceId);
  if (!ov || !ov.flag) return residence;

  const { code, label, typologies: flagTypos } = ov.flag;
  const tag = { code, label };

  const detailTypos =
    residenceDetailsById[residence.residenceId]?.typologies || [];
  const typoCodes = detailTypos.map((t) => t.typologyCode).filter(Boolean);
  const typologyTags = { ...(residence.typologyTags || {}) };
  const targeted =
    Array.isArray(flagTypos) && flagTypos.length > 0 ? flagTypos : typoCodes;

  for (const tc of targeted) {
    typologyTags[tc] = { code, label };
  }

  return { ...residence, tag, typologyTags };
}

function applyAdminPhotos(detail) {
  const ov = getAdminOverride(detail.residenceId);
  if (!ov || !Array.isArray(ov.photos) || ov.photos.length === 0) return detail;

  return { ...detail, photos: ov.photos };
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
  }),
);

app.use(express.json());

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

/** OpenAPI pour Swagger UI (sans dependance npm supplementaire). */
app.get("/openapi.yaml", (req, res) => {
  res.type("application/yaml");
  res.send(fs.readFileSync(swaggerPath, "utf-8"));
});

/** Swagger UI charge la spec depuis le meme origin (evite CORS). */
app.get("/docs", (req, res) => {
  res.type("html");
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mock API - Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" crossorigin />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/openapi.yaml",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`);
});

app.get("/api/residences", (req, res) => {
  let residences = allResidencesPayload.residences || [];

  const { brand } = req.query;
  if (brand) {
    const brandKey = brand.toLocaleLowerCase();
    residences = residences.filter(
      (r) => r.brand.toLocaleLowerCase().split(" ")[0] === brandKey,
    );
  }
  console.log(`Filtered residences by brand: ${brand || "all"}`);
  console.log(`Total residences returned: ${residences}`);
  res.json({
    residences: residences.map(applyAdminFlag),
    photos: allResidencesPayload.photos || [],
  });
});

app.get("/api/cities/:cityAlias/residences", (req, res) => {
  const cityAlias = req.params.cityAlias.toLocaleLowerCase();
  const residences = allResidencesPayload.residences || [];

  const filtered = residences.filter(
    (r) =>
      r.city.toLocaleLowerCase() === cityAlias ||
      r.cityAlias.toLocaleLowerCase() === cityAlias,
  );

  res.json({
    cityAlias,
    residences: filtered.map(applyAdminFlag),
  });
});

app.get("/api/cities/:cityAlias/residences/:id", (req, res) => {
  const { cityAlias, id: residenceId } = req.params;

  const detail = residenceDetailsById[residenceId];

  if (!detail) {
    res
      .status(404)
      .json({ error: "Residence not found", cityAlias, residenceId });
    return;
  }

  const withFlags = applyAdminFlag(detail);
  const withPhotos = applyAdminPhotos(withFlags);

  res.json({
    ...detail,
    cityAlias,
  });
});

app.get("/admin-tr", (req, res) => {
  const { city } = req.query;
  const base = { modals: adminTRPayload.modals, steps: adminTRPayload.steps };

  if (city) {
    base.residenceOverrides = filterOverridesByCity(city);
  }

  res.json(base);
});

app.post("/reservations", (req, res) => {
  const scenarioParam = (req.query.scenario || "").toLowerCase();
  const validScenarios = Object.keys(opportunityScenarios);
  const scenarioKey = validScenarios.includes(scenarioParam)
    ? scenarioParam
    : "locataire_seul_majeur";

  const opportunityId = "OPP-" + Date.now().toString(36).toUpperCase();

  res.json({
    status: "ACCEPTED",
    opportunityId,
    scenario: scenarioKey,
    availableScenarios: validScenarios,
    submittedPayload: opportunityScenarios[scenarioKey],
    confirmation: postReservationAccepted,
  });
});

app.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
  console.log(`Mock data: ${MOCK_ROUTES_DIR}`);
});
