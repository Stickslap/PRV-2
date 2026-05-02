import axios from "axios";

// Run node test_reviews.js
const test = async () => {
    // load env test
    const storeHash = process.env.BIGCOMMERCE_STORE_HASH || "z045cwhm2s";
    const token = process.env.BIGCOMMERCE_ACCESS_TOKEN || "lg54ibj7aefv6x29oewqig0y635jokx";
    
    try {
        console.log("trying v2 catalog/reviews or whatever");
        const res = await axios.get(`https://api.bigcommerce.com/stores/${storeHash}/v2/products/reviews.json`, {
            headers: {
                "X-Auth-Token": token
            }
        });
        console.log("V2 Success:", res.data);
    } catch (e) {
        console.log("V2 error:", e.response?.data || e.message);
    }
};

test();
