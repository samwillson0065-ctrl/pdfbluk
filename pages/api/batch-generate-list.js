import { generateArticle } from "./utils";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { instruction, count = 20 } = req.body || {};
  const n = Math.min(Math.max(parseInt(count || 20, 10), 1), 20);
  if (!instruction || typeof instruction !== "string" || instruction.trim().length < 5) {
    return res.status(400).json({ error: "Please provide a longer master instruction." });
  }

  try {
    const usedNames = new Set();
    const files = [];
    for (let i = 1; i <= n; i++) {
      const { title, fileBase } = await generateArticle(instruction, i);
      let name = fileBase;
      let suffix = 1;
      while (usedNames.has(name)) {
        name = fileBase + "_" + (++suffix);
      }
      usedNames.add(name);
      files.push(name + ".pdf");
    }
    res.status(200).json({ files });
  } catch (err) {
    console.error("List generation error:", err);
    res.status(500).json({ error: "Error generating list" });
  }
}