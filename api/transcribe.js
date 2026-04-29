import { Supadata } from "@supadata/js";

// Espera polling hasta que el job termine (máx. 60s)
async function waitForJob(supadata, jobId) {
  const MAX_ATTEMPTS = 20;
  const DELAY_MS = 3000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const job = await supadata.transcript.getJobStatus(jobId);
    if (job.status === "completed") return job.content;
    if (job.status === "failed") throw new Error(job.error || "Transcription job failed");
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  throw new Error("Transcription timed out. The video may be too long.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const supadata = new Supadata({ apiKey: process.env.API_KEY });

    // ✅ supadata.transcript soporta YouTube, TikTok, Instagram, X y Facebook
    const result = await supadata.transcript({ url, text: true });

    let text;
    if ("jobId" in result) {
      // Plataformas que procesan de forma asíncrona (TikTok, Instagram, X...)
      text = await waitForJob(supadata, result.jobId);
    } else {
      text = result.content ?? result;
    }

    return res.status(200).json({ transcript: text });
  } catch (error) {
    console.error("Transcription error:", error);
    return res.status(500).json({ error: error.message || "Transcription failed" });
  }
}