import { Supadata } from "@supadata/js";

// Espera polling hasta que el job termine (máx. 60s)
async function waitForJob(supadata, jobId) {
  const MAX_ATTEMPTS = 20;
  const DELAY_MS = 3000;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const job = await supadata.transcript.getJobStatus(jobId);

    if (job.status === "completed") {
      return {
        content: job.content,
        lang: job.lang,
      };
    }

    if (job.status === "failed") {
      throw new Error(job.error || "Transcription job failed");
    }

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  throw new Error("Transcription timed out. The video may be too long.");
}

function normalizeTranscript(transcript) {
  if (typeof transcript === "string") return transcript;

  if (Array.isArray(transcript)) {
    return transcript
      .map((chunk) => {
        if (typeof chunk === "string") return chunk;
        return chunk.text || "";
      })
      .filter(Boolean)
      .join(" ");
  }

  if (transcript?.content) return normalizeTranscript(transcript.content);

  return JSON.stringify(transcript, null, 2);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, targetLanguage } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const supadata = new Supadata({ apiKey: process.env.API_KEY });

    const options = {
      url,
      text: true,
      ...(targetLanguage ? { lang: targetLanguage } : {}),
    };

    const result = await supadata.transcript(options);

    let transcriptPayload;
    let detectedLanguage;

    if ("jobId" in result) {
      const jobResult = await waitForJob(supadata, result.jobId);
      transcriptPayload = jobResult.content;
      detectedLanguage = jobResult.lang;
    } else {
      transcriptPayload = result.content ?? result;
      detectedLanguage = result.lang;
    }

    const transcript = normalizeTranscript(transcriptPayload);

    return res.status(200).json({
      transcript,
      language: detectedLanguage || targetLanguage || "original",
      mode: targetLanguage ? "selected-language" : "original",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return res.status(500).json({
      error: error.message || "Transcription failed",
    });
  }
}
