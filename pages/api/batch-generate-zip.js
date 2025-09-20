import OpenAI from "openai";
import PDFDocument from "pdfkit";
import archiver from "archiver";

export const config = {
  api: {
    responseLimit: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-_. ]+/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60) || "article";
}

async function generateArticle(instruction, idx) {
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

function pdfBufferFrom(title, content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: true, margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(content, { align: "left" });

    doc.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const { instruction, count = 20 } = req.body || {};
  const n = Math.min(Math.max(parseInt(count || 20, 10), 1), 20);
  if (!instruction || typeof instruction !== "string" || instruction.trim().length < 5) {
    return res.status(400).json({ error: "Please provide a longer master instruction." });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="articles_bundle.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error("Archiver error:", err);
    try { res.status(500).end("Archiver error"); } catch {}
  });
  archive.pipe(res);

  try {
    const usedNames = new Set();
    for (let i = 1; i <= n; i++) {
      const { title, fileBase, content } = await generateArticle(instruction, i);
      let name = fileBase;
      let suffix = 1;
      while (usedNames.has(name)) {
        name = fileBase + "_" + (++suffix);
      }
      usedNames.add(name);

      const pdfBuf = await pdfBufferFrom(title, content);
      archive.append(pdfBuf, { name: `${name}.pdf` });
    }
    await archive.finalize();
  } catch (err) {
    console.error("Batch generation error:", err);
    try { archive.abort(); } catch {}
  }
}