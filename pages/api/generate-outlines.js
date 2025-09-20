    import OpenAI from "openai";
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    function sanitizeFileName(name) {
      return (name || "article")
        .toLowerCase()
        .replace(/[^a-z0-9\-_. ]+/g, "")
        .replace(/\s+/g, "_")
        .substring(0, 60) || "article";
    }

    function tryParseJson(text) {
      if (!text) return null;
      let t = text.trim();
      // strip code fences if present
      if (t.startsWith("```")) {
        t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      }
      try { return JSON.parse(t); } catch { return null; }
    }

    async function outlineForTitle(title, instruction) {
      const prompt = `Master instruction: "${instruction}".
      Title: "${title}"
      Write a concise 2-3 sentence outline that the article will follow.`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You write short, crisp outlines." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 200,
      });
      return completion.choices?.[0]?.message?.content?.trim() || "";
    }

    export default async function handler(req, res) {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const { instruction, titles = [] } = req.body || {};
      if (!instruction) return res.status(400).json({ error: "Instruction is required." });
      if (!Array.isArray(titles) || titles.length === 0) return res.status(400).json({ error: "At least one title is required." });

      // Try batch JSON first
      const prompt = `You are given a master instruction and some article titles.
Return a JSON array of objects with fields: "title", "filename", "outline".
- title: keep as-is or improve slightly
- filename: short snake_case, url-safe (no spaces), <=60 chars (without extension)
- outline: 2-3 sentences following the instruction

MASTER INSTRUCTION: ${instruction}
TITLES: ${JSON.stringify(titles)}

Return ONLY JSON array (no markdown).`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        });

        const parsed = tryParseJson(completion.choices?.[0]?.message?.content || "");
        if (Array.isArray(parsed) && parsed.length > 0) {
          const articles = parsed.map((a, i) => ({
            title: a.title || titles[i] || `Article ${i+1}`,
            filename: sanitizeFileName(a.filename || a.title || titles[i] || `article_${i+1}`) + ".pdf",
            outline: a.outline || "",
          }));
          return res.status(200).json({ articles });
        }
      } catch (e) {
        // fall through to per-title
        console.error("Batch JSON outline failed, falling back per-title:", e);
      }

      // Fallback: per-title outline calls (more reliable)
      try {
        const results = [];
        for (let i = 0; i < titles.length; i++) {
          const t = titles[i];
          const ol = await outlineForTitle(t, instruction);
          results.push({
            title: t,
            filename: sanitizeFileName(t) + ".pdf",
            outline: ol,
          });
        }
        return res.status(200).json({ articles: results });
      } catch (err) {
        console.error("Per-title outline error:", err);
        return res.status(500).json({ error: "Failed to generate outlines." });
      }
    }
