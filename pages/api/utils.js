import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_. ]+/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60) || "article";
}

export async function generateArticles(instruction, n) {
  const prompt = `Generate ${n} unique articles as JSON.
Each item must have this structure:
{
  "title": "<title>",
  "filename": "<short_snake_case_filename>",
  "content": "<600-800 words>"
}
RULES:
- Titles must be unique and human friendly.
- Filenames must be snake_case, url-safe, unique, <= 60 chars.
- Content should be ~600-800 words, markdown style allowed.
- Return ONLY valid JSON array, no commentary.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You output only valid JSON, nothing else." },
      { role: "user", content: prompt + "\nMASTER INSTRUCTION: " + instruction },
    ],
    temperature: 0.9,
    max_tokens: 4000,
    response_format: { type: "json_object" }
  });

  let text = completion.choices?.[0]?.message?.content || "[]";
  let arr = [];
  try {
    const parsed = JSON.parse(text);
    arr = Array.isArray(parsed) ? parsed : parsed.articles || [];
  } catch {
    arr = [];
  }

  // sanitize filenames
  const used = new Set();
  arr = arr.map((a, idx) => {
    let fn = sanitizeFileName(a.filename || a.title || "article_" + (idx+1));
    let suffix = 1;
    while (used.has(fn)) {
      fn = fn + "_" + (++suffix);
    }
    used.add(fn);
    return { title: a.title || "Article " + (idx+1), filename: fn + ".pdf", content: a.content || "" };
  });
  return arr;
}
