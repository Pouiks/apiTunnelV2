/**
 * Ajoute sous_type_marketing_en juste apres sous-type-marketing_fr dans chaque typologie du listing.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mock-routes", "GetAllResidences.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const EN_BY_CODE = {
  COLOC: "Shared room",
  STUDIO: "Studio",
  T1_BIS: "T1 BIS",
  T2: "T2",
  T2_DUPLEX: "T2 Duplex",
  T3: "T3",
};

function normalizeTypology(t) {
  const code = t.typologyCode;
  const fr = t["sous-type-marketing_fr"];
  const en =
    typeof t.sous_type_marketing_en === "string" && t.sous_type_marketing_en
      ? t.sous_type_marketing_en
      : EN_BY_CODE[code] ?? code;

  const out = {
    typologyCode: code,
    "sous-type-marketing_fr": fr,
    sous_type_marketing_en: en,
  };
  if (t.lowestUnitPrice != null) out.lowestUnitPrice = t.lowestUnitPrice;
  if (t.reducedBaseRent != null) out.reducedBaseRent = t.reducedBaseRent;
  return out;
}

let count = 0;
for (const r of data.residences || []) {
  if (!Array.isArray(r.typologies)) continue;
  r.typologies = r.typologies.map((t) => {
    count++;
    return normalizeTypology(t);
  });
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Typologies normalisees:", count);
