export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL } = process.env;
  if (!SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL)
    return res.status(500).json({ error: "Server not configured." });

  const { code } = req.body || {};
  if (!code) return res.status(200).json({ valid: false, error: "No code provided." });

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data } = await admin
    .from("access_codes")
    .select("id, uses, max_uses, active")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  if (!data) return res.status(200).json({ valid: false, error: "Invalid access code." });
  if (!data.active) return res.status(200).json({ valid: false, error: "This code is no longer active." });
  if (data.uses >= data.max_uses) return res.status(200).json({ valid: false, error: "This code has already been fully used." });

  return res.status(200).json({ valid: true });
}
