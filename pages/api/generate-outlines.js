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
  const { instruction, count = 5 } = req.body || {};
  const n = Math.min(Math.max(parseInt(count || 5, 10), 1), 20);
  if (!instruction || instruction.trim().length < 5) {
    return res.status(400).json({ error: "Please provide a valid instruction." });
  }

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
    let arr = [];
    try {
      arr = JSON.parse(text);
    } catch {
      arr = [];
    }

    const used = new Set();
    arr = arr.map((a, idx) => {
      let fn = sanitizeFileName(a.filename || a.title || "article_" + (idx+1));
      let suffix = 1;
      while (used.has(fn)) fn = fn + "_" + (++suffix);
      used.add(fn);
      return { title: a.title || "Article " + (idx+1), filename: fn + ".pdf", outline: a.outline || "" };
    });

    res.status(200).json({ articles: arr });
  } catch (err) {
    console.error("Outline error:", err);
    res.status(500).json({ error: "Error generating outlines" });
  }
}