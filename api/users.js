export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return res.status(500).json({ error: "Supabase service role key not configured." });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || "Failed to fetch users." });
    }

    const users = (data.users || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.user_metadata?.name || "",
      createdAt: u.created_at,
    }));

    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
