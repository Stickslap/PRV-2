const fs = require('fs');

const envs = [
  "BIGCOMMERCE_STORE_HASH",
  "BIGCOMMERCE_ACCESS_TOKEN",
  "SQUARE_APPLICATION_ID",
  "SQUARE_ACCESS_TOKEN",
  "FIREBASE_PROJECT_ID"
];

let output = "";
for (const [key, value] of Object.entries(process.env)) {
  if (key.includes("BC_") || key.includes("BIGCOMMERCE") || key.includes("SQUARE") || key.includes("VITE_") || key.includes("FIREBASE")) {
    output += `${key}=${value}\n`;
  }
}

fs.writeFileSync("envs_dump.txt", output);
