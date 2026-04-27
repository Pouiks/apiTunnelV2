/**
 * Supprime typologyScenarios, fusionne STANDARD.typologies dans typologies
 * (pricing + amenities, sans optionGroups), ajoute configurationOptions au niveau residence.
 * Groupe PREMIUM uniquement pour la residence Noisy-le-Grand (ECLA_NLG).
 */
const fs = require("fs");
const path = require("path");

const NOISY_RESIDENCE_ID = "1b5644a8-4fa7-ef11-b8e9-6045bd19a503";

const filePath = path.join(__dirname, "..", "mock-routes", "GetOneResidenceById.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

function surfaceHintsFromOld(oldTypologies) {
  const byCode = {};
  for (const t of oldTypologies || []) {
    byCode[t.typologyCode] = {
      surface: t.surface,
      reducedBaseRent: t.reducedBaseRent,
    };
  }
  return byCode;
}

function attachSurface(stdCode, hints) {
  if (hints[stdCode]) return hints[stdCode];
  if (stdCode === "T1" && hints.T1_BIS) return hints.T1_BIS;
  return {};
}

function cloneOptionGroupsFromStandard(stdTypologies) {
  for (const t of stdTypologies || []) {
    if (Array.isArray(t.optionGroups) && t.optionGroups.length > 0) {
      return JSON.parse(JSON.stringify(t.optionGroups));
    }
  }
  return [];
}

let count = 0;
for (const key of Object.keys(data)) {
  const r = data[key];
  if (!r || typeof r !== "object" || !r.residenceId || !r.typologyScenarios) continue;

  const std = r.typologyScenarios.STANDARD;
  if (!std || !Array.isArray(std.typologies)) {
    throw new Error(`Missing STANDARD.typologies for residence ${r.residenceId}`);
  }

  const hints = surfaceHintsFromOld(r.typologies);
  let groups = cloneOptionGroupsFromStandard(std.typologies);
  if (r.residenceId !== NOISY_RESIDENCE_ID) {
    groups = groups.filter((g) => g.groupCode !== "PREMIUM");
  }

  r.configurationOptions = groups;

  r.typologies = std.typologies.map((t) => {
    const extra = attachSurface(t.typologyCode, hints);
    const { optionGroups: _omit, ...rest } = t;
    return { ...rest, ...extra };
  });

  delete r.typologyScenarios;
  count++;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Residences refactored:", count);
