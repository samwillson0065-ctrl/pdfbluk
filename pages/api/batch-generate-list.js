import { generateArticles } from "./utils";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { instruction, count = 20 } = req.body || {};
  const n = Math.min(Math.max(parseInt(count || 20, 10), 1), 20);
  if (!instruction || typeof instruction !== "string" || instruction.trim().length < 5) {
    return res.status(400).json({ error: "Please provide a longer master instruction." });
  }
  try {
    const articles = await generateArticles(instruction, n);
    res.status(200).json({ files: articles.map(a => ({ title: a.title, filename: a.filename })) });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ error: "Error generating list" });
  }
}