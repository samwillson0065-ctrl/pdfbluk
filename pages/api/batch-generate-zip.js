import { generateArticle } from "./utils";
import PDFDocument from "pdfkit";
import archiver from "archiver";

export const config = {
  api: {
    responseLimit: false,
  },
};

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
    console.error("Batch zip error:", err);
    try { archive.abort(); } catch {}
  }
}