import express from "express";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import { SquareClient, SquareEnvironment } from "square";

dotenv.config();

// Initialize Square Client
let squareClient: typeof SquareClient.prototype | null = null;
if (process.env.SQUARE_ACCESS_TOKEN) {
  // Check if token and application ID point to production
  const isProduction = 
    process.env.VITE_SQUARE_APPLICATION_ID?.startsWith('sq0idp-') || 
    process.env.SQUARE_ACCESS_TOKEN.startsWith('EAAA') || 
    process.env.NODE_ENV === "production";

  squareClient = new SquareClient({
    environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    token: process.env.SQUARE_ACCESS_TOKEN,
  });
}

const app = express();
export default app;
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/health", (req, res) => {
  const config = getBCConfig();
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    is_bigcommerce_configured: !!config 
  });
});

app.get("/api/env-dump", (req, res) => {
  const envs = {};
  for (const key of Object.keys(process.env)) {
    if (key.includes("BC_") || key.includes("BIGCOMMERCE") || key.includes("SQUARE") || key.includes("VITE_") || key.includes("FIREBASE")) {
      envs[key] = process.env[key];
    }
  }
  res.json(envs);
});

// BigCommerce Configuration Helper
const getBCConfig = () => {
  let storeHash = (process.env.BIGCOMMERCE_STORE_HASH || "").trim();
  const accessToken = (process.env.BIGCOMMERCE_ACCESS_TOKEN || "").trim();

  if (!storeHash || !accessToken) return null;

  // Extract hash from diversos formats (URL or just the hash)
  const hashMatch = storeHash.match(/stores\/([a-z0-9]+)/i);
  if (hashMatch && hashMatch[1]) {
    storeHash = hashMatch[1];
  } else if (storeHash.includes(".mybigcommerce.com")) {
    const subdomainMatch = storeHash.match(/store-([a-z0-9]+)\.mybigcommerce/i);
    if (subdomainMatch && subdomainMatch[1]) {
      storeHash = subdomainMatch[1];
    }
  } else if (storeHash.includes("://")) {
    const urlParts = storeHash.split("/");
    storeHash = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
  }

  return { storeHash, accessToken };
};

// Simple In-Memory Cache
const cache = new Map<string, {data: any, timestamp: number}>();
const CACHE_TTL = {
  products: 10 * 60 * 1000, // 10 minutes
  product: 15 * 60 * 1000, // 15 minutes
  profile: 60 * 1000, // 1 minute
  orders: 60 * 1000, // 1 minute
};

const getFromCache = (key: string, ttl: number) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
};

const setToCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// BigCommerce Axios Instance Helper
const getBCClient = () => {
  const config = getBCConfig();
  if (!config) return null;

  const { storeHash, accessToken } = config;
  const baseURL = `https://api.bigcommerce.com/stores/${storeHash}/v3`;
  
  return axios.create({
    baseURL: baseURL,
    headers: {
      "X-Auth-Token": accessToken,
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  });
};

// API Routes
app.get("/api/products", async (req, res) => {
  const cacheKey = "all_products";
  const cachedProducts = getFromCache(cacheKey, CACHE_TTL.products);
  if (cachedProducts) {
    return res.json({ data: cachedProducts });
  }

  const bc = getBCClient();
  if (!bc) {
    console.warn("BigCommerce not configured. Returning mock products.");
    return res.json({ 
      data: [
        {
          id: 1,
          name: "SOCIETY® CL-004",
          price: 12.00,
          sku: "BC-004",
          description: "Premium Die-Cut Sticker",
          categories: [1],
          primary_image: { url_standard: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop" }
        },
        {
          id: 2,
          name: "PREMIUM VINYL 2.0",
          price: 8.50,
          sku: "NS-002",
          description: "Vibrant Neon Finish",
          categories: [1, 2],
          primary_image: { url_standard: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69?q=80&w=600&auto=format&fit=crop" }
        }
      ],
      meta: { is_mock: true }
    });
  }
  try {
    console.log("Fetching ALL products from BigCommerce...");
    
    let allProducts: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 10) { 
      console.log(`Fetching page ${page}...`);
      const response = await bc.get(`/catalog/products?include=images,variants,primary_image,options,modifiers&limit=250&page=${page}&sort=id&direction=desc`);
      const data = response.data.data || [];
      allProducts = [...allProducts, ...data];
      
      const pagination = response.data.meta?.pagination;
      if (pagination && pagination.current_page < pagination.total_pages) {
        page++;
      } else {
        hasMore = false;
      }
    }
    
    setToCache(cacheKey, allProducts);
    res.json({ data: allProducts });
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error("BigCommerce Rate Limit Hit (429)");
      return res.status(429).json({ error: "High traffic. Please wait a moment." });
    }
    console.error("BC Products Error status:", error.response?.status);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Invalid BigCommerce Access Token. Please check your credentials." });
    } else if (error.response?.status === 403) {
      return res.status(403).json({ error: "The provided Access Token does not have permission to view products (Product scope missing)." });
    } else if (error.response?.status === 404) {
      return res.status(404).json({ error: "BigCommerce Store Hash not found. If you are using a trial store, ensure the API is active." });
    } else if (error.response?.status === 423) {
      console.error("BigCommerce Store is suspended (423).");
      return res.status(423).json({ error: "Store suspended" });
    } else {
      console.error("Error fetching products from BC:", error.message);
      if (error.response) console.error("BC Error details:", error.response.data);
      return res.status(500).json({ error: `Connection Error: ${error.message}` });
    }
  }
});

app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product_${id}`;
  const cachedProduct = getFromCache(cacheKey, CACHE_TTL.product);
  if (cachedProduct) {
    return res.json(cachedProduct);
  }

  const bc = getBCClient();
  if (!bc) {
    return res.status(500).json({ error: "BigCommerce is not configured." });
  }
  try {
    const response = await bc.get(`/catalog/products/${id}?include=images,variants,primary_image,options,modifiers,custom_fields`);
    setToCache(cacheKey, response.data);
    res.json(response.data);
  } catch (error: any) {
    if (error.response?.status === 429) {
      return res.status(429).json({ error: "Rate limit hit. Please retry." });
    }
    console.error(`Error fetching product ${id} from BC:`, error.message);
    res.status(500).json({ error: `Failed to fetch product ${id}` });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const bc = getBCClient();
  const { id } = req.params;
  
  if (!bc) {
    return res.status(500).json({ error: "BigCommerce is not configured." });
  }
  try {
    await bc.delete(`/catalog/products/${id}`);
    res.json({ success: true, message: `Product ${id} deleted successfully` });
  } catch (error: any) {
    console.error(`Error deleting product ${id} from BC:`, error.response?.data || error.message);
    res.status(500).json({ 
      error: `Failed to delete product ${id}`,
      details: error.response?.data || error.message
    });
  }
});

// Admin API Routes
app.get("/api/admin/stats", async (req, res) => {
  // In a real app, calculate from BigCommerce or a database
  res.json({
    revenue: 12450.00,
    orders: 142,
    customers: 89,
    conversion: "3.2%"
  });
});

app.post("/api/admin/staff-login", async (req, res) => {
  const { username, password } = req.body;
  // Secure check against environment-set password or hardcoded fallback
  const staffUser = "PrintSocietyCo";
  const staffPass = process.env.STAFF_PASSWORD || "Hammock568@";

  if (username === staffUser && password === staffPass) {
    return res.json({ success: true, message: "Authentication Successful" });
  }
  
  res.status(401).json({ error: "Invalid Security Credentials" });
});

app.get("/api/admin/orders/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
    
    // Fetch order
    const orderRes = await axios.get(`${baseUrl}/orders/${id}.json`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    // Fetch order products
    const productsRes = await axios.get(`${baseUrl}/orders/${id}/products.json`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });

    // Fetch shipping addresses
    let shippingAddresses: any[] = [];
    try {
      const shipRes = await axios.get(`${baseUrl}/orders/${id}/shipping_addresses.json`, {
         headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
      });
      shippingAddresses = Array.isArray(shipRes.data) ? shipRes.data : [];
    } catch (e) {
      console.error("No shipping addresses found");
    }

    const o = orderRes.data;
    if (!o || typeof o !== "object") throw new Error("Invalid order data received from BigCommerce");

    const formattedOrder = {
      id: o.id,
      customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Member Guest",
      status: o.status || "Pending",
      status_id: o.status_id,
      total: parseFloat(o.total_inc_tax) || parseFloat(o.total || 0),
      subtotal: parseFloat(o.subtotal_inc_tax) || 0,
      shipping_cost: parseFloat(o.shipping_cost_inc_tax) || 0,
      tax: parseFloat(o.total_tax) || 0,
      date: o.date_created,
      ip_address: o.ip_address || "N/A",
      payment_method: o.payment_method || "N/A",
      billing_address: o.billing_address,
      shipping_address: shippingAddresses[0] || null,
      products: Array.isArray(productsRes.data) ? productsRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || "N/A",
        quantity: p.quantity,
        price: parseFloat(p.price_inc_tax) || parseFloat(p.base_price || 0),
        total: (parseFloat(p.price_inc_tax) || parseFloat(p.base_price || 0)) * p.quantity
      })) : []
    };
    
    res.json(formattedOrder);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("BC Order Detail Fetch error:", errorData);
    res.status(500).json({ 
      error: "Failed to fetch order details",
      details: typeof errorData === 'object' ? JSON.stringify(errorData) : errorData
    });
  }
});

app.get("/api/admin/order-statuses", async (req, res) => {
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/order_statuses.json`;

    const response = await axios.get(url, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("BC Order Statuses Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to fetch order statuses", 
      details: error.response?.data || error.message 
    });
  }
});

app.put("/api/admin/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body;
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}.json`;

    const response = await axios.put(url, { status_id }, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" }
    });
    res.json(response.data);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("BC Order Status Update Error:", errorData);
    res.status(500).json({ 
      error: "Failed to update order status",
      details: typeof errorData === 'object' ? JSON.stringify(errorData) : errorData
    });
  }
});

app.post("/api/admin/orders/:id/resend-invoice", async (req, res) => {
  const { id } = req.params;
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/email_invoice`;

    const response = await axios.post(url, {}, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    res.json({ success: true, message: "Invoice resent" });
  } catch (error: any) {
    console.error("BC Resend Invoice Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to resend invoice",
      details: error.response?.data || error.message
    });
  }
});

app.post("/api/admin/orders/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { message, is_customer_visible } = req.body;
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    // Fetch order first to get customer_id
    const orderUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}.json`;
    const orderRes = await axios.get(orderUrl, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const customerId = orderRes.data.customer_id;

    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/messages.json`;

    const response = await axios.post(url, {
      order_id: parseInt(id),
      customer_id: customerId,
      message,
      subject: "Order Update",
      is_customer_visible: is_customer_visible ?? true,
      status: "read"
    }, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" }
    });
    res.json(response.data);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("BC Send Message Error:", errorData);
    res.status(500).json({ 
      error: "Failed to send order message",
      details: typeof errorData === 'object' ? JSON.stringify(errorData) : errorData
    });
  }
});

app.get("/api/admin/orders/:id/messages", async (req, res) => {
  const { id } = req.params;
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/messages.json`;

    const response = await axios.get(url, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404
    });
    
    if (response.status === 404 || response.status === 204 || !response.data) {
      return res.json([]);
    }

    res.json(response.data);
  } catch (error: any) {
    if (error.response?.status === 404) return res.json([]);
    const errorData = error.response?.data || error.message;
    console.error("BC Get Messages Error:", errorData);
    res.status(500).json({ 
      error: "Failed to fetch order messages",
      details: typeof errorData === 'object' ? JSON.stringify(errorData) : errorData
    });
  }
});

app.get("/api/admin/orders", async (req, res) => {
  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders.json`;

    const response = await axios.get(url, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    // Map BigCommerce Orders to the shape expected by Admin UI
    const bcOrders = Array.isArray(response.data) ? response.data : [];
    const formattedOrders = bcOrders.map((o: any) => ({
      id: o.id,
      customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Member Guest",
      status: o.status || "Pending",
      total: parseFloat(o.total_inc_tax) || parseFloat(o.total || 0),
      date: o.date_created
    }));

    res.json(formattedOrders);
  } catch (error: any) {
    console.error("BC Order Fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/api/admin/customers", async (req, res) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const response = await bc.get("/customers");
    const customers = response.data.data;
    
    const formattedCustomers = customers.map((c: any) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone || "N/A",
      date_created: c.date_created,
      company: c.company || "N/A"
    }));

    res.json(formattedCustomers);
  } catch (error: any) {
    console.error("BC Customer Fetch error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

app.get("/api/admin/customers/:id", async (req, res) => {
  const bc = getBCClient();
  const { id } = req.params;

  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    // 1. Get customer
    const custRes = await bc.get(`/customers?id:in=${id}`);
    const customers = custRes.data.data;
    if (!customers || customers.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const c = customers[0];

    // 2. Get customer addresses
    let addresses = [];
    try {
      const addrRes = await bc.get(`/customers/addresses?customer_id:in=${c.id}`);
      addresses = addrRes.data.data || [];
    } catch (e) {
      console.error("Failed to fetch customer addresses", e);
    }
    
    // 3. Get recent orders inside BC for this customer via V2 API
    let orders = [];
    try {
      const config = getBCConfig();
      if (config) {
        const { storeHash, accessToken } = config;
        const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;

        const ordersRes = await axios.get(`${baseUrl}/orders.json?email=${encodeURIComponent(c.email)}&limit=10`, {
          headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
        });
        orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      }
    } catch (e) {
      console.error("Failed to fetch customer orders", e);
    }

    res.json({
      ...c,
      addresses,
      orders: orders.map((o: any) => ({
        id: o.id,
        status: o.status || "Pending",
        total: parseFloat(o.total_inc_tax) || parseFloat(o.total || 0),
        date: new Date(o.date_created).toLocaleDateString()
      }))
    });
  } catch (error: any) {
    console.error(`BC Customer Profile Fetch error for ${id}:`, error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch customer profile" });
  }
});

// Shipping Admin APIs
app.get("/api/admin/shipping/methods", async (req, res) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce not configured" });

  try {
    // BigCommerce doesn't have a simple "v3/shipping/methods" that lists names easily in some configs
    // We'll return mock data for the UI demonstration, or attempt to fetch from BC if possible
    // In many BC stores, methods are per zone.
    res.json([
      { id: 1, name: "FREE SHIPPING - GROUND", status: "Active", type: "Flat Rate", products: ["PREMIUM VINYL", "HOLOGRAPHIC VINYL"] },
      { id: 2, name: "UPS- SIGN ( DELIVERY ) GROUND TRANSIT", status: "Active", type: "Carrier", products: ["BRUSHED CHROME PRINT", "UV PROTECTED MATTE"] },
      { id: 3, name: "Free Standard Shipping", status: "Active", type: "Flat Rate", products: ["CUSTOM DIE-CUTS"] }
    ]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch methods" });
  }
});

app.get("/api/admin/shipping/orders", async (req, res) => {
  const bc = getBCClient();
  if (!bc) {
    console.error("Shipping Orders: BC client not configured");
    return res.status(500).json({ error: "BigCommerce not configured" });
  }

  try {
    let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    
    let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
    if (storeHash.startsWith("http")) {
      baseUrl = storeHash.replace(/\/v[23]\/?$/, "");
      baseUrl = baseUrl + "/v2";
    }

    console.log(`Fetching orders from: ${baseUrl}/orders.json`);
    const response = await axios.get(`${baseUrl}/orders.json`, {
      headers: { 
        "X-Auth-Token": accessToken, 
        "Accept": "application/json" 
      },
      timeout: 10000 // 10s timeout
    });
    
    // BC V2 returns 204 No Content (empty body) for no orders, axios might return empty string or null
    if (response.status === 204 || !response.data) {
      return res.json([]);
    }

    const bcOrders = Array.isArray(response.data) ? response.data : [];
    
    // Limit to 10 orders to avoid long wait times and hitting ratelimits
    const ordersWithTracking = await Promise.all(bcOrders.slice(0, 10).map(async (o: any) => {
      let tracking = "";
      let carrier = "USPS";
      let delivery_status: "pretransit" | "transit" | "delivered" = "transit";

      if (o.status === "Shipped" || o.status === "Completed") {
        try {
          const shipRes = await axios.get(`${baseUrl}/orders/${o.id}/shipments.json`, {
             headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
           });
           const shipments = shipRes.data;
          if (Array.isArray(shipments) && shipments.length > 0) {
            tracking = shipments[0].tracking_number || "";
            carrier = shipments[0].shipping_provider || "USPS";
            if (o.status === "Completed") delivery_status = "delivered";
          }
        } catch (e) {
          // No shipments found matches many draft orders
        }
      } else if (o.status === "Ready for Pickup" || o.status === "Awaiting Shipment") {
        delivery_status = "pretransit";
      }

      return {
        id: o.id.toString(),
        customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Member Guest",
        shipping_method: o.shipping_method || "Standard Shipping",
        tracking_number: tracking,
        carrier: carrier.toUpperCase(),
        ship_date: o.date_shipped || o.date_created,
        status: o.status,
        delivery_status: delivery_status
      };
    }));

    res.json(ordersWithTracking);
  } catch (error: any) {
    console.error("BC Shipping Orders Fetch error:", error.response?.data || error.message);
    // Return empty array instead of 500 to keep UI stable if store is empty or disconnected
    res.json([]);
  }
});

app.put("/api/admin/customers/:id", async (req, res) => {
  const bc = getBCClient();
  const { id } = req.params;
  const updates = req.body;

  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const custRes = await bc.put("/customers", [
      {
        id: parseInt(id),
        ...updates
      }
    ]);
    res.json({ success: true, data: custRes.data.data });
  } catch (error: any) {
    console.error(`BC Customer Update error for ${id}:`, error.response?.data || error.message);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Customer Dashboard API Routes
app.get("/api/customer/orders", async (req, res) => {
  const { email } = req.query;
  const emailStr = String(email);
  const cacheKey = `orders_${emailStr}`;
  const cachedOrders = getFromCache(cacheKey, CACHE_TTL.orders);
  if (cachedOrders) {
    return res.json(cachedOrders);
  }

  const bc = getBCClient();
  try {
    let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!accessToken || !storeHash || !email) {
      return res.status(500).json({ error: "Missing tokens or email" });
    }

    let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
    if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");

    // Fetch orders by email via V2
    const ordersRes = await axios.get(`${baseUrl}/v2/orders.json?email=${encodeURIComponent(emailStr)}&limit=20`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    if (ordersRes.status === 204 || !ordersRes.data) {
      setToCache(cacheKey, []);
      return res.json([]);
    }

    // Map array to our expected dashboard shape
    const formatted = Array.isArray(ordersRes.data) ? ordersRes.data.map((o: any) => ({
      id: o.id.toString(),
      status: o.status || "Pending",
      date: new Date(o.date_created).toLocaleDateString(),
      total: parseFloat(o.total_inc_tax) || 0,
      items: [{ name: `Order ${o.id} Items`, units: o.items_total || 1 }]
    })) : [];

    setToCache(cacheKey, formatted);
    res.json(formatted);
  } catch (error: any) {
    if (error.response?.status === 429) {
      return res.status(429).json({ error: "Rate limit hit. Please retry." });
    }
    console.error("BC Customer Orders error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
});

app.get("/api/customer/reviews", async (req, res) => {
  // Mock endpoint to replace Firebase
  res.json([
    {
      id: "mock_review_1",
      productId: "1",
      userName: "Member",
      rating: 5,
      comment: "Excellent quality, fast shipping.",
      createdAt: new Date().toISOString(),
      status: "approved"
    }
  ]);
});

app.delete("/api/customer/reviews/:id", async (req, res) => {
  // Mock endpoint to replace Firebase
  res.json({ success: true, message: "Review deleted" });
});

app.get("/api/customer/profile", async (req, res) => {
  const { email } = req.query;
  const emailStr = String(email);
  const cacheKey = `profile_${emailStr}`;
  const cachedProfile = getFromCache(cacheKey, CACHE_TTL.profile);
  if (cachedProfile) {
    return res.json(cachedProfile);
  }

  try {
    let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!accessToken || !storeHash || !email) {
      return res.status(500).json({ error: "Missing config or email" });
    }

    let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
    if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");

    const custRes = await axios.get(`${baseUrl}/v3/customers?email:in=${encodeURIComponent(String(email))}`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const customers = custRes.data.data;
    if (!customers || customers.length === 0) {
      const defaultProfile = {
        firstName: "Guest",
        lastName: "User",
        email: emailStr,
        phone: "N/A",
        address: "",
        city: "",
        state: "",
        zip: "",
        company: "",
        registryId: `BC-UID-Guest`,
        memberSince: new Date().toLocaleDateString(),
        lastSync: new Date().toLocaleDateString(),
        status: "Guest",
        credit: 0.00,
        tier: "Standard"
      };
      setToCache(cacheKey, defaultProfile);
      return res.json(defaultProfile);
    }
    const c = customers[0];

    let addr = null;
    try {
      const addressRes = await axios.get(`${baseUrl}/v3/customers/addresses?customer_id:in=${c.id}`, {
        headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
      });
      const addresses = addressRes.data.data;
      if (addresses && addresses.length > 0) {
        addr = addresses[0];
      }
    } catch (e) {
      console.error("Failed to fetch address", e);
    }

    // Handle string dates (ISO) or unix timestamps
    let memberSinceDate = new Date();
    if (c.date_created) {
       const parsedDate = new Date(c.date_created);
       if (!isNaN(parsedDate.getTime())) {
         memberSinceDate = parsedDate;
       } else if (!isNaN(Number(c.date_created))) {
         memberSinceDate = new Date(Number(c.date_created) * 1000);
       }
    }

    const profileData = {
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone || "N/A",
      address: addr ? addr.address1 : "",
      city: addr ? addr.city : "",
      state: addr ? addr.state_or_province : "",
      zip: addr ? addr.postal_code : "",
      company: addr ? addr.company : "",
      registryId: `BC-UID-${c.id}`,
      memberSince: memberSinceDate.toLocaleDateString(),
      lastSync: new Date().toLocaleDateString(),
      status: "Verified",
      credit: 0.00,
      tier: c.customer_group_id ? `Group ${c.customer_group_id}` : "Standard"
    };

    setToCache(cacheKey, profileData);
    res.json(profileData);
  } catch(error: any) {
    if (error.response?.status === 429) {
      return res.status(429).json({ error: "Rate limit hit. Please retry." });
    }
    console.error("Error fetching customer profile:", error?.response?.data || error?.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.get("/api/customer/threads", async (req, res) => {
  res.json([
    { id: 'SAN', subject: 'GENERAL INQUIRY: SAN', status: 'OPEN', date: '4/23/2026', message: '"Customer Name: SAN Category: General Inquiry Source: Main Contact Page Attachment: None Hello come on"' },
    { id: 'RUN', subject: 'GENERAL INQUIRY: RUN', status: 'OPEN', date: '4/23/2026', message: '"Customer Name: RUN Category: General Inquiry Source: Main Contact Page Attachment: None Where is my vinyl?"' },
    { id: 'PROJ', subject: 'REGISTRY UPDATE: YOUR PROJECT', status: 'CLOSED', date: '4/22/2026', message: '"Thank you for your order"' },
  ]);
});

app.post("/api/customer/forgot-password", async (req, res) => {
  const { email } = req.body;
  
  const bc = getBCClient();
  if (!bc) {
    console.log("BigCommerce is not configured. Mocking forgot password.");
    return res.json({ success: true, message: "Reset requested (mock)" });
  }

  try {
    let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!accessToken || !storeHash || !email) throw new Error("Missing credentials");

    let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
    if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");

    // Find customer
    const custRes = await axios.get(`${baseUrl}/v3/customers?email:in=${encodeURIComponent(String(email))}`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const customers = custRes.data.data;
    if (!customers || customers.length === 0) {
      // Return 200 anyway for security so we don't leak which emails are valid
      return res.json({ success: true, message: "If an account exists, a reset link will be sent." });
    }
    
    const c = customers[0];

    // Force password reset to invoke BigCommerce email flow
    await axios.put(`${baseUrl}/v3/customers`, [
      {
        id: c.id,
        force_password_reset: true
      }
    ], {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" }
    });
    
    return res.json({ success: true, message: "Reset requested" });
  } catch(error: any) {
    console.error("Forgot password error:", error?.response?.data || error?.message);
    res.status(500).json({ error: "Failed to initiate password reset" });
  }
});

app.post("/api/customer/login", async (req, res) => {
  const { email, password } = req.body;
  
  const bc = getBCClient();
  if (!bc) {
    return res.status(500).json({ error: "BigCommerce is not configured." });
  }

  try {
    let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!accessToken || !storeHash || !email) {
      return res.status(500).json({ error: "Missing config or email" });
    }

    let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
    if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");

    // Find customer by email via V3
    const custRes = await axios.get(`${baseUrl}/v3/customers?email:in=${encodeURIComponent(String(email))}`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const customers = custRes.data.data;
    if (!customers || customers.length === 0) {
      console.log(`No customer found for email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const c = customers[0];

    // Validate credentials using the v3 API customer validate endpoint
    try {
      let validatev3Res;
      try {
        validatev3Res = await axios.post(`${baseUrl}/v3/customers/validate-credentials`,
          { email: email, password: password },
          { headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" } }
        );
      } catch (e) {
        // If it fails without channel, fallback to channel 1
        validatev3Res = await axios.post(`${baseUrl}/v3/customers/validate-credentials`,
          { email: email, channel_id: 1, password: password },
          { headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" } }
        );
      }
      
      const isValid = validatev3Res.data?.is_valid;
      if (!isValid) {
         return res.status(401).json({ 
           error: "Invalid password.", 
           bcResponse: validatev3Res.data,
           help: "If you are trying to use your Store Admin password, please note that Storefront Customers require a separate account. Please use the 'Create Account' link to sign up as a customer."
         });
      }
    } catch (glError: any) {
      console.error("Credentials validation failed:", glError?.response?.data || glError?.message);
      return res.status(401).json({ 
        error: "Verification failed. If you are a Store Admin, you must create a Storefront Customer account first.", 
        detail: glError?.response?.data || glError?.message, 
        status: glError?.response?.status 
      });
    }

    res.json({
      id: String(c.id),
      email: c.email,
      firstName: c.first_name,
      lastName: c.last_name
    });
  } catch (error: any) {
    console.error("BC Login error", error.message);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/customer/signup", async (req, res) => {
  const { firstName, lastName, email, password, address, city, state, zip, isPrintShop } = req.body;
  
  const bc = getBCClient();
  if (!bc) {
    return res.status(500).json({ error: "BigCommerce is not configured." });
  }

  try {
    const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const response = await bc.post(`/customers`, [
      {
        email,
        first_name: firstName || "Unknown",
        last_name: lastName || "Unknown",
        authentication: {
          force_password_reset: false,
          new_password: password
        }
      }
    ], {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });

    const newCustomer = response.data.data[0];
    res.json({
      id: newCustomer.id,
      email: newCustomer.email,
      firstName: newCustomer.first_name,
      lastName: newCustomer.last_name
    });
  } catch (error: any) {
    // If BC rejects it (often due to existing email or strict format), gracefully fallback.
    // Kept console log minimal to avoid polluting terminal with expected 422 empty error objects.
    if (error.response?.status !== 422 && error.response?.status !== 409) {
      console.warn("BC API Warning (Signup):", error.response?.data?.title || error.message);
    }
    
    return res.status(error.response?.status || 500).json({ error: error.response?.data?.title || error.message || "Failed to sign up" });
  }
});

app.get("/api/customer/orders/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    // 1. Verify order belongs to email
    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}.json`;

    const orderRes = await axios.get(url, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const billingEmail = orderRes.data.billing_address?.email;
    if (billingEmail?.toLowerCase() !== (email as string)?.toLowerCase()) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // 2. Fetch messages
    let msgUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/messages.json`;

    const msgRes = await axios.get(msgUrl, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" },
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404
    });

    if (msgRes.status === 404 || msgRes.status === 204) {
      return res.json([]);
    }

    // Filter out messages that are not customer visible
    const visibleMessages = Array.isArray(msgRes.data) ? msgRes.data.filter((m: any) => m.is_customer_visible) : [];
    res.json(visibleMessages);
  } catch (error: any) {
    if (error.response?.status === 404) return res.json([]);
    res.status(500).json({ error: "Failed to fetch order messages" });
  }
});

app.post("/api/customer/orders/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { email, message } = req.body;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    // 1. Verify order belongs to email
    let url = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}.json`;

    const orderRes = await axios.get(url, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const billingEmail = orderRes.data.billing_address?.email;
    if (billingEmail?.toLowerCase() !== (email as string)?.toLowerCase()) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const customerId = orderRes.data.customer_id;

    // 2. Send message
    let msgUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${id}/messages.json`;

    const msgRes = await axios.post(msgUrl, {
      order_id: parseInt(id),
      customer_id: customerId,
      message,
      subject: "Customer Inquiry",
      is_customer_visible: true,
      status: "read"
    }, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json", "Content-Type": "application/json" }
    });
    res.json(msgRes.data);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to send order message" });
  }
});

app.get("/api/customer/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;

    // 1. Fetch order
    const orderRes = await axios.get(`${baseUrl}/orders/${id}.json`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });
    
    const o = orderRes.data;

    // 2. Security Check: Verify order email matches requested email
    if (o.billing_address?.email?.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: "Unauthorized access to this order" });
    }

    // 3. Fetch order products
    const productsRes = await axios.get(`${baseUrl}/orders/${id}/products.json`, {
      headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
    });

    // 4. Fetch shipping addresses
    let shippingAddresses: any[] = [];
    try {
      const shipRes = await axios.get(`${baseUrl}/orders/${id}/shipping_addresses.json`, {
         headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
      });
      shippingAddresses = Array.isArray(shipRes.data) ? shipRes.data : [];
    } catch (e) {
      console.error("No shipping addresses found");
    }

    // 5. Fetch shipments for tracking information
    let shipments: any[] = [];
    try {
      const shipmentsRes = await axios.get(`${baseUrl}/orders/${id}/shipments.json`, {
        headers: { "X-Auth-Token": accessToken, "Accept": "application/json" }
      });
      shipments = Array.isArray(shipmentsRes.data) ? shipmentsRes.data : [];
    } catch (e) {
      console.error("No shipments found");
    }

    const formattedOrder = {
      id: o.id.toString(),
      customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Member Guest",
      status: o.status || "Pending",
      total: parseFloat(o.total_inc_tax) || parseFloat(o.total || 0),
      subtotal: parseFloat(o.subtotal_inc_tax) || 0,
      shipping_cost: parseFloat(o.shipping_cost_inc_tax) || 0,
      tax: parseFloat(o.total_tax) || 0,
      date: new Date(o.date_created).toLocaleDateString(),
      payment_method: o.payment_method || "N/A",
      billing_address: o.billing_address,
      shipping_address: shippingAddresses[0] || null,
      shipments: shipments.map((s: any) => ({
        id: s.id,
        tracking_number: s.tracking_number,
        tracking_link: s.tracking_link,
        shipping_provider: s.shipping_provider || s.tracking_carrier,
        shipping_method: s.shipping_method || s.tracking_method,
        date_created: s.date_created
      })),
      items: productsRes.data.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        units: p.quantity,
        price: parseFloat(p.price_inc_tax) || parseFloat(p.base_price || 0)
      }))
    };
    
    res.json(formattedOrder);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("BC Customer Order Detail Fetch error:", errorData);
    res.status(500).json({ 
      error: "Failed to fetch order details",
      details: typeof errorData === 'object' ? JSON.stringify(errorData) : errorData
    });
  }
});


// Helper to get external base URL for redirects
const getExternalBaseUrl = (req: any) => {
  // Use explicit environment variable if set
  if (process.env.APP_URL) return process.env.APP_URL;
  
  // Use x-forwarded headers which are set by the AI Studio proxy
  const forwardedHost = req.header('x-forwarded-host');
  const forwardedProto = req.header('x-forwarded-proto') || 'https';
  
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim();
    return `${forwardedProto}://${host}`;
  }
  
  // Fallback to origin header from browser
  const origin = req.get('origin');
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return origin;
  }

  // Fallback to referer header from browser
  const referer = req.get('referer');
  if (referer) {
    try {
      const refUrl = new URL(referer);
      if (!refUrl.hostname.includes('localhost')) {
        return `${refUrl.protocol}//${refUrl.host}`;
      }
    } catch (e) {}
  }

  // Last resort: standard host header
  return `${req.protocol}://${req.get('host')}`;
};


// V3 Checkout & Cart Integration
app.post("/api/checkout/v3", async (req, res) => {
  const bc = getBCClient();
  const { cart, email, shipping_address } = req.body;

  if (!bc) return res.status(500).json({ error: "BigCommerce not configured" });

  try {
    // 1. Create a Cart
    const cartItems = cart.map((item: any) => {
      const lineItem: any = {
        product_id: Number(item.id),
        quantity: Number(item.quantity)
      };
      
      if (item.variant_id) {
        lineItem.variant_id = Number(item.variant_id);
      }
      
      // Include option selections if they exist
      if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
        lineItem.option_selections = Object.entries(item.selectedOptions).map(([option_id, option_value]) => ({
          option_id: Number(option_id),
          option_value: Number(option_value)
        }));
      }
      
      return lineItem;
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const baseUrl = getExternalBaseUrl(req);
    console.log(`[Checkout] Generating redirect URLs with baseUrl: ${baseUrl}`);
    
    const channelId = Number(process.env.BIGCOMMERCE_CHANNEL_ID) || 1;
    const cartResponse = await bc.post("/carts?include=redirect_urls", {
      line_items: cartItems,
      channel_id: channelId, 
      redirect_urls: {
        cart_url: `${baseUrl}/cart`,
        return_url: `${baseUrl}/order-success`,
        abandoned_checkout_url: `${baseUrl}/cart`
      }
    });
    
    console.log("[Checkout] BigCommerce Cart Response Redirect URLs:", JSON.stringify(cartResponse.data?.data?.redirect_urls));
    
    const cartData = cartResponse.data?.data;
    if (!cartData || !cartData.id) {
      throw new Error("Failed to create cart in BigCommerce.");
    }
    const cartId = cartData.id;
    const checkoutId = cartId; // In BC, Cart ID and Checkout ID are usually the same UUID

    // 2. Add Billing Address
    try {
      if (shipping_address && email) {
        await bc.post(`/checkouts/${checkoutId}/billing-address`, {
          first_name: shipping_address.first_name || "Guest",
          last_name: shipping_address.last_name || "Customer",
          email: email,
          address1: shipping_address.street_1 || "",
          city: shipping_address.city || "",
          state_or_province: shipping_address.state || "",
          state_or_province_code: shipping_address.state || "",
          postal_code: shipping_address.zip || "",
          country_code: "US"
        });
      }
    } catch (billingErr: any) {
      console.warn("Billing Address Error (ignoring):", JSON.stringify(billingErr.response?.data || billingErr.message));
      // We can continue if billing fails, user can enter it on BC side
    }

    // 3. Add Consignment (Shipping Address)
    // This also triggers the calculation of shipping rates
    const physicalItems = cartData.line_items?.physical_items || [];
    
    if (physicalItems.length > 0 && shipping_address) {
      try {
        await bc.post(`/checkouts/${checkoutId}/consignments?include=consignments.available_shipping_options`, [
          {
            shipping_address: {
              first_name: shipping_address.first_name || "Guest",
              last_name: shipping_address.last_name || "Customer",
              address1: shipping_address.street_1 || "",
              city: shipping_address.city || "",
              state_or_province: shipping_address.state || "",
              state_or_province_code: shipping_address.state || "",
              postal_code: shipping_address.zip || "",
              country_code: "US",
              phone: shipping_address.phone || ""
            },
            line_items: physicalItems.map((item: any) => ({
              item_id: item.id,
              quantity: item.quantity
            }))
          }
        ]);
      } catch (consignmentErr: any) {
        console.warn("Consignment Error (ignoring):", JSON.stringify(consignmentErr.response?.data || consignmentErr.message));
        // We can continue if consignment fails, user can enter it on BC side
      }
    }
    
    // 4. Get the Checkout URL
    let checkoutUrl = cartData.redirect_urls?.checkout_url;

    // We always call the redirect_urls endpoint to set/update custom URLs explicitly 
    // and get a valid checkout URL session.
    try {
      const urlResponse = await bc.post(`/carts/${cartId}/redirect_urls`, {
        cart_url: `${baseUrl}/cart`,
        return_url: `${baseUrl}/order-success`,
        abandoned_checkout_url: `${baseUrl}/cart`
      });
      if (urlResponse.data?.data?.checkout_url) {
        checkoutUrl = urlResponse.data.data.checkout_url;
      }
    } catch (urlErr: any) {
      console.warn("Failed to set explicit redirect_urls", urlErr.response?.data || urlErr.message);
      if (!checkoutUrl) checkoutUrl = cartData.redirect_urls?.checkout_url;
    }

    if (!checkoutUrl) {
      throw new Error("Could not generate a secure checkout URL from BigCommerce.");
    }

    res.json({ success: true, checkout_url: checkoutUrl });
  } catch (error: any) {
    const errorBody = error.response?.data;
    console.error("V3 Checkout Error:", JSON.stringify(errorBody || error.message, null, 2));
    const status = error.response?.status || 500;
    const detail = errorBody?.title || errorBody?.errors || error.message;
    res.status(status).json({ 
      error: "Could not initialize secure checkout.",
      details: typeof detail === 'object' ? JSON.stringify(detail) : detail
    });
  }
});

// Direct Buy Now API Route
app.post("/api/buy-now", async (req, res) => {
  const bc = getBCClient();
  const { product_id, variant_id, quantity, options } = req.body;
  
  if (!bc) return res.status(500).json({ error: "BigCommerce not configured" });

  try {
    // 1. Create a Cart
    const lineItem: any = {
      product_id: Number(product_id),
      quantity: Number(quantity) || 1
    };

    if (variant_id) {
      lineItem.variant_id = Number(variant_id);
    }

    if (options && options.length > 0) {
      lineItem.option_selections = options;
    }

    const baseUrl = getExternalBaseUrl(req);
    console.log(`[BuyNow] Generating redirect URLs with baseUrl: ${baseUrl}`);
    
    const channelId = Number(process.env.BIGCOMMERCE_CHANNEL_ID) || 1;
    const cartResponse = await bc.post("/carts?include=redirect_urls", {
      line_items: [lineItem],
      channel_id: channelId, 
      redirect_urls: {
        cart_url: `${baseUrl}/cart`,
        return_url: `${baseUrl}/order-success`,
        abandoned_checkout_url: `${baseUrl}/cart`
      }
    });

    console.log("[BuyNow] BigCommerce Cart Response Redirect URLs:", JSON.stringify(cartResponse.data?.data?.redirect_urls));

    const cartData = cartResponse.data?.data;
    if (!cartData || !cartData.id) {
       throw new Error("Failed to create Buy Now cart.");
    }
    const cartId = cartData.id;
    
    // 2. Get Checkout URL
    let checkoutUrl = cartData.redirect_urls?.checkout_url;

    try {
      const urlResponse = await bc.post(`/carts/${cartId}/redirect_urls`, {
        cart_url: `${baseUrl}/cart`,
        return_url: `${baseUrl}/order-success`,
        abandoned_checkout_url: `${baseUrl}/cart`
      });
      if (urlResponse.data?.data?.checkout_url) {
        checkoutUrl = urlResponse.data.data.checkout_url;
      }
    } catch (urlErr: any) {
      console.warn("Failed to set explicit redirect_urls in BuyNow", urlErr.response?.data || urlErr.message);
      if (!checkoutUrl) checkoutUrl = cartData.redirect_urls?.checkout_url;
    }

    if (!checkoutUrl) {
      throw new Error("Could not generate a checkout URL.");
    }

    res.json({ success: true, checkout_url: checkoutUrl });
  } catch (error: any) {
    const errorBody = error.response?.data;
    console.error("Buy Now Error:", JSON.stringify(errorBody || error.message, null, 2));
    const status = error.response?.status || 500;
    res.status(status).json({ 
      error: "Failed to create direct checkout",
      details: typeof errorBody === 'object' ? JSON.stringify(errorBody) : error.message
    });
  }
});

// Newsletter Subscribe API Route
app.post("/api/newsletter/subscribe", async (req, res) => {
  const bc = getBCClient();
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!bc) return res.status(500).json({ error: "BigCommerce not configured" });

  try {
    await bc.post("/customers/subscribers", {
      email,
      source: "Storefront Footer",
      channel_id: 1
    });
    res.json({ success: true, message: "Subscription successful" });
  } catch (error: any) {
    // BigCommerce returns 409 if email already exists as a subscriber
    if (error.response?.status === 409) {
      return res.json({ success: true, message: "Email already subscribed" });
    }
    console.error("Newsletter Subscription Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Subscription failed" });
  }
});

// Create Order Directly API Route (Custom Checkout)
app.post("/api/orders/create", async (req, res) => {
  const bc = getBCClient();
  const { cart, email, shipping_address, billing_address, shipping_method, customer_id } = req.body;
  
  if (!bc) {
    return res.status(500).json({ error: "BigCommerce not configured" });
  }

  try {
    const config = getBCConfig();
    if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
    const { storeHash, accessToken } = config;

    const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;

    // Format products for V2 Order API
    const products = cart.map((item: any) => ({
      product_id: item.id,
      quantity: item.quantity,
      price_inc_tax: item.price,
      price_ex_tax: item.price,
      // Map options if any
      ...(item.selectedOptions ? {
        config_id: 0, // Not used but sometimes required in older schemas
        product_options: Object.entries(item.selectedOptions).map(([optId, valId]) => ({
          id: Number(optId),
          value: String(valId)
        }))
      } : {})
    }));

    // Calculate totals
    const subtotal = cart.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const shipping_cost = shipping_method === 'express' ? 35.99 : 0;
    const total = subtotal + shipping_cost;

    const orderPayload = {
      customer_id: customer_id || 0,
       billing_address: {
        first_name: billing_address?.first_name || shipping_address?.first_name,
        last_name: billing_address?.last_name || shipping_address?.last_name,
        street_1: billing_address?.street_1 || shipping_address?.street_1,
        city: billing_address?.city || shipping_address?.city,
        state: billing_address?.state || shipping_address?.state,
        zip: billing_address?.zip || shipping_address?.zip,
        country: "United States",
        email: email,
        phone: shipping_address?.phone || ""
      },
      shipping_addresses: [
        {
          first_name: shipping_address.first_name,
          last_name: shipping_address.last_name,
          street_1: shipping_address.street_1,
          city: shipping_address.city,
          state: shipping_address.state,
          zip: shipping_address.zip,
          country: "United States",
          phone: shipping_address.phone
        }
      ],
      products: products,
      status_id: 1, // Pending
      customer_message: "Custom Checkout Order",
      payment_method: "Manual / Custom Checkout",
      shipping_cost_ex_tax: shipping_cost,
      shipping_cost_inc_tax: shipping_cost
    };

    const response = await axios.post(`${baseUrl}/orders.json`, orderPayload, {
      headers: { 
        "X-Auth-Token": accessToken, 
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    res.json({ success: true, order_id: response.data.id });
  } catch (error: any) {
    console.error("Custom Order Creation error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Failed to create order.", 
      details: error.response?.data || error.message 
    });
  }
});

// Checkout Generation API Route (Legacy)
app.post("/api/checkout", async (req, res) => {
  const bc = getBCClient();
  const { cart, email } = req.body;
  
  if (!bc) {
    return res.status(400).json({ error: "BigCommerce not configured." });
  }

  try {
    const lineItems = cart.map((item: any) => ({
      product_id: item.id,
      quantity: item.quantity,
      variant_id: item.variant_id
    }));

    const response = await bc.post("/carts", {
      line_items: lineItems,
      channel_id: 1
    });

    const cartId = response.data.data.id;
    const urlResponse = await bc.post(`/carts/${cartId}/redirect_urls`, {
      cart_url: `${getExternalBaseUrl(req)}/cart`,
      return_url: `${getExternalBaseUrl(req)}/order-success`,
    });

    res.json({ checkout_url: urlResponse.data.data.checkout_url });
  } catch (error: any) {
    res.status(422).json({ error: "Checkout failed" });
  }
});

// Advanced Checkout v3 (Handles addresses and customer sync)
app.post("/api/checkout/v3", async (req, res) => {
  const bc = getBCClient();
  const { cart, email, shipping_address } = req.body;
  
  if (!bc) {
    return res.status(400).json({ error: "BigCommerce not configured." });
  }

  try {
    // 1. Create the Cart
    const lineItems = cart.map((item: any) => ({
      product_id: item.id,
      quantity: item.quantity,
      variant_id: item.variant_id,
      option_selections: item.selectedOptions ? Object.entries(item.selectedOptions).map(([oid, vid]) => ({
        option_id: Number(oid),
        option_value: Number(vid)
      })) : []
    }));

    const cartResponse = await bc.post("/carts", {
      line_items: lineItems,
      channel_id: parseInt(process.env.BIGCOMMERCE_CHANNEL_ID || "1", 10) || 1,
    });

    const cartId = cartResponse.data.data.id;

    // 2. Create the Checkout Redirect URL
    const baseUrl = getExternalBaseUrl(req);
    const urlResponse = await bc.post(`/carts/${cartId}/redirect_urls`, {
      cart_url: `${baseUrl}/cart`,
      return_url: `${baseUrl}/order-success`,
    });

    if (urlResponse.data?.data?.checkout_url) {
      return res.json({ checkout_url: urlResponse.data.data.checkout_url });
    }

    res.status(500).json({ error: "Failed to generate session." });
  } catch (error: any) {
    console.error("Checkout V3 Error:", error.response?.data || error.message);
    res.status(422).json({ details: error.response?.data?.title || "Payment session failed." });
  }
});

// INITIALIZE BIGCOMMERCE CHECKOUT SESSION
app.post("/api/checkout/init", async (req, res) => {
  const bc = getBCClient();
  const { cart, email } = req.body;

  if (!bc) return res.status(400).json({ error: "BC Missing" });

  try {
    // 1. Create Cart
    const cartRes = await bc.post("/carts", {
      line_items: cart.map((i: any) => ({
        product_id: i.id,
        quantity: i.quantity,
        variant_id: i.variant_id
      })),
      channel_id: 1
    });
    
    const cartId = cartRes.data.data.id;

    // 2. We need a Storefront Token to use the SDK securely from client side
    // If not available, we can facilitate the SDK calls via the server
    
    res.json({ 
      cartId, 
      checkoutId: cartId // They are the same in V3
    });
  } catch (error: any) {
    console.error("Checkout Init Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to initialize secure session" });
  }
});

// FULL INTEGRATED CHECKOUT (On-site Payment)
app.post("/api/checkout/process", async (req, res) => {
  const bc = getBCClient();
  const { cart, email, nonce, shipping_address, shipping_id } = req.body;

  if (!bc) return res.status(400).json({ error: "Store not configured." });

  try {
    const config = getBCConfig();
    if (!config) return res.status(400).json({ error: "Store not configured." });
    const { storeHash, accessToken } = config;
    const v2Url = `https://api.bigcommerce.com/stores/${storeHash}/v2`;

    // 1. Create a Checkout to get actual totals and tax
    // (In a real app, you'd do this to ensure pricing matches)
    
    // 2. Create the Order in BigCommerce using V2 API
    const stateMap: Record<string, string> = {
      "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
      "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
      "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
      "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
      "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
      "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
      "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
      "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
      "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
      "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
    };

    const stateName = stateMap[shipping_address.state] || shipping_address.state;

    const orderData = {
      customer_id: 0,
      billing_address: {
        first_name: shipping_address.first_name || "Guest",
        last_name: shipping_address.last_name || "Customer",
        street_1: shipping_address.street_1,
        city: shipping_address.city,
        state: stateName,
        zip: shipping_address.zip,
        country: "United States",
        country_iso2: "US",
        phone: shipping_address.phone || "0000000000",
        email: email
      },
      shipping_addresses: [
        {
          first_name: shipping_address.first_name || "Guest",
          last_name: shipping_address.last_name || "Customer",
          street_1: shipping_address.street_1,
          city: shipping_address.city,
          state: stateName,
          zip: shipping_address.zip,
          country: "United States",
          country_iso2: "US",
          phone: shipping_address.phone || "0000000000",
          shipping_method: "Standard Shipping"
        }
      ],
      products: cart.map((item: any) => ({
        product_id: Number(item.id),
        variant_id: item.variant_id ? Number(item.variant_id) : undefined,
        quantity: Number(item.quantity),
        name: item.name || "Custom Sticker",
        price_inc_tax: Number(item.price) || 0,
        price_ex_tax: Number(item.price) || 0
      })),
      status_id: 0, // Incomplete
      external_id: `WEB-${Date.now()}`
    };

    console.log("Sending V2 Order Data:", JSON.stringify(orderData, null, 2));

    const orderRes = await axios.post(`${v2Url}/orders`, orderData, {
      headers: { "X-Auth-Token": accessToken }
    });
    const orderId = orderRes.data.id;
    // Use BigCommerce's calculated order total to charge via Square
    const totalAmount = parseFloat(orderRes.data.total_inc_tax || 0);

    // 3. Process Payment through BigCommerce Payments API
    try {
      console.log(`Processing Secure Payment for Order #${orderId}`);
      const v3Url = `https://api.bigcommerce.com/stores/${storeHash}/v3`;
      
      // Step A: Request Payment Access Token
      const patRes = await axios.post(`${v3Url}/payments/access_tokens`, {
        order: {
          id: orderId,
          is_recurring: false
        }
      }, {
        headers: {
          "X-Auth-Token": accessToken,
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });
      const paymentAccessToken = patRes.data.data.id;

      // Step B: Submit Payment
      // Always use Square — it is the configured payment gateway
      const paymentGatewayId = 'squarev2';
      
      try {
        const providerNames: Record<string, string> = { "squarev2": "Square", "braintree": "Credit Card" };
        const paymentMethodName = providerNames[paymentGatewayId] || "Credit Card";

        if (paymentGatewayId === 'squarev2' && squareClient && nonce && !nonce.includes("fake")) {
          // Process payment directly with Square API
          console.log(`Processing Square Payment for Order #${orderId}`);
          
          try {
            await squareClient.payments.create({
              sourceId: nonce,
              idempotencyKey: `sq-payment-${orderId}-${Date.now()}`,
              amountMoney: {
                amount: BigInt(Math.round(totalAmount * 100)), // Send in cents
                currency: 'USD'
              },
              referenceId: orderId.toString() // Optional reference
            });

            console.log(`Square Payment successfully captured for Order #${orderId}`);
            
            // Explicitly update BigCommerce order to record the payment method 
            await axios.put(`${v2Url}/orders/${orderId}`, { 
              status_id: 11, // 11 = Awaiting Fulfillment
              payment_method: paymentMethodName
            }, {
              headers: { "X-Auth-Token": accessToken }
            });
          } catch(sqError: any) {
            console.error("Square API Error:", JSON.stringify(sqError.errors || sqError.message));
            
            let errMsg = sqError.message || "Payment declined";
            if (sqError.errors && sqError.errors.length > 0) {
              errMsg = sqError.errors[0].detail || sqError.errors[0].code;
            }
            
            // Revert order status or rely on unpaid
            throw new Error(`Square Gateway Error: ${errMsg}`);
          }
        } else {
          // No Square client configured — payment cannot proceed
          throw new Error("Square payment gateway is not configured on this server. Add SQUARE_ACCESS_TOKEN to your environment.");
        }
      } catch (gatewayError: any) {
        // Surface the real error — do NOT silently succeed
        const errMsg = gatewayError.message || "Payment gateway error";
        console.error("Gateway Error (will NOT mark order paid):", errMsg);
        
        // Cancel/void the unpaid order so BigCommerce doesn't send a false confirmation
        await axios.put(`${v2Url}/orders/${orderId}`, { 
          status_id: 0 // Incomplete — revert
        }, {
          headers: { "X-Auth-Token": accessToken }
        }).catch(() => {});
        
        return res.status(402).json({ success: false, error: errMsg });
      }

      res.json({ 
        success: true, 
        orderId: orderId,
        message: "Order finalized"
      });
    } catch (payError: any) {
      console.error("Checkout Payment Sync Error:", payError.message);
      // Surface the real error — never silently succeed on a payment failure
      return res.status(402).json({ success: false, error: payError.message || "Payment processing failed." });
    }

  } catch (error: any) {
    const errorDetail = error.response?.data;
    console.error("DEBUG: Full BC Error Object:", JSON.stringify(errorDetail || error.message, null, 2));
    
    // Improved error parsing for V2/V3 arrays or objects
    let errorMessage = "We could not process your payment. Please verify your details.";
    
    if (Array.isArray(errorDetail)) {
      // V2 often returns an array [ { status, message } ]
      errorMessage = errorDetail[0]?.message || errorMessage;
    } else if (errorDetail?.errors) {
      // V3 format
      errorMessage = Object.values(errorDetail.errors).join(", ") || errorMessage;
    } else if (errorDetail?.message) {
      // Single object format
      errorMessage = errorDetail.message;
    }

    res.status(422).json({ 
      success: false, 
      error: errorMessage,
      details: errorDetail
    });
  }
});

// GET SHIPPING METHODS FOR CUSTOM CHECKOUT
app.post("/api/checkout/shipping-methods", async (req, res) => {
  const bc = getBCClient();
  const { cart, address } = req.body;

  if (!bc) return res.status(400).json({ error: "BC Missing" });

  try {
    // Step 1: Create a Temp Cart
    const cartRes = await bc.post("/carts", {
      line_items: cart.map((i: any) => ({ product_id: i.id, quantity: i.quantity, variant_id: i.variant_id })),
      channel_id: 1
    });
    
    const checkoutId = cartRes.data.data.id;

    // Step 2: Add Consignment (Address) to get shipping options
    const consignmentRes = await bc.post(`/checkouts/${checkoutId}/consignments`, [
      {
        shipping_address: {
          first_name: address.firstName || "Customer",
          last_name: address.lastName || "Name",
          address1: address.address,
          city: address.city,
          state_or_province: address.state,
          postal_code: address.zip,
          country_code: "US"
        },
        line_items: cart.map((i: any) => ({ item_id: i.id, quantity: i.quantity }))
      }
    ], { params: { include: 'consignments.available_shipping_options' } });

    const consignments = consignmentRes.data.data.consignments;
    if (consignments && consignments.length > 0) {
      const options = consignments[0].available_shipping_options || [];
      return res.json({ options });
    }

    res.json({ options: [] });
  } catch (error: any) {
    console.error("Shipping Fetch Error:", error.response?.data || error.message);
    // Return some fallback mock options if real fetch fails during setup
    res.json({ 
      options: [
        { id: '1', type: 'Flat Rate', description: 'Standard Shipping', cost: 10, name: 'Standard' },
        { id: '2', type: 'Expedited', description: 'Express Shipping', cost: 25, name: 'Express' }
      ]
    });
  }
});

app.get("/api/health/bigcommerce", async (req, res) => {
  const bc = getBCClient();
  if (!bc) {
    return res.json({ connected: false, message: "BigCommerce is not configured (missing hash or token)." });
  }
  try {
    // Get store info
    const storeResponse = await bc.get("/store/information");
    const storeData = storeResponse.data;
    
    // Get product count
    const productsResponse = await bc.get("/catalog/products?limit=1&include_fields=id");
    const productCount = productsResponse.data.meta?.pagination?.total || 0;

    res.json({ 
      connected: true, 
      storeName: storeData?.name || "Connected",
      domain: storeData?.domain,
      status: storeData?.status,
      productCount: productCount,
      message: `System linked to ${storeData?.name || "Store"}. Catalog reflects ${productCount} items.`
    });
  } catch (error: any) {
    res.json({ 
      connected: false, 
      message: error.message, 
      status: error.response?.status,
      detail: error.response?.data?.title || error.response?.data || "No details"
    });
  }
});

// BigCommerce Email Templates API
app.get("/api/admin/email-templates", async (req, res) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BC not configured" });
  try {
    const response = await bc.get("/marketing/email-templates");
    res.json(response.data);
  } catch (error: any) {
    console.error("BC Email Templates Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch email templates" });
  }
});

app.get("/api/admin/email-templates/:id", async (req, res) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BC not configured" });
  try {
    const response = await bc.get(`/marketing/email-templates/${req.params.id}`);
    res.json(response.data);
  } catch (error: any) {
    console.error("BC Email Template Detail Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch email template detail" });
  }
});

app.put("/api/admin/email-templates/:id", async (req, res) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BC not configured" });
  try {
    const response = await bc.put(`/marketing/email-templates/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("BC Email Template Update Error:", JSON.stringify(errorData, null, 2));
    res.status(error.response?.status || 500).json({ 
      error: "Failed to update email template", 
      details: errorData 
    });
  }
});

app.post("/api/admin/email-templates/test", async (req, res) => {
  const { email } = req.body;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: "RESEND_API_KEY not configured. Testing in offline mode." });
  }

  try {
    // Basic connectivity check / test send
    await axios.post("https://api.resend.com/emails", {
      from: "Email Lab <onboarding@resend.dev>",
      to: [email],
      subject: "Diagnostic Dispatch: Online",
      html: "<strong>System logic verified.</strong> Communication portal is active."
    }, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    res.json({ success: true, message: "Live test transmitted" });
  } catch (error: any) {
    console.error("Resend Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Transmission failed" });
  }
});

// Categories API Route
app.get("/api/categories", async (req, res) => {
  const bc = getBCClient();
  if (!bc) {
    console.warn("BigCommerce not configured. Returning mock categories.");
    return res.json({
      data: [
        { id: 1, parent_id: 0, name: "Vinyl Stickers", is_visible: true, url: "/vinyl" },
        { id: 2, parent_id: 1, name: "Die-Cut", is_visible: true, url: "/vinyl/die-cut" },
        { id: 3, parent_id: 1, name: "Holographic", is_visible: true, url: "/vinyl/holographic" }
      ],
      meta: { is_mock: true }
    });
  }

  try {
    const response = await bc.get("/catalog/categories");
    res.json(response.data);
  } catch (error: any) {
    console.error("BC Categories Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.VERCEL) return; // Vercel handles static routing and doesn't support Vite middleware in Lambda

  if (process.env.NODE_ENV !== "production") {
    const vitePkg = "vi" + "te";
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
