import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ---- BigCommerce helpers ----
const getBCConfig = () => {
  let storeHash = (process.env.BIGCOMMERCE_STORE_HASH || "").replace(/['"]/g, "").trim();
  const accessToken = (process.env.BIGCOMMERCE_ACCESS_TOKEN || "").replace(/['"]/g, "").trim();
  if (!storeHash || !accessToken) return null;
  const m = storeHash.match(/stores\/([a-z0-9]+)/i);
  if (m) storeHash = m[1];
  else if (storeHash.includes("://")) {
    const parts = storeHash.split("/");
    storeHash = parts[parts.length - 1] || parts[parts.length - 2];
  }
  return { storeHash, accessToken };
};

const getBCClient = () => {
  const c = getBCConfig();
  if (!c) return null;
  return axios.create({
    baseURL: `https://api.bigcommerce.com/stores/${c.storeHash}/v3`,
    headers: { "X-Auth-Token": c.accessToken, Accept: "application/json", "Content-Type": "application/json" },
  });
};

// ---- Cache ----
const cache = new Map<string, { data: any; ts: number }>();
const TTL = { products: 600000, product: 900000 };
const cached = (k: string, ttl: number) => { const c = cache.get(k); return c && Date.now() - c.ts < ttl ? c.data : null; };
const setCache = (k: string, d: any) => cache.set(k, { data: d, ts: Date.now() });

// ---- Health ----
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString(), bc: !!getBCConfig() });
});

// ---- Products ----
app.get("/api/products", async (req, res) => {
  const ck = "all_products";
  const hit = cached(ck, TTL.products);
  if (hit) return res.json({ data: hit });

  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    let all: any[] = [];
    let page = 1;
    let more = true;
    while (more && page <= 10) {
      const r = await bc.get(`/catalog/products?include=images,variants,primary_image,options,modifiers,custom_fields&limit=250&page=${page}&sort=id&direction=desc`);
      all = [...all, ...(r.data.data || [])];
      const p = r.data.meta?.pagination;
      if (p && p.current_page < p.total_pages) page++;
      else more = false;
    }
    setCache(ck, all);
    res.json({ data: all });
  } catch (e: any) {
    console.error("BC Products Error:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message, details: e.response?.data });
  }
});

// ---- Single Product ----
app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined") return res.status(400).json({ error: "Invalid product ID" });

  const ck = `product_${id}`;
  const hit = cached(ck, TTL.product);
  if (hit) return res.json(hit);

  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const r = await bc.get(`/catalog/products/${id}?include=images,variants,primary_image,options,modifiers,custom_fields`);
    setCache(ck, r.data);
    res.json(r.data);
  } catch (e: any) {
    console.error(`BC Product ${id} Error:`, e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message, details: e.response?.data });
  }
});

// ---- Delete Product ----
app.delete("/api/products/:id", async (req, res) => {
  const bc = getBCClient();
  const { id } = req.params;
  if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    await bc.delete(`/catalog/products/${id}`);
    cache.delete("all_products");
    res.json({ success: true });
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ---- Categories ----
app.get("/api/categories", async (_req, res) => {
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    const r = await bc.get("/catalog/categories?limit=250");
    res.json(r.data);
  } catch (e: any) {
    console.error("BC Categories Error:", e.response?.status, e.message);
    res.status(e.response?.status || 500).json({ error: e.message });
  }
});

// ---- Checkout (Square) — lazy-loaded to avoid module-level crash ----
app.post("/api/checkout/create-payment", async (req, res) => {
  try {
    const { SquareClient, SquareEnvironment } = await import("square");
    const token = process.env.SQUARE_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "Square not configured" });

    const client = new SquareClient({
      environment: (process.env.VITE_SQUARE_APPLICATION_ID?.startsWith("sq0idp-") || token.startsWith("EAAA"))
        ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
      token,
    });

    const { sourceId, amount, currency, orderId } = req.body;
    const result = await client.payments.create({
      sourceId,
      idempotencyKey: `${orderId}-${Date.now()}`,
      amountMoney: { amount: BigInt(Math.round(amount * 100)), currency: currency || "USD" },
    });
    res.json({ success: true, payment: result });
  } catch (e: any) {
    console.error("Square payment error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ---- Customer Login ----
app.post("/api/customer/login", async (req, res) => {
  const { email, password } = req.body;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!accessToken || !storeHash || !email) return res.status(500).json({ error: "Missing config or email" });

    let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
    if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");

    const custRes = await axios.get(`${baseUrl}/v3/customers?email:in=${encodeURIComponent(String(email))}`, {
      headers: { "X-Auth-Token": accessToken, Accept: "application/json" },
    });
    const customers = custRes.data.data;
    if (!customers || customers.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const c = customers[0];

    try {
      let vRes;
      try {
        vRes = await axios.post(`${baseUrl}/v3/customers/validate-credentials`, { email, password }, {
          headers: { "X-Auth-Token": accessToken, Accept: "application/json", "Content-Type": "application/json" },
        });
      } catch {
        vRes = await axios.post(`${baseUrl}/v3/customers/validate-credentials`, { email, channel_id: 1, password }, {
          headers: { "X-Auth-Token": accessToken, Accept: "application/json", "Content-Type": "application/json" },
        });
      }
      if (!vRes.data?.is_valid) return res.status(401).json({ error: "Invalid password." });
    } catch (e: any) {
      return res.status(401).json({ error: "Verification failed.", detail: e?.response?.data || e?.message });
    }

    res.json({ id: String(c.id), email: c.email, firstName: c.first_name, lastName: c.last_name });
  } catch (e: any) {
    console.error("BC Login error", e.message);
    res.status(500).json({ error: "Login failed" });
  }
});

// ---- Customer Signup ----
app.post("/api/customer/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "BigCommerce is not configured." });

  try {
    const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
    const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
    if (!password) return res.status(400).json({ error: "Password is required" });

    const response = await bc.post("/customers", [{
      email,
      first_name: firstName || "Unknown",
      last_name: lastName || "Unknown",
      authentication: { force_password_reset: false, new_password: password },
    }]);

    const newCustomer = response.data.data[0];

    // Retrospective guest order sync
    try {
      let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
      if (storeHash?.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");
      const gRes = await axios.get(`${baseUrl}/v2/orders.json?email=${encodeURIComponent(email)}&customer_id=0`, {
        headers: { "X-Auth-Token": accessToken, Accept: "application/json" },
      });
      const orders = Array.isArray(gRes.data) ? gRes.data : [];
      for (const o of orders) {
        await axios.put(`${baseUrl}/v2/orders/${o.id}.json`, { customer_id: newCustomer.id }, {
          headers: { "X-Auth-Token": accessToken, Accept: "application/json" },
        });
      }
    } catch (syncErr) { console.error("Order sync failed:", syncErr); }

    res.json({ id: newCustomer.id, email: newCustomer.email, firstName: newCustomer.first_name, lastName: newCustomer.last_name });
  } catch (e: any) {
    res.status(e.response?.status || 500).json({ error: e.response?.data?.title || e.message || "Signup failed" });
  }
});

// ---- Customer Profile ----
app.get("/api/customer/profile", async (req, res) => {
  const { email } = req.query;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    const r = await bc.get(`/customers?email:in=${encodeURIComponent(String(email))}`);
    const c = r.data.data?.[0];
    if (!c) return res.status(404).json({ error: "Customer not found" });
    res.json({ id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Customer Orders ----
app.get("/api/customer/orders", async (req, res) => {
  const { email } = req.query;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;
  let storeHash = process.env.BIGCOMMERCE_STORE_HASH || "";
  if (!accessToken || !storeHash) return res.status(500).json({ error: "Not configured" });
  let baseUrl = `https://api.bigcommerce.com/stores/${storeHash}`;
  if (storeHash.startsWith("http")) baseUrl = storeHash.replace(/\/v[23]\/?$/, "");
  try {
    const r = await axios.get(`${baseUrl}/v2/orders.json?email=${encodeURIComponent(String(email))}`, {
      headers: { "X-Auth-Token": accessToken, Accept: "application/json" },
    });
    res.json(Array.isArray(r.data) ? r.data : []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Forgot Password ----
app.post("/api/customer/forgot-password", async (req, res) => {
  const { email } = req.body;
  const bc = getBCClient();
  if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    const r = await bc.get(`/customers?email:in=${encodeURIComponent(email)}`);
    if (!r.data.data?.length) return res.status(404).json({ error: "Email not found" });
    res.json({ success: true, message: "If this email exists, a reset link has been sent." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Fallback ----
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} is not available in production.` });
});


export default app;
