import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("authenticated") !== "true") {
      router.push("/login");
    }
  }, [router]);

  const [instruction, setInstruction] = useState("");
  const [titlesInput, setTitlesInput] = useState("");
  const [modifier, setModifier] = useState("");
  const [wordLength, setWordLength] = useState(800);
  const [outlines, setOutlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const titles = titlesInput.split("\n").map(t => t.trim()).filter(Boolean);
      const body = titles.length > 0
        ? { titles }
        : { instruction, count: 5 };

      const res = await fetch("/api/generate-outlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutlines(data.articles || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArticles = async () => {
    setArticles([]);
    setProgress(0);
    for (let i = 0; i < outlines.length; i++) {
      const res = await fetch("/api/expand-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline: outlines[i], modifier, wordLength }),
      });
      const data = await res.json();
      setArticles(prev => [...prev, data]);
      setProgress(Math.round(((i+1) / outlines.length) * 100));
    }
  };

  const handleDownload = async () => {
    const res = await fetch("/api/generate-zip-from-articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "articles_bundle.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateArticle = (idx, field, value) => {
    const newArticles = [...articles];
    newArticles[idx][field] = value;
    setArticles(newArticles);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Two-Step Article Generator → PDFs</h1>

      <textarea
        className="w-full border rounded p-2 mb-2"
        placeholder="Master Instruction (ignored if custom titles are given)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <textarea
        className="w-full border rounded p-2 mb-2"
        placeholder="Optional: Custom article titles, one per line"
        value={titlesInput}
        onChange={(e) => setTitlesInput(e.target.value)}
      />

      <input
        className="w-full border rounded p-2 mb-2"
        placeholder="Optional Modifier (e.g., '2025 Update - ')"
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
      />

      <input
        type="number"
        className="w-full border rounded p-2 mb-4"
        placeholder="Word length (e.g., 800)"
        value={wordLength}
        onChange={(e) => setWordLength(e.target.value)}
      />

      <button onClick={handlePreview} className="bg-gray-700 text-white px-4 py-2 rounded mr-2">
        Preview Outlines
      </button>

      {outlines.length > 0 && (
        <button onClick={handleGenerateArticles} className="bg-blue-600 text-white px-4 py-2 rounded">
          Generate Articles
        </button>
      )}

      {progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
          <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {articles.length > 0 && (
        <div className="mt-6">
          {articles.map((a, i) => (
            <div key={i} className="bg-white shadow-md rounded-lg p-4 mb-4">
              <input
                className="w-full border p-2 rounded mb-2"
                value={a.title}
                onChange={(e) => updateArticle(i, "title", e.target.value)}
              />
              <input
                className="w-full border p-2 rounded mb-2"
                value={a.filename}
                onChange={(e) => updateArticle(i, "filename", e.target.value)}
              />
              <textarea
                className="w-full border p-2 rounded h-40"
                value={a.content}
                onChange={(e) => updateArticle(i, "content", e.target.value)}
              />
            </div>
          ))}
          <button onClick={handleDownload} className="bg-green-600 text-white px-4 py-2 rounded">
            Download ZIP of PDFs
          </button>
        </div>
      )}
    </div>
  );
}