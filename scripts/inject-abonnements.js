const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mock-routes", "GetOneResidenceById.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const abonnements = [
  {
    code: "CLEANING_SERVICE",
    title: "Cleaning service",
    description:
      "Keep your residence spotless with our regular cleaning service.",
    pricePerMonth: 50,
    currency: "EUR",
    billingPeriod: "month",
    icon: "cleaning",
  },
  {
    code: "PARKING_SPACE",
    title: "Parking space",
    description: "Secure parking space included for your convenience.",
    pricePerMonth: 30,
    currency: "EUR",
    billingPeriod: "month",
    icon: "parking",
  },
  {
    code: "TV_RENTAL",
    title: "TV rental",
    description: '32" Smart TV with streaming apps',
    pricePerMonth: 20,
    currency: "EUR",
    billingPeriod: "month",
    icon: "tv",
  },
  {
    code: "THE_PACK",
    title: "The Pack",
    description:
      "Linen kit + biweekly cleaning with sheet change + TV screen",
    pricePerMonth: 60,
    currency: "EUR",
    billingPeriod: "month",
    icon: "gift",
  },
];

let count = 0;
for (const key of Object.keys(data)) {
  const r = data[key];
  if (r && typeof r === "object" && r.residenceId) {
    r.abonnements = JSON.parse(JSON.stringify(abonnements));
    count++;
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Residences updated:", count);
