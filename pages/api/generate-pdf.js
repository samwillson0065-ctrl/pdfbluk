import PDFDocument from "pdfkit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { title, content, pdfName } = req.body;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${pdfName || "document"}.pdf"`
  );

  const doc = new PDFDocument();
  doc.pipe(res);

  doc.fontSize(20).text(title, { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(content);

  doc.end();
}