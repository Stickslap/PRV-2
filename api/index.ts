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

// ---- Proxy all other /api routes to the full server (best-effort) ----
app.all("/api/*", async (req, res) => {
  // For routes not explicitly handled above, return a useful error
  res.status(404).json({ error: `Route ${req.method} ${req.path} is not available in production.` });
});

export default app;
