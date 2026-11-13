// Vercel serverless function: GET /api/export?key=YOUR_EXPORT_KEY  ->  downloads the waitlist as a CSV file
const crypto = require("crypto");
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Quote CSV cells, and defuse spreadsheet formulas (cells starting with = + - @)
const cell = (v) => {
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const secret = process.env.EXPORT_KEY;
  if (!secret) return res.status(503).send("Export is not set up. Add an EXPORT_KEY environment variable in Vercel, then redeploy.");
  const a = Buffer.from(String((req.query && req.query.key) || "")), b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).send("Unauthorized");
  if (!URL_ || !TOKEN) return res.status(503).send("Storage is not connected. Add Upstash Redis under the Storage tab in Vercel, then redeploy.");
  try {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(["HGETALL", "feyifoods:waitlist"]),
    });
    if (!r.ok) throw new Error("storage " + r.status);
    const { result } = await r.json();
    const vals = Array.isArray(result) ? result.filter((_, i) => i % 2 === 1) : Object.values(result || {});
    const rows = vals.map((v) => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean)
      .sort((x, y) => String(x.joinedAt).localeCompare(String(y.joinedAt)));
    const csv = ["Name,Email,Phone,City,Products,Joined (UTC)",
      ...rows.map((e) => [e.name, e.email, e.phone, e.city, (e.interests || []).join("; "), e.joinedAt].map(cell).join(","))].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="feyifoods-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send("\ufeff" + csv + "\r\n");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Could not read the waitlist. Please try again.");
  }
};
