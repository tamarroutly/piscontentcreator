export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL } = process.env;
  if (!SUPABASE_SERVICE_ROLE_KEY || !VITE_SUPABASE_URL) {
    return res.status(500).json({ error: "Server not configured." });
  }

  const { userId, orgName, userName, timezone } = req.body || {};
  if (!userId || !orgName || !userName) {
    return res.status(400).json({ error: "userId, orgName, and userName are required." });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);

    const { data: existing } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    const finalSlug = existing
      ? `${slug}-${Math.random().toString(36).substring(2, 6)}`
      : slug;

    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({ name: orgName, slug: finalSlug, owner_id: userId })
      .select()
      .single();
    if (orgErr) throw orgErr;

    const { error: profErr } = await admin.from("profiles").upsert({
      id: userId,
      name: userName,
      timezone: timezone || "America/Vancouver",
      role: "admin",
      org_id: org.id,
    });
    if (profErr) throw profErr;

    return res.status(200).json({ success: true, orgId: org.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
