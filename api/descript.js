export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.DESCRIPT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "DESCRIPT_API_KEY not configured in Vercel environment variables." });
  }

  const { projectId, prompt } = req.body;
  if (!projectId || !prompt) {
    return res.status(400).json({ error: "Missing projectId or prompt" });
  }

  try {
    const response = await fetch(`https://api.descript.com/v2/projects/${projectId}/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || "Descript API error", details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Failed to reach Descript API: " + err.message });
  }
}
