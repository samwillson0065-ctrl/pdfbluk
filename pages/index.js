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

  const handlePreview = async () => {
    setOutlines([]);
    setArticles([]);
    const titles = titlesInput.split("\n").map(t => t.trim()).filter(Boolean);
    const body = titles.length > 0 ? { titles } : { instruction, count: 5 };
    const res = await fetch("/api/generate-outlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setOutlines(data.articles || []);
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
      setProgress(Math.round(((i + 1) / outlines.length) * 100));
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">AI Article Generator</h1>
          <button
            className="text-sm text-gray-500 hover:text-red-500"
            onClick={() => {
              localStorage.removeItem("authenticated");
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Input Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <textarea
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="Master Instruction (ignored if custom titles are given)"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <textarea
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="Optional: Custom article titles, one per line"
            value={titlesInput}
            onChange={(e) => setTitlesInput(e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="Optional Modifier (e.g., '2025 Update - ')"
            value={modifier}
            onChange={(e) => setModifier(e.target.value)}
          />
          <input
            type="number"
            className="w-full border rounded-lg p-3 mb-3"
            placeholder="Word length (e.g., 800)"
            value={wordLength}
            onChange={(e) => setWordLength(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              Preview Outlines
            </button>
            {outlines.length > 0 && (
              <button
                onClick={handleGenerateArticles}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Generate Articles
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">Generating {progress}% complete</p>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Article Cards */}
        {articles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Generated Articles</h2>
            {articles.map((a, i) => (
              <div
                key={i}
                className="bg-white shadow-md rounded-lg p-6 mb-6 border hover:border-blue-400 transition"
              >
                <input
                  className="w-full font-bold text-lg mb-2 border-b p-2"
                  value={a.title}
                  onChange={(e) => updateArticle(i, "title", e.target.value)}
                />
                <input
                  className="w-full text-sm mb-2 border-b p-2 text-gray-600"
                  value={a.filename}
                  onChange={(e) => updateArticle(i, "filename", e.target.value)}
                />
                <textarea
                  className="w-full h-48 border rounded-lg p-3 text-gray-700"
                  value={a.content}
                  onChange={(e) => updateArticle(i, "content", e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
            >
              Download ZIP of PDFs
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
