export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "method_not_allowed"
      });
    }

    const { message, mode } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        ok: false,
        error: "empty_message",
        message: "Mesaj boş olamaz."
      });
    }

    const baseUrl = process.env.SIRIUS_BASE_URL;
    const apiKey = process.env.SIRIUS_API_KEY;

    if (!baseUrl || !apiKey) {
      return res.status(500).json({
        ok: false,
        error: "missing_sirius_env",
        message: "SIRIUS_BASE_URL veya SIRIUS_API_KEY eksik."
      });
    }

    let endpoint = "/api/lyra";

    if (mode === "research") endpoint = "/api/research";
    if (mode === "content") endpoint = "/api/content";
    if (mode === "local-search") endpoint = "/api/local-search";

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        message,
        query: message
      })
    });

    const data = await response.json();

    return res.status(response.status).json({
      ok: true,
      from: "sirius-cloud",
      mode: mode || "lyra",
      sirius: data,
      answer:
        data.answer ||
        data.script ||
        data.message ||
        "Sirius cevap döndürdü ama okunacak metin bulunamadı."
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "sirius_bridge_error",
      detail: error.message
    });
  }
}
