import axios from "axios";
import { config } from "dotenv";
config();

const getBCConfig = () => {
  let storeHash = (process.env.BIGCOMMERCE_STORE_HASH || "").trim();
  const accessToken = (process.env.BIGCOMMERCE_ACCESS_TOKEN || "").trim();

  if (!storeHash || !accessToken) return null;

  const hashMatch = storeHash.match(/stores\/([a-z0-9]+)/i);
  if (hashMatch && hashMatch[1]) {
    storeHash = hashMatch[1];
  }

  return { storeHash, accessToken };
};

async function testTransaction() {
  const conf = getBCConfig();
  if(!conf) return;
  const { storeHash, accessToken } = conf;
  
  try {
    const res = await axios.post(`https://api.bigcommerce.com/stores/${storeHash}/v3/orders/116/transactions`, {
      event: "purchase",
      method: "credit_card",
      amount: 10,
      currency: "USD",
      gateway: "squarev2",
      status: "ok",
      reference_id: "Square-12345"
    }, {
      headers: {
        "X-Auth-Token": accessToken,
        "Accept": "application/json"
      }
    });
    console.log("Success:", JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("Error status:", err.response?.status);
    console.error(JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testTransaction();
