const axios = require('axios');
require('dotenv').config();
const { BIGCOMMERCE_STORE_HASH, BIGCOMMERCE_ACCESS_TOKEN } = process.env;
axios.get(`https://api.bigcommerce.com/stores/${BIGCOMMERCE_STORE_HASH}/v3/catalog/products?include=images,variants,primary_image,options,modifiers&limit=250&page=1&sort=id&direction=desc`, {
  headers: { 'X-Auth-Token': BIGCOMMERCE_ACCESS_TOKEN, 'Accept': 'application/json' }
}).then(res => console.log('Products:', res.data.data.length, 'Pagination:', res.data.meta.pagination)).catch(err => console.error(err.response ? err.response.data : err.message));
