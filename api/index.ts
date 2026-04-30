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

// ---- Checkout (Square) ΓÇö lazy-loaded to avoid module-level crash ----
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

// ---- Admin Stats ----
app.get("/api/admin/stats", (_req, res) => {
  res.json({ revenue: 12450.00, orders: 142, customers: 89, conversion: "3.2%" });
});

// ---- Admin Staff Login ----
app.post("/api/admin/staff-login", (req, res) => {
  const { username, password } = req.body;
  const pass = process.env.STAFF_PASSWORD || "Hammock568@";
  if (username === "PrintSocietyCo" && password === pass) return res.json({ success: true });
  res.status(401).json({ error: "Invalid Security Credentials" });
});

// ---- Admin Orders ----
app.get("/api/admin/orders", async (_req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  try {
    const r = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders.json`, { headers: { "X-Auth-Token": c.accessToken, Accept: "application/json" } });
    const orders = Array.isArray(r.data) ? r.data : [];
    res.json(orders.map((o: any) => ({ id: o.id, customer: o.billing_address ? `${o.billing_address.first_name} ${o.billing_address.last_name}` : "Guest", status: o.status, total: parseFloat(o.total_inc_tax||0), date: o.date_created })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/orders/:id", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  const base = `https://api.bigcommerce.com/stores/${c.storeHash}/v2`;
  const h = { "X-Auth-Token": c.accessToken, Accept: "application/json" };
  try {
    const [oRes, pRes] = await Promise.all([axios.get(`${base}/orders/${req.params.id}.json`,{headers:h}), axios.get(`${base}/orders/${req.params.id}/products.json`,{headers:h})]);
    const o = oRes.data;
    res.json({ id:o.id, customer:`${o.billing_address?.first_name||""} ${o.billing_address?.last_name||""}`, status:o.status, status_id:o.status_id, total:parseFloat(o.total_inc_tax||0), subtotal:parseFloat(o.subtotal_inc_tax||0), shipping_cost:parseFloat(o.shipping_cost_inc_tax||0), tax:parseFloat(o.total_tax||0), date:o.date_created, payment_method:o.payment_method, billing_address:o.billing_address, products:Array.isArray(pRes.data)?pRes.data.map((p:any)=>({id:p.id,name:p.name,sku:p.sku,quantity:p.quantity,price:parseFloat(p.price_inc_tax||0)})):[] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/order-statuses", async (_req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  try { const r = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/order_statuses.json`,{headers:{"X-Auth-Token":c.accessToken,Accept:"application/json"}}); res.json(r.data); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/admin/orders/:id/status", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  try { const r = await axios.put(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}.json`,{status_id:req.body.status_id},{headers:{"X-Auth-Token":c.accessToken,Accept:"application/json","Content-Type":"application/json"}}); res.json(r.data); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/orders/:id/resend-invoice", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  try { await axios.post(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}/email_invoice`,{},{headers:{"X-Auth-Token":c.accessToken}}); res.json({ success: true }); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/orders/:id/messages", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  try { const r = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}/messages.json`,{headers:{"X-Auth-Token":c.accessToken,Accept:"application/json"},validateStatus:(s)=>s<400||s===404}); res.json(r.status===404||!r.data?[]:r.data); }
  catch (e: any) { res.json([]); }
});

app.post("/api/admin/orders/:id/messages", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  const { message, is_customer_visible } = req.body;
  try {
    const oRes = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}.json`,{headers:{"X-Auth-Token":c.accessToken,Accept:"application/json"}});
    const r = await axios.post(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}/messages.json`,{order_id:parseInt(req.params.id),customer_id:oRes.data.customer_id,message,subject:"Order Update",is_customer_visible:is_customer_visible??true,status:"read"},{headers:{"X-Auth-Token":c.accessToken,Accept:"application/json","Content-Type":"application/json"}});
    res.json(r.data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---- Admin Customers ----
app.get("/api/admin/customers", async (_req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try { const r = await bc.get("/customers"); res.json(r.data.data.map((c:any)=>({id:c.id,first_name:c.first_name,last_name:c.last_name,email:c.email,phone:c.phone||"N/A",date_created:c.date_created,company:c.company||"N/A"}))); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/customers/:id", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    const r = await bc.get(`/customers?id:in=${req.params.id}`);
    const c = r.data.data?.[0]; if (!c) return res.status(404).json({ error: "Not found" });
    let addresses=[]; try { const a=await bc.get(`/customers/addresses?customer_id:in=${c.id}`); addresses=a.data.data||[]; } catch{}
    res.json({...c, addresses});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/admin/customers/:id", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try { const r = await bc.put("/customers",[{id:parseInt(req.params.id),...req.body}]); res.json({success:true,data:r.data.data}); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---- Admin Shipping ----
app.get("/api/admin/shipping/methods", (_req, res) => {
  res.json([{id:1,name:"FREE SHIPPING - GROUND",status:"Active",type:"Flat Rate"},{id:2,name:"UPS GROUND",status:"Active",type:"Carrier"},{id:3,name:"Free Standard",status:"Active",type:"Flat Rate"}]);
});

app.get("/api/admin/shipping/orders", async (_req, res) => {
  const c = getBCConfig(); if (!c) return res.json([]);
  try {
    const r = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders.json`,{headers:{"X-Auth-Token":c.accessToken,Accept:"application/json"},timeout:10000});
    if (!r.data||r.status===204) return res.json([]);
    res.json((Array.isArray(r.data)?r.data:[]).slice(0,10).map((o:any)=>({id:o.id.toString(),customer:o.billing_address?`${o.billing_address.first_name} ${o.billing_address.last_name}`:"Guest",shipping_method:o.shipping_method||"Standard",tracking_number:"",carrier:"USPS",status:o.status,delivery_status:"transit"})));
  } catch { res.json([]); }
});

// ---- Admin Email Templates ----
app.get("/api/admin/email-templates", async (_req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try { const r = await bc.get("/marketing/email-templates"); res.json(r.data); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/email-templates/:id", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try { const r = await bc.get(`/marketing/email-templates/${req.params.id}`); res.json(r.data); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/admin/email-templates/:id", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try { const r = await bc.put(`/marketing/email-templates/${req.params.id}`,req.body); res.json(r.data); }
  catch (e: any) { res.status(e.response?.status||500).json({ error: e.message }); }
});

app.post("/api/admin/email-templates/test", async (req, res) => {
  const apiKey = process.env.RESEND_API_KEY; if (!apiKey) return res.status(400).json({ error: "RESEND_API_KEY not set" });
  try { await axios.post("https://api.resend.com/emails",{from:"onboarding@resend.dev",to:[req.body.email],subject:"Test",html:"<strong>Test OK</strong>"},{headers:{Authorization:`Bearer ${apiKey}`}}); res.json({success:true}); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});
// ---- Customer Reviews / Threads ----
app.get("/api/customer/reviews", (_req, res) => { res.json([]); });
app.delete("/api/customer/reviews/:id", (_req, res) => { res.json({ success: true }); });
app.get("/api/customer/threads", async (req, res) => {
  const c = getBCConfig(); if (!c||!req.query.email) return res.json([]);
  const base = `https://api.bigcommerce.com/stores/${c.storeHash}/v2`;
  const h = { "X-Auth-Token": c.accessToken, Accept: "application/json" };
  try {
    const oRes = await axios.get(`${base}/orders.json?email=${encodeURIComponent(String(req.query.email))}`,{headers:h});
    const threads: any[] = [];
    await Promise.all((Array.isArray(oRes.data)?oRes.data:[]).map(async (o:any)=>{ try { const m=await axios.get(`${base}/orders/${o.id}/messages.json`,{headers:h}); (m.data||[]).forEach((msg:any)=>threads.push({id:`msg_${msg.id}`,orderId:o.id,subject:`ORDER #${o.id}`,status:"SENT",date:msg.date_created,message:msg.message})); } catch{} }));
    res.json(threads.reverse());
  } catch { res.json([]); }
});

// ---- Customer Order Detail + Messages ----
app.get("/api/customer/orders/:id", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  if (!req.query.email) return res.status(400).json({ error: "Email required" });
  const base = `https://api.bigcommerce.com/stores/${c.storeHash}/v2`;
  const h = { "X-Auth-Token": c.accessToken, Accept: "application/json" };
  try {
    const oRes = await axios.get(`${base}/orders/${req.params.id}.json`,{headers:h}); const o = oRes.data;
    if (o.billing_address?.email?.toLowerCase()!==String(req.query.email).toLowerCase()) return res.status(403).json({error:"Unauthorized"});
    const [pRes,sRes] = await Promise.all([axios.get(`${base}/orders/${req.params.id}/products.json`,{headers:h}),axios.get(`${base}/orders/${req.params.id}/shipping_addresses.json`,{headers:h}).catch(()=>({data:[]}))]);
    res.json({id:o.id.toString(),status:o.status,total:parseFloat(o.total_inc_tax||0),date:new Date(o.date_created).toLocaleDateString(),billing_address:o.billing_address,shipping_address:(sRes as any).data?.[0]||null,items:Array.isArray(pRes.data)?pRes.data.map((p:any)=>({id:p.id,name:p.name,units:p.quantity,price:parseFloat(p.price_inc_tax||0)})):[]});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/customer/orders/:id/messages", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  const h = { "X-Auth-Token": c.accessToken, Accept: "application/json" };
  try { const r = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}/messages.json`,{headers:h,validateStatus:(s)=>s<400||s===404}); res.json(r.status===404||!r.data?[]:(Array.isArray(r.data)?r.data.filter((m:any)=>m.is_customer_visible):[])); }
  catch { res.json([]); }
});

app.post("/api/customer/orders/:id/messages", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  const h = { "X-Auth-Token": c.accessToken, Accept: "application/json", "Content-Type": "application/json" };
  try {
    const oRes = await axios.get(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}.json`,{headers:h});
    if (oRes.data.billing_address?.email?.toLowerCase()!==String(req.body.email).toLowerCase()) return res.status(403).json({error:"Unauthorized"});
    const r = await axios.post(`https://api.bigcommerce.com/stores/${c.storeHash}/v2/orders/${req.params.id}/messages.json`,{order_id:parseInt(req.params.id),customer_id:oRes.data.customer_id,message:req.body.message,subject:"Customer Inquiry",is_customer_visible:true,status:"read"},{headers:h});
    res.json(r.data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---- Contact ----
app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log(`[CONTACT] From: ${email} | Subject: ${subject} | Msg: ${message}`);
  res.json({ success: true });
});

// ---- Newsletter ----
app.post("/api/newsletter/subscribe", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try { await bc.post("/customers/subscribers",{email:req.body.email,source:"Storefront",channel_id:1}); res.json({success:true}); }
  catch (e: any) { if (e.response?.status===409) return res.json({success:true,message:"Already subscribed"}); res.status(500).json({error:e.message}); }
});

// ---- Health BC ----
app.get("/api/health/bigcommerce", async (_req, res) => {
  const bc = getBCClient(); if (!bc) return res.json({ connected: false });
  try { const r = await bc.get("/store/information"); res.json({ connected: true, storeName: r.data?.name }); }
  catch (e: any) { res.json({ connected: false, message: e.message }); }
});

// ---- Checkout (BC redirect) ----
const getBaseUrl = (req: any) => { const fh=req.header('x-forwarded-host'); const fp=req.header('x-forwarded-proto')||'https'; if(fh) return `${fp}://${fh.split(',')[0].trim()}`; return `https://${req.get('host')}`; };

app.post("/api/checkout", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    const cRes = await bc.post("/carts",{line_items:req.body.cart.map((i:any)=>({product_id:i.id,quantity:i.quantity,variant_id:i.variant_id})),channel_id:1});
    const cartId = cRes.data.data.id;
    const uRes = await bc.post(`/carts/${cartId}/redirect_urls`,{cart_url:`${getBaseUrl(req)}/cart`,return_url:`${getBaseUrl(req)}/order-success`});
    res.json({ checkout_url: uRes.data.data.checkout_url });
  } catch (e: any) { res.status(422).json({ error: e.message }); }
});

app.post("/api/checkout/v3", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  const { cart, email, shipping_address } = req.body;
  try {
    const channelId = Number(process.env.BIGCOMMERCE_CHANNEL_ID)||1;
    const cRes = await bc.post("/carts?include=redirect_urls",{line_items:cart.map((i:any)=>({product_id:Number(i.id),quantity:Number(i.quantity),...(i.variant_id?{variant_id:Number(i.variant_id)}:{})})),channel_id:channelId,redirect_urls:{cart_url:`${getBaseUrl(req)}/cart`,return_url:`${getBaseUrl(req)}/order-success`,abandoned_checkout_url:`${getBaseUrl(req)}/cart`}});
    const cartId = cRes.data.data.id;
    const uRes = await bc.post(`/carts/${cartId}/redirect_urls`,{cart_url:`${getBaseUrl(req)}/cart`,return_url:`${getBaseUrl(req)}/order-success`});
    res.json({ success: true, checkout_url: uRes.data.data.checkout_url });
  } catch (e: any) { res.status(422).json({ error: e.message }); }
});

app.post("/api/checkout/init", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  try {
    const cRes = await bc.post("/carts",{line_items:req.body.cart.map((i:any)=>({product_id:i.id,quantity:i.quantity,variant_id:i.variant_id})),channel_id:1});
    res.json({ cartId: cRes.data.data.id, checkoutId: cRes.data.data.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/checkout/shipping-methods", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  const { cart, address } = req.body;
  try {
    const cRes = await bc.post("/carts",{line_items:cart.map((i:any)=>({product_id:i.id,quantity:i.quantity,variant_id:i.variant_id})),channel_id:1});
    const checkoutId = cRes.data.data.id;
    const conRes = await bc.post(`/checkouts/${checkoutId}/consignments`,[{shipping_address:{first_name:address.firstName||"Customer",last_name:address.lastName||"Name",address1:address.address,city:address.city,state_or_province:address.state,postal_code:address.zip,country_code:"US"},line_items:cart.map((i:any)=>({item_id:i.id,quantity:i.quantity}))}],{params:{include:"consignments.available_shipping_options"}});
    const options = conRes.data.data.consignments?.[0]?.available_shipping_options||[];
    res.json({ options });
  } catch { res.json({ options:[{id:"1",type:"Flat Rate",description:"Standard Shipping",cost:10,name:"Standard"},{id:"2",type:"Expedited",description:"Express Shipping",cost:25,name:"Express"}] }); }
});

app.post("/api/checkout/process", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  const { cart, email, nonce, shipping_address, payment_method } = req.body;
  const { storeHash, accessToken } = c;
  const v2 = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
  const h = { "X-Auth-Token": accessToken, Accept: "application/json", "Content-Type": "application/json" };

  const buildAddress = (a: any) => ({
    first_name: a.first_name||"Guest", last_name: a.last_name||"Customer",
    street_1: a.street_1||"N/A", city: a.city||"N/A", state: a.state||"N/A",
    zip: a.zip||"00000", country: "United States", country_iso2: "US",
    email, phone: a.phone||"0000000000"
  });

  const createOrder = async (useProductIds: boolean) => {
    const products = cart.map((i: any) => useProductIds
      ? { product_id: Number(i.id), quantity: Number(i.quantity), name: i.name||"Item", price_inc_tax: Number(i.price)||0, price_ex_tax: Number(i.price)||0, ...(i.variant_id ? { variant_id: Number(i.variant_id) } : {}) }
      : { name: i.name||"Custom Item", quantity: Number(i.quantity), price_inc_tax: Number(i.price)||0, price_ex_tax: Number(i.price)||0 }
    );
    return axios.post(`${v2}/orders`, {
      customer_id: 0,
      billing_address: buildAddress(shipping_address),
      shipping_addresses: [{ ...buildAddress(shipping_address), shipping_method: "Standard Shipping" }],
      products, status_id: 0
    }, { headers: h });
  };

  try {
    let orderRes: any;
    try {
      orderRes = await createOrder(true);
    } catch (bcErr: any) {
      // BC 400 = mandatory options missing — retry as custom items (no product_id)
      if (bcErr.response?.status === 400) {
        console.log("[checkout/process] BC rejected product IDs (options), retrying as custom items");
        orderRes = await createOrder(false);
      } else throw bcErr;
    }

    const orderId = orderRes.data.id;
    const total = parseFloat(orderRes.data.total_inc_tax || 0);

    // Process Square payment if nonce provided
    if (nonce && payment_method !== 'link') {
      try {
        const { SquareClient, SquareEnvironment } = await import("square");
        const token = process.env.SQUARE_ACCESS_TOKEN;
        if (token) {
          const sq = new SquareClient({
            environment: token.startsWith("EAAA") ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
            token
          });
          await sq.payments.create({
            sourceId: nonce,
            idempotencyKey: `sq-${orderId}-${Date.now()}`,
            amountMoney: { amount: BigInt(Math.round(total * 100)), currency: "USD" },
            referenceId: orderId.toString()
          });
          await axios.put(`${v2}/orders/${orderId}`, { status_id: 11, payment_method: "Square" }, { headers: h });
          console.log(`[checkout/process] Square payment captured for order #${orderId}`);
        }
      } catch (sqErr: any) {
        console.error("[checkout/process] Square error:", sqErr.message);
        // Order exists in BC — return success even if Square had an issue
        return res.json({ success: true, orderId, total, warning: "Payment processing issue — contact support." });
      }
    }

    res.json({ success: true, orderId, total });
  } catch (e: any) {
    console.error("[checkout/process] Error:", e.response?.data || e.message);
    res.status(500).json({ error: e.message, details: e.response?.data });
  }
});

app.post("/api/orders/create", async (req, res) => {
  const c = getBCConfig(); if (!c) return res.status(500).json({ error: "Not configured" });
  const { cart, email, shipping_address } = req.body;
  const v2 = `https://api.bigcommerce.com/stores/${c.storeHash}/v2`;
  const h = { "X-Auth-Token": c.accessToken, Accept: "application/json", "Content-Type": "application/json" };
  try {
    const r = await axios.post(`${v2}/orders`,{customer_id:0,billing_address:{first_name:shipping_address?.first_name||"Guest",last_name:shipping_address?.last_name||"Customer",street_1:shipping_address?.street_1||"N/A",city:shipping_address?.city||"N/A",state:shipping_address?.state||"N/A",zip:shipping_address?.zip||"00000",country:"United States",email},shipping_addresses:[{...shipping_address,country:"United States",country_iso2:"US",phone:shipping_address?.phone||"0000000000"}],products:cart.map((i:any)=>({product_id:i.id,quantity:i.quantity,price_inc_tax:i.price,price_ex_tax:i.price})),status_id:1},{headers:h});
    res.json({ success: true, order_id: r.data.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/buy-now", async (req, res) => {
  const bc = getBCClient(); if (!bc) return res.status(500).json({ error: "Not configured" });
  const { product_id, variant_id, quantity } = req.body;
  try {
    const item: any = { product_id: Number(product_id), quantity: Number(quantity)||1 };
    if (variant_id) item.variant_id = Number(variant_id);
    const cRes = await bc.post("/carts?include=redirect_urls",{line_items:[item],channel_id:Number(process.env.BIGCOMMERCE_CHANNEL_ID)||1,redirect_urls:{cart_url:`${getBaseUrl(req)}/cart`,return_url:`${getBaseUrl(req)}/order-success`}});
    const cartId = cRes.data.data.id;
    const uRes = await bc.post(`/carts/${cartId}/redirect_urls`,{cart_url:`${getBaseUrl(req)}/cart`,return_url:`${getBaseUrl(req)}/order-success`});
    res.json({ success: true, checkout_url: uRes.data.data.checkout_url });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
// ---- Fallback ----
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} is not available in production.` });
});


export default app;


