import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

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
     console.log("V2 customer keys:", Object.keys(res.data[0]));
     console.log("Store credit:", res.data[0].store_credit);
  } catch(e: any) {
     console.error("V2 failed", e?.response?.data || e.message);
  }

  try {
    const reqUrl3 = `${baseUrl}/v3/customers?limit=1`;
    console.log("Fetching", reqUrl3);
    const res3 = await axios.get(reqUrl3, {
       headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
     });
     console.log("V3 customer keys:", Object.keys(res3.data.data[0]));
  }catch(e:any) {
     console.error("V3 failed", e?.response?.data || e.message);
  }
}
test();
