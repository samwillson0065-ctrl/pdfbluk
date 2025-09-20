import OpenAI from "openai";
import PDFDocument from "pdfkit";
import archiver from "archiver";

export const config = { api: { responseLimit: false } };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

async function expandIfNeeded(title, outline, wordLength) {
  if (outline && !outline.startsWith("Custom title")) {
    const prompt = `Expand the following outline into a detailed article of about ${wordLength} words.
Include headings, FAQs at the end, and professional blog tone.
TITLE: ${title}
OUTLINE: ${outline}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional content writer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 1500,
    });
    return completion.choices?.[0]?.message?.content || "";
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { outlines = [], modifier = "", wordLength = 800 } = req.body || {};
  if (!Array.isArray(outlines) || outlines.length === 0) {
    return res.status(400).json({ error: "No outlines provided." });
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
    for (const art of outlines) {
      const fullTitle = modifier + art.title;
      let content = art.content || "";
      if (!content || content === art.outline) {
        content = await expandIfNeeded(fullTitle, art.outline, wordLength);
      }
      const pdfBuf = await pdfBufferFrom(fullTitle, content);
      archive.append(pdfBuf, { name: art.filename });
    }
    await archive.finalize();
  } catch (err) {
    console.error("ZIP generation error:", err);
    try { archive.abort(); } catch {}
  }
}