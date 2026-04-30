import axios from "axios";
import { config } from "dotenv";
config();

async function testToken() {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
  const v3Url = `https://api.bigcommerce.com/stores/${storeHash}/v3`;
  
  try {
    // 1. Get an existing order
    const orderRes = await axios.get(`https://api.bigcommerce.com/stores/${storeHash}/v2/orders?limit=1`, {
      headers: { "X-Auth-Token": accessToken }
    });
    const order = orderRes.data[0];
    if(!order) return console.log("No orders");
    
    console.log("Order ID:", order.id);

    // 2. Request Access Token
    const patRes = await axios.post(`${v3Url}/payments/access_tokens`, {
        order: {
          id: order.id,
          is_recurring: false
        }
      }, {
        headers: {
          "X-Auth-Token": accessToken,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });
      
    console.log("Success Token:", patRes.data);
  } catch (err: any) {
    if(err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", JSON.stringify(err.response.data));
    } else {
      console.error(err);
    }
  }
}

testToken();
