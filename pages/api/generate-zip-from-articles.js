import PDFDocument from "pdfkit";
import archiver from "archiver";
import { marked } from "marked";

export const config = { api: { responseLimit: false } };

function renderMarkdownToPDF(doc, markdown) {
  const tokens = marked.lexer(markdown || "");
  tokens.forEach(token => {
    if (token.type === "heading") {
      const size = token.depth === 1 ? 20 : token.depth === 2 ? 16 : 14;
      doc.moveDown().fontSize(size).font("Helvetica-Bold").text(token.text, { align: "left" });
      doc.moveDown(0.2);
    } else if (token.type === "paragraph") {
      doc.moveDown(0.3).fontSize(12).font("Helvetica").text(token.text, { align: "left" });
    } else if (token.type === "list") {
      token.items.forEach(item => {
        doc.fontSize(12).text("• " + item.text, { indent: 20 });
      });
      doc.moveDown(0.3);
    } else if (token.type === "text") {
      doc.fontSize(12).font("Helvetica").text(token.text, { align: "left" });
    }
  });
}

function pdfBufferFrom(title, content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: true, margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
    doc.moveDown();

    renderMarkdownToPDF(doc, content);

    doc.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { articles = [] } = req.body || {};

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="articles_bundle.zip"');

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error("Archiver error:", err);
    try { res.status(500).end("Archiver error"); } catch {}
  });
  archive.pipe(res);

  try {
    for (const art of articles) {
      const pdfBuf = await pdfBufferFrom(art.title, art.content);
      archive.append(pdfBuf, { name: art.filename });
    }
    await archive.finalize();
  } catch (err) {
    console.error("ZIP error:", err);
    try { archive.abort(); } catch {}
  }
}
