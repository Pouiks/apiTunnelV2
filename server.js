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
const offersPayload = loadMockJSON("GetOffers.json");
const adminTRPayload = loadMockJSON("GetAdminTR.json");
const postReservationAccepted = loadMockJSON("PostReservationAccepted.json");

const swaggerPath = path.join(__dirname, "swagger.yaml");

function offerAppliesToResidence(offer, residenceId) {
  const res = offer.scope && offer.scope.residences;
  if (!Array.isArray(res) || res.length === 0) {
    return true;
  }
  return res.includes(residenceId);
}

function summarizeOffer(offer) {
  const d = offer.discount;
  return {
    offerCode: offer.offerCode,
    label: offer.label,
    badge: offer.badge,
    type: offer.type,
    promoCode: offer.promoCode,
    bookingDeadline: offer.conditions ? offer.conditions.bookingDeadline : null,
    discountTarget: d ? d.target : null,
    discountAmount: d ? d.amount : null,
    discountReductionType: d ? d.reductionType : null,
    billingTiming: d ? d.billingTiming : null,
  };
}

function offersForResidence(residenceId) {
  const list = offersPayload.offers || [];
  return list.filter((o) => offerAppliesToResidence(o, residenceId));
}

function offerSummariesForResidence(residenceId) {
  return offersForResidence(residenceId).map(summarizeOffer);
}

function offersContextPayload() {
  return {
    bookingDate: offersPayload.bookingDate,
    city: offersPayload.city,
  };
}

function attachOffersToResidenceRow(r) {
  if (!r || r.residenceId == null) {
    return r;
  }
  return {
    ...r,
    offerSummaries: offerSummariesForResidence(r.residenceId),
  };
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

app.get("/residences", (req, res) => {
  const residences = allResidencesPayload.residences || [];

  res.json({
    offersContext: offersContextPayload(),
    residences: residences.map(attachOffersToResidenceRow),
  });
});

app.get("/cities/:cityAlias/residences", (req, res) => {
  const cityAlias = req.params.cityAlias.toLocaleLowerCase();
  const residences = allResidencesPayload.residences || [];

  const filtered = residences.filter(
    (r) =>
      r.city.toLocaleLowerCase() === cityAlias ||
      r.cityAlias.toLocaleLowerCase() === cityAlias,
  );

  res.json({
    cityAlias,
    offersContext: offersContextPayload(),
    residences: filtered.map(attachOffersToResidenceRow),
  });
});

app.get("/cities/:cityAlias/residences/:id", (req, res) => {
  const { cityAlias, id: residenceId } = req.params;

  const detail = residenceDetailsById[residenceId];

  if (!detail) {
    res
      .status(404)
      .json({ error: "Residence not found", cityAlias, residenceId });
    return;
  }

  const offers = offersForResidence(residenceId);
  res.json({
    ...detail,
    cityAlias,
    offersContext: offersContextPayload(),
    offerSummaries: offers.map(summarizeOffer),
    offers,
  });
});

app.get("/admin-tr", (req, res) => {
  res.json(adminTRPayload);
});

/**
 * Referentiel offres global (vue Fabric / outils). Preferer les champs
 * `offerSummaries` + `offers` sur GET /cities/:cityAlias/residences et
 * GET /cities/:cityAlias/residences/:id pour le tunnel.
 */
app.get("/offers", (req, res) => {
  res.json(offersPayload);
});

app.post("/reservations", (req, res) => {
  res.json(postReservationAccepted);
});

app.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
  console.log(`Mock data: ${MOCK_ROUTES_DIR}`);
});
