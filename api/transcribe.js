import { Supadata } from "@supadata/js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const supadata = new Supadata({ apiKey: process.env.API_KEY });

    const transcript = await supadata.youtube.transcript({
      url,
      text: true,
    });

    return res.status(200).json({ transcript });
  } catch (error) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: error.message || "Transcription failed" });
  }
}