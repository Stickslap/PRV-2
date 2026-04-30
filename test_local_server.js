import axios from 'axios';

axios.get('http://0.0.0.0:3000/api/products').then(res => {
  console.log(JSON.stringify(res.data.data.map(p => ({name: p.name, sku: p.sku}))).slice(0, 500));
}).catch(err => {
  console.error("ERROR:", err.message);
});
