/**
 * Ajoute telephone + email sur chaque fiche GetOneResidenceById (apres address).
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mock-routes", "GetOneResidenceById.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const CONTACT_BY_CODE = {
  ALBERT_THOMAS: {
    telephone: "04 78 90 12 34",
    email: "contact@albert-thomas.com",
  },
  ANDROMAQUE: {
    telephone: "04 78 22 33 44",
    email: "contact@andromaque.uxco-student.fr",
  },
  AQUITAINE: {
    telephone: "05 56 44 55 66",
    email: "contact@aquitaine.uxco-student.fr",
  },
  ATLAS: {
    telephone: "05 61 33 22 11",
    email: "contact@atlas.uxco-student.fr",
  },
  BABYLONE: {
    telephone: "03 20 55 66 77",
    email: "contact@babylone.uxco-student.fr",
  },
  BAKER_HILL: {
    telephone: "04 77 88 99 00",
    email: "contact@baker-hill.uxco-student.fr",
  },
  ECLA_GENEVE_ARCHAMPS: {
    telephone: "04 50 12 34 56",
    email: "contact@ecla-geneve-archamps.ecla.io",
  },
  ECLA_MP: {
    telephone: "01 69 11 22 33",
    email: "contact@ecla-mp.ecla.io",
  },
  ECLA_PALAISEAU_EXTENSION_OPCO: {
    telephone: "01 69 44 55 66",
    email: "contact@ecla-palaiseau-opco.ecla.io",
  },
  ECLA_NLG: {
    telephone: "01 48 77 88 99",
    email: "contact@ecla-noisy-le-grand.ecla.io",
  },
};

const KEY_ORDER = [
  "residenceId",
  "residenceCode",
  "name",
  "commercialName",
  "brand",
  "city",
  "cityAlias",
  "address",
  "telephone",
  "email",
  "coordinates",
  "availabilityStatus",
  "description",
  "commonAmenities",
  "typologies",
  "floors",
  "abonnements",
  "configurationOptions",
  "photos",
  "offersContext",
  "offerSummaries",
  "offers",
];

function reorderResidence(r) {
  const c = CONTACT_BY_CODE[r.residenceCode];
  if (!c) {
    throw new Error(`No CONTACT_BY_CODE for ${r.residenceCode}`);
  }
  const merged = { ...r, telephone: c.telephone, email: c.email };
  const out = {};
  for (const k of KEY_ORDER) {
    if (k in merged && merged[k] !== undefined) out[k] = merged[k];
  }
  for (const k of Object.keys(merged)) {
    if (!(k in out)) out[k] = merged[k];
  }
  return out;
}

let n = 0;
for (const key of Object.keys(data)) {
  const r = data[key];
  if (!r || typeof r !== "object" || !r.residenceId) continue;
  data[key] = reorderResidence(r);
  n++;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Residences avec contact:", n);
