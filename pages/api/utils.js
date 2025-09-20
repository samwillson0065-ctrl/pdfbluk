import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_. ]+/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60) || "article";
}

export async function generateArticle(instruction, idx) {
  const prompt = `Create one unique article based on the master instruction below.
Return your answer EXACTLY in this format:
TITLE: <concise, human-friendly title>
FILENAME: <short_snake_case_filename_without_extension>
CONTENT:
<600-800 words of markdown content>

MASTER INSTRUCTION:
${instruction}

STRICT RULES:
- The TITLE must be unique for each article.
- The FILENAME must be URL-safe snake_case (no spaces, no quotes), <= 60 chars, unique.
- Do NOT include code fences or extra commentary.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a precise content generator that strictly follows output format." },
      { role: "user", content: prompt },
    ],
    temperature: 0.9,
    max_tokens: 1100,
  });

  const text = completion.choices?.[0]?.message?.content || "";
  const titleMatch = text.match(/TITLE:\s*(.*)/i);
  const fileMatch = text.match(/FILENAME:\s*(.*)/i);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]*)/i);

  const title = titleMatch ? titleMatch[1].trim() : `Article ${idx}`;
  const fileBase = sanitizeFileName(fileMatch ? fileMatch[1].trim() : title);
  const content = contentMatch ? contentMatch[1].trim() : text;

  return { title, fileBase, content };
}
