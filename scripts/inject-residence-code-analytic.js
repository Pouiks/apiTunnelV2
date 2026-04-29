/**
 * Ajoute residenceCodeAnalytic sur chaque ligne du listing GetAllResidences.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mock-routes", "GetAllResidences.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const ANALYTIC_BY_CODE = {
  ALBERT_THOMAS: "315",
  ANDROMAQUE: "316",
  AQUITAINE: "317",
  ATLAS: "318",
  BABYLONE: "319",
  BAKER_HILL: "320",
  ECLA_GENEVE_ARCHAMPS: "321",
  ECLA_MP: "322",
  ECLA_PALAISEAU_EXTENSION_OPCO: "323",
  ECLA_NLG: "324",
};

const ORDER = [
  "residenceId",
  "residenceCode",
  "residenceCodeAnalytic",
  "name",
  "commercialName",
  "brand",
  "city",
  "cityAlias",
  "address",
  "coordinates",
  "availabilityStatus",
  "baseRentFrom",
  "typologies",
];

function reorderListingRow(r) {
  const code = r.residenceCode;
  const analytic = ANALYTIC_BY_CODE[code];
  if (!analytic) {
    throw new Error(`Pas de code analytique pour residenceCode=${code}`);
  }
  const merged = { ...r, residenceCodeAnalytic: analytic };
  const out = {};
  for (const k of ORDER) {
    if (k in merged && merged[k] !== undefined) out[k] = merged[k];
  }
  for (const k of Object.keys(merged)) {
    if (!(k in out)) out[k] = merged[k];
  }
  return out;
}

const outRows = (data.residences || []).map(reorderListingRow);
data.residences = outRows;
fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Résidences:", outRows.length);
