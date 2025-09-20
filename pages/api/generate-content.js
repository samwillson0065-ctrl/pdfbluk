import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { topic, keywords, instructions } = req.body;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful SEO content generator." },
        { role: "user", content: `
          Write about: ${topic}.
          Include these keywords: ${keywords}.
          Follow these extra instructions: ${instructions}.
        ` },
      ],
      max_tokens: 600,
    });

    const text = completion.choices[0].message.content;
    res.status(200).json({ content: text });
  } catch (err) {
    console.error("OpenAI API error:", err);
    return res.status(500).json({ error: err.message || "Error generating content" });
  }
}