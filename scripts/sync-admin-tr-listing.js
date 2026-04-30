/**
 * 1) Ecrit mock-routes/GetAdminTR.json depuis GetAdminTAllResidence.json :
 *    description par residence (GetOneResidenceById), commonAmenities {code,label,label_en},
 *    flag (remplace tag) pour compatibilite server.js.
 * 2) Normalise mock-routes/GetAllResidences.json sur le modele Albert Thomas.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const mock = (...p) => path.join(root, "mock-routes", ...p);

const details = JSON.parse(fs.readFileSync(mock("GetOneResidenceById.json"), "utf-8"));
const adminPath = fs.existsSync(mock("GetAdminTR.json"))
  ? mock("GetAdminTR.json")
  : mock("GetAdminTAllResidence.json");
const adminSource = JSON.parse(fs.readFileSync(adminPath, "utf-8"));
const listingPath = mock("GetAllResidences.json");
const listing = JSON.parse(fs.readFileSync(listingPath, "utf-8"));

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

const POSTAL_BY_CODE = {
  ALBERT_THOMAS: "69007",
  ANDROMAQUE: "69100",
  AQUITAINE: "33130",
  ATLAS: "31000",
  BABYLONE: "59650",
  BAKER_HILL: "42000",
  ECLA_GENEVE_ARCHAMPS: "74160",
  ECLA_MP: "91300",
  ECLA_PALAISEAU_EXTENSION_OPCO: "91300",
  ECLA_NLG: "93160",
};

const EN_BY_CODE = {
  GYM: "Gym",
  COWORK: "Coworking space",
  LAUNDRY: "Laundry 24/7",
  STUDY: "Study rooms",
  BIKE: "Secure bike storage",
  WIFI: "Fibre Wi-Fi",
  CINEMA: "Cinema",
  PADEL: "Padel courts",
  RESTO: "Restaurant",
};

function commonAmenitiesFor(residenceId) {
  const d = details[residenceId];
  if (!d || !Array.isArray(d.commonAmenities)) return [];
  return d.commonAmenities.map((a) => ({
    code: a.code,
    label: a.label,
    label_en: EN_BY_CODE[a.code] || a.label,
  }));
}

function descriptionFor(residenceId) {
  const d = details[residenceId];
  return d && d.description ? d.description : "";
}

/** tag ou flag (legacy) -> flag attendu par server.js ; `tag` prime sur `flag`. */
function normalizeFlag(ov) {
  const raw = ov.tag != null ? ov.tag : ov.flag;
  if (!raw || typeof raw !== "object") return undefined;
  const code = raw.code;
  const label =
    typeof raw.label === "string"
      ? raw.label
      : typeof raw.label_fr === "string"
        ? raw.label_fr
        : String(code || "");
  const typologies = Array.isArray(raw.typologies) ? raw.typologies : [];
  const out = { code, label, typologies };
  if (typeof raw.label_en === "string") out.label_en = raw.label_en;
  return out;
}

function buildAdminTrPayload() {
  const overrides = {};
  for (const [id, ov] of Object.entries(adminSource.residenceOverrides || {})) {
    const next = { ...ov };
    delete next.tag;
    delete next.flag;
    delete next.ResidenceBenefits;
    next.description = descriptionFor(id);
    next.commonAmenities = commonAmenitiesFor(id);
    const flag = normalizeFlag(ov);
    if (flag) next.flag = flag;
    overrides[id] = next;
  }
  return {
    modals: adminSource.modals,
    steps: adminSource.steps,
    residenceOverrides: overrides,
  };
}

function colocOffersValue(colocBase, reduced) {
  if (typeof reduced === "number" && reduced < colocBase) return reduced;
  return Math.max(0, colocBase - 20);
}

function normalizeResidenceRow(r) {
  const code = r.residenceCode || (r.name === "ALBERT THOMAS" ? "ALBERT_THOMAS" : null);
  if (!code) throw new Error(`residenceCode manquant pour ${r.residenceId}`);
  const analytic = ANALYTIC_BY_CODE[code];
  if (!analytic) throw new Error(`Code analytique inconnu: ${code}`);

  const ov = adminSource.residenceOverrides?.[r.residenceId];
  const photos = Array.isArray(ov?.photos) ? ov.photos : [];

  const d = details[r.residenceId];
  const status =
    r.availabilityStatus || (d && d.availabilityStatus) || "AVAILABLE";
  const residenceAvailability =
    status === "PARTIAL" ? "PARTIAL || FULL" : "AVAILABLE || FULL";

  const ty = [...(r.typologies || [])];
  const coloc =
    ty.find((t) => t.typologyCode === "COLOC") ||
    ty.find((t) => t.Sous_type != null || t["Sous_type"] != null);
  if (!coloc) throw new Error(`Pas de COLOC pour ${code}`);
  const colocBase =
    coloc.lowestUnitPrice ??
    coloc.MinimumBaseRent ??
    (typeof coloc["MinimumBaseRent"] === "number" ? coloc["MinimumBaseRent"] : 480);
  const colocOffers = colocOffersValue(colocBase, coloc.reducedBaseRent);

  const firstTypology = {
    Sous_type: "Colocation",
    "sous-type-marketing_fr": coloc["sous-type-marketing_fr"],
    sous_type_marketing_en: coloc.sous_type_marketing_en,
    MinimumBaseRent: colocBase,
    MinimumBaseRentWithOptions: colocBase + 20,
    MinimumBaseRentWithOptionsWithOffers: colocOffers,
  };

  const rest = ty
    .filter((t) => t !== coloc)
    .map((t) => {
      const o = {
        typologyCode: t.typologyCode,
        "sous-type-marketing_fr": t["sous-type-marketing_fr"],
        sous_type_marketing_en: t.sous_type_marketing_en,
        lowestUnitPrice: t.lowestUnitPrice,
      };
      if (t.reducedBaseRent != null) o.reducedBaseRent = t.reducedBaseRent;
      return o;
    });

  const postal = POSTAL_BY_CODE[code] || "";

  return {
    residenceId: r.residenceId,
    residenceCode: code,
    residenceCodeAnalytic: analytic,
    name: r.name,
    commercialName: r.commercialName,
    brand: r.brand,
    city: r.city,
    cityAlias: r.cityAlias,
    address: r.address,
    postal_code: postal,
    coordinates: r.coordinates,
    photos,
    Residence_availability: residenceAvailability,
    MinimumBaseRent: colocBase,
    MinimumBaseRentWithOptions: colocBase + 20,
    MinimumBaseRentWithOptionsWithOffers: colocOffers,
    typologies: [firstTypology, ...rest],
  };
}

const adminOut = buildAdminTrPayload();
const adminJson = JSON.stringify(adminOut, null, 2) + "\n";
fs.writeFileSync(mock("GetAdminTR.json"), adminJson, "utf-8");
fs.writeFileSync(mock("GetAdminTAllResidence.json"), adminJson, "utf-8");

listing.residences = (listing.residences || []).map(normalizeResidenceRow);
fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2) + "\n", "utf-8");

console.log("GetAdminTR.json + GetAllResidences.json synchronises.");
