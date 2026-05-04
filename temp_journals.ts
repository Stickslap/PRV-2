// BigCommerce Journal (Blog Posts) API Routes
app.get("/api/journals", async (req, res) => {
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });

  try {
    const response = await axios.get(`https://api.bigcommerce.com/stores/${config.storeHash}/v2/blog/posts`, {
        headers: { "X-Auth-Token": config.accessToken, "Accept": "application/json" }
    });
    // Ensure we handle Array and Format to JournalPost 
    const data = Array.isArray(response.data) ? response.data : [];
    const formatted = data.map((b: any) => ({
      id: b.id.toString(),
      title: b.title,
      imageUrl: b.thumbnail_path || "",
      content: b.body,
      createdAt: b.published_date?.date || new Date().toISOString()
    }));
    res.json(formatted);
  } catch (error: any) {
    if (error.response?.status === 404) {
      // no blog posts / blog disabled
      return res.json([]);
    }
    console.error("BC Journals GET Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch journals" });
  }
});

app.post("/api/admin/journals", async (req, res) => {
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
  const { title, imageUrl, content } = req.body;

  try {
    const response = await axios.post(`https://api.bigcommerce.com/stores/${config.storeHash}/v2/blog/posts`, {
      title,
      body: content,
      thumbnail_path: imageUrl,
      is_published: true
    }, {
      headers: { "X-Auth-Token": config.accessToken, "Accept": "application/json" }
    });
    res.json({ success: true, post: response.data });
  } catch (error: any) {
    console.error("BC Journals POST Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create journal" });
  }
});

app.put("/api/admin/journals/:id", async (req, res) => {
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
  const id = req.params.id;
  const { title, imageUrl, content } = req.body;

  try {
    const response = await axios.put(`https://api.bigcommerce.com/stores/${config.storeHash}/v2/blog/posts/${id}`, {
      title,
      body: content,
      thumbnail_path: imageUrl
    }, {
      headers: { "X-Auth-Token": config.accessToken, "Accept": "application/json" }
    });
    res.json({ success: true, post: response.data });
  } catch (error: any) {
    console.error("BC Journals PUT Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to update journal" });
  }
});

app.delete("/api/admin/journals/:id", async (req, res) => {
  const config = getBCConfig();
  if (!config) return res.status(500).json({ error: "BigCommerce is not configured" });
  const id = req.params.id;

  try {
    await axios.delete(`https://api.bigcommerce.com/stores/${config.storeHash}/v2/blog/posts/${id}`, {
      headers: { "X-Auth-Token": config.accessToken, "Accept": "application/json" }
    });
    res.json({ success: true, message: "Journal deleted" });
  } catch (error: any) {
    console.error("BC Journals DELETE Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to delete journal" });
  }
});
