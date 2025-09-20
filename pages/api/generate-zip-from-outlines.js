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

async function expandOutline(title, outline, instruction) {
  const prompt = `Expand the following outline into a detailed article of 700-800 words.
It must include:
- Clear headings/subheadings
- Smooth flow based on outline points
- Professional blog tone
- Include FAQs at the end
- Integrate relevant keywords naturally
Return only the article text.

TITLE: ${title}
OUTLINE: ${outline}
MASTER INSTRUCTION: ${instruction}`;

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { outlines = [] } = req.body || {};
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
      const content = await expandOutline(art.title, art.outline, "Master instruction context");
      const pdfBuf = await pdfBufferFrom(art.title, content);
      archive.append(pdfBuf, { name: art.filename });
    }
    await archive.finalize();
  } catch (err) {
    console.error("ZIP generation error:", err);
    try { archive.abort(); } catch {}
  }
}