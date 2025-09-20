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
  const { outline, modifier = "", wordLength = 800 } = req.body || {};
  const fullTitle = modifier + outline.title;
  const prompt = `Write a detailed article of about ${wordLength} words with headings, professional tone, and FAQs.
TITLE: ${fullTitle}
OUTLINE: ${outline.outline}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a skilled blog writer." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1600,
    temperature: 0.9,
  });
  const content = completion.choices[0].message.content || "";
  res.status(200).json({
    title: fullTitle,
    filename: sanitizeFileName(outline.filename.replace(".pdf","")) + ".pdf",
    content,
  });
}