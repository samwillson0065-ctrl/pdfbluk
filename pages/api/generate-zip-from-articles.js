import PDFDocument from "pdfkit";
import archiver from "archiver";

export const config = { api: { responseLimit: false } };

function pdfBufferFrom(title, content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: true, margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(content || "", { align: "left" });

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
