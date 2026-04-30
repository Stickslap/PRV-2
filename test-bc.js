const axios = require('axios');
require('dotenv').config();

async function test() {
  const storeHash = process.env.VITE_BIGCOMMERCE_STORE_HASH || process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.VITE_BIGCOMMERCE_ACCESS_TOKEN || process.env.BIGCOMMERCE_ACCESS_TOKEN;
  let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
  if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");
  
  try {
     const reqUrl = `${baseUrl}/v2/customers.json?limit=1`;
     console.log("Fetching", reqUrl);
     const res = await axios.get(reqUrl, {
       headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
     });
     console.log("V2 customer:", Object.keys(res.data[0]));
     console.log("Store credit:", res.data[0].store_credit);
  } catch(e) {
     console.error("V2 failed", e?.response?.data || e.message);
  }
}
test();
