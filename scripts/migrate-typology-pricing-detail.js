/**
 * Remplace les blocs pricing legacy (baseRent, lowestUnitPrice, …) par le modele
 * MinimumBaseRent / … aligne sur la premiere typologie COLOC du mock.
 */
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mock-routes", "GetOneResidenceById.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const PRICING_KEYS = [
  "MinimumBaseRent",
  "MinimumBaseRentWithOptions",
  "MinimumBaseRentWithOptionsWithOffers",
  "MinimumApplicationFee",
  "MinimumSecurityDeposit",
  "MinimumApplicationFeeWithOffers",
  "MinimumSecurityDepositWithOffers",
];

function isNewPricing(p) {
  return p && typeof p === "object" && PRICING_KEYS.every((k) => typeof p[k] === "number");
}

function buildPricing(typology) {
  const p = typology.pricing || {};
  if (isNewPricing(p)) {
    const ordered = {};
    for (const k of PRICING_KEYS) ordered[k] = p[k];
    return ordered;
  }
  const base = p.lowestUnitPrice ?? p.baseRent;
  if (typeof base !== "number" || Number.isNaN(base)) {
    throw new Error(
      `typology ${typology.typologyCode}: impossible de deduire le loyer (pas de baseRent/lowestUnitPrice ni Minimum*)`,
    );
  }
  const app = typeof p.applicationFee === "number" ? p.applicationFee : 250;
  const dep =
    typeof p.securityDeposit === "number" ? p.securityDeposit : Math.round(base * 1.2);
  const reduced = typology.reducedBaseRent;
  const withOffers =
    typeof reduced === "number" && reduced < base
      ? reduced
      : Math.max(0, base - 20);

  return {
    MinimumBaseRent: base,
    MinimumBaseRentWithOptions: base + 20,
    MinimumBaseRentWithOptionsWithOffers: withOffers,
    MinimumApplicationFee: app,
    MinimumSecurityDeposit: dep,
    MinimumApplicationFeeWithOffers: Math.max(0, app - 50),
    MinimumSecurityDepositWithOffers: Math.max(0, dep - 80),
  };
}

let n = 0;
for (const res of Object.values(data)) {
  if (!res || !Array.isArray(res.typologies)) continue;
  for (const t of res.typologies) {
    const next = buildPricing(t);
    if (!isNewPricing(t.pricing) || JSON.stringify(t.pricing) !== JSON.stringify(next)) {
      n += 1;
    }
    t.pricing = next;
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Typologies pricing mis a jour:", n);
