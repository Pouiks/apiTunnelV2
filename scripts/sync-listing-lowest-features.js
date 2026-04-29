/**
 * GetAllResidences: supprime features[], ajoute lowestUnitPrice sur chaque typologie
 * (priorite aux donnees GetOneResidenceById.pricing.lowestUnitPrice ; T1_BIS <- T1 ;
 *  T2_DUPLEX / T3 derives du T2 de la meme residence si absents du detail).
 */
const fs = require("fs");
const path = require("path");

const allPath = path.join(__dirname, "..", "mock-routes", "GetAllResidences.json");
const onePath = path.join(__dirname, "..", "mock-routes", "GetOneResidenceById.json");

const all = JSON.parse(fs.readFileSync(allPath, "utf-8"));
const byId = JSON.parse(fs.readFileSync(onePath, "utf-8"));

function pricingMap(residenceId) {
  const r = byId[residenceId];
  if (!r || !Array.isArray(r.typologies)) return {};
  const m = {};
  for (const t of r.typologies) {
    if (t.pricing && typeof t.pricing.lowestUnitPrice === "number") {
      m[t.typologyCode] = t.pricing.lowestUnitPrice;
    }
  }
  return m;
}

function lowestForListingTypology(map, typologyCode) {
  if (map[typologyCode] != null) return map[typologyCode];
  if (typologyCode === "T1_BIS" && map.T1 != null) return map.T1;
  if (typologyCode === "T2_DUPLEX" && map.T2 != null) return map.T2 + 90;
  if (typologyCode === "T3" && map.T2 != null) return map.T2 + 235;
  return null;
}

function normalizeTypology(t, map) {
  const low = lowestForListingTypology(map, t.typologyCode);
  const out = {
    typologyCode: t.typologyCode,
    "sous-type-marketing_fr": t["sous-type-marketing_fr"],
    sous_type_marketing_en: t.sous_type_marketing_en,
    lowestUnitPrice: low != null ? low : t.reducedBaseRent ?? t.lowestUnitPrice ?? 0,
  };
  if (t.reducedBaseRent != null) out.reducedBaseRent = t.reducedBaseRent;
  return out;
}

let resCount = 0;
for (const r of all.residences || []) {
  if ("features" in r) delete r.features;
  const map = pricingMap(r.residenceId);
  r.typologies = (r.typologies || []).map((t) => normalizeTypology(t, map));
  resCount++;
}

fs.writeFileSync(allPath, JSON.stringify(all, null, 2) + "\n", "utf-8");
console.log("Residences updated:", resCount);
