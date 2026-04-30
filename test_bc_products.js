import dotenv from "dotenv";
dotenv.config();
import axios from 'axios';

const storeHash = "jtttoporzj";
const accessToken = "mdv5lluhdwz5ca86z7i06t268r66ong";
const baseURL = `https://api.bigcommerce.com/stores/${storeHash}/v3`;
const bcClient = axios.create({
  baseURL: baseURL,
  headers: {
    "X-Auth-Token": accessToken,
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
});

bcClient.get('/catalog/products').then(res => {
  console.log(JSON.stringify(res.data.data.map(p => ({name: p.name, sku: p.sku})), null, 2));
}).catch(err => {
  console.error("ERROR:", err.response ? err.response.data : err.message);
});
