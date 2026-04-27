const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "mock-routes", "GetOneResidenceById.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

let removed = 0;

for (const key of Object.keys(data)) {
  const residence = data[key];
  if (!residence || typeof residence !== "object") continue;

  for (const typo of residence.typologies || []) {
    if (typo.productCode && typo.productCode.startsWith("DYN_PROD_")) {
      delete typo.productCode;
      removed++;
    }
  }

  for (const group of residence.configurationOptions || []) {
    for (const v of group.variants || []) {
      if (v.productCode && v.productCode.startsWith("DYN_PROD_")) {
        delete v.productCode;
        removed++;
      }
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log(`DYN_PROD_ productCode removed: ${removed}`);
