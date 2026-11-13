// Vercel serverless function: POST /api/waitlist
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const ALLOWED = ["Jaggery Cubes", "Granola", "Seeds", "Healthy Snacks", "Drinks", "Everything"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b.company) return res.status(200).json({ ok: true }); // honeypot for bots

  const clean = (v, n) => String(v || "").trim().slice(0, n);
  const entry = {
    name: clean(b.name, 100),
    email: clean(b.email, 200).toLowerCase(),
    phone: clean(b.phone, 40),
    city: clean(b.city, 100),
    interests: (Array.isArray(b.interests) ? b.interests : []).filter((i) => ALLOWED.includes(i)),
    joinedAt: new Date().toISOString(),
  };
  if (!entry.name || !entry.city) return res.status(400).json({ error: "Please add your name and city." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) return res.status(400).json({ error: "Please enter a valid email address." });

  if (!URL_ || !TOKEN) { // no storage connected yet: still visible in Vercel > Logs
    console.log("WAITLIST SIGNUP (storage not connected):", JSON.stringify(entry));
    return res.status(200).json({ ok: true, stored: false });
  }
  try {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(["HSETNX", "feyifoods:waitlist", entry.email, JSON.stringify(entry)]),
    });
    if (!r.ok) throw new Error("storage " + r.status);
    const out = await r.json();
    return res.status(200).json({ ok: true, duplicate: out.result === 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "We couldn't save your spot. Please try again." });
  }
};
