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

async function testGateway() {
  const conf = getBCConfig();
  if(!conf) return;
  const { storeHash, accessToken } = conf;
  const v3Url = `https://api.bigcommerce.com/stores/${storeHash}/v3`;
  const v2Url = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
  
  try {
    const orderData = {
      customer_id: 0,
      billing_address: {
        first_name: "Guest", last_name: "Customer",
        street_1: "123 Main st", city: "Austin", state: "Texas", zip: "78701",
        country: "United States", country_iso2: "US", phone: "0000000000", email: "test@example.com"
      },
      products: [{ product_id: 112, quantity: 1, price_inc_tax: 10, price_ex_tax: 10 }],
      status_id: 0
    };
    const orderRes = await axios.post(`${v2Url}/orders`, orderData, {
      headers: { "X-Auth-Token": accessToken }
    });
    const orderId = orderRes.data.id;

    const patRes = await axios.post(`${v3Url}/payments/access_tokens`, {
      order: { id: orderId, is_recurring: false }
    }, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" }
    });
    const paymentAccessToken = patRes.data.data.id;

    const res = await axios.post(`https://payments.bigcommerce.com/stores/${storeHash}/payments`, {
      payment: {
        instrument: {
          type: "token",
          token: "fake-valid-nonce"
        },
        payment_method_id: "braintree"
      }
    }, {
      headers: {
        "Authorization": `PAT ${paymentAccessToken}`,
        "Accept": "application/vnd.bc.v1+json",
        "Content-Type": "application/json"
      }
    });
    console.log("Success payment:", res.data);
  } catch (err: any) {
    console.error("Error status:", err.response?.status);
    console.error(JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testGateway();
