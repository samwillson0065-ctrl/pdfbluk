import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_. ]+/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60) || "article";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { instruction, titles = [], count = 5, wordLength = 800 } = req.body || {};

  let articles = [];
  if (titles.length > 0) {
    // use provided titles
    articles = titles.map((t, idx) => ({
      title: t,
      filename: sanitizeFileName(t || ("article_" + (idx+1))) + ".pdf",
      outline: "Custom title provided, outline not generated.",
    }));
  } else {
    if (!instruction || instruction.trim().length < 5) {
      return res.status(400).json({ error: "Please provide a valid instruction or custom titles." });
    }
    const n = Math.min(Math.max(parseInt(count || 5, 10), 1), 20);
    const prompt = `Generate ${n} unique article ideas with outlines as JSON.
Each item must have this structure:
{
  "title": "<title>",
  "filename": "<short_snake_case_filename>",
  "outline": "<short structured outline of 3-6 bullet points>"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You output only valid JSON, nothing else." },
          { role: "user", content: prompt + "\nMASTER INSTRUCTION: " + instruction },
        ],
        temperature: 0.8,
        max_tokens: 1200,
      });

      let text = completion.choices?.[0]?.message?.content || "[]";
      try {
        articles = JSON.parse(text);
      } catch {
        articles = [];
      }
      articles = articles.map((a, idx) => ({
        title: a.title || ("Article " + (idx+1)),
        filename: sanitizeFileName(a.filename || a.title || "article_" + (idx+1)) + ".pdf",
        outline: a.outline || "",
      }));
    } catch (err) {
      console.error("Outline error:", err);
      return res.status(500).json({ error: "Error generating outlines" });
    }
  }
  res.status(200).json({ articles });
}