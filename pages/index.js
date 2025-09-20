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
  const [articles, setArticles] = useState([]);
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setProgress("Generating outlines...");
    try {
      const titles = titlesInput
        .split("\n")
        .map(t => t.trim())
        .filter(Boolean);
      const body = titles.length > 0
        ? { titles, modifier, wordLength }
        : { instruction, modifier, wordLength, count: 5 };

      const res = await fetch("/api/generate-outlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setArticles(data.articles || []);
      setProgress(`Preview ready: ${data.articles.length} articles.`);
    } catch (err) {
      alert(err.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setProgress("Generating ZIP...");
    try {
      const res = await fetch("/api/generate-zip-from-outlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: articles, modifier, wordLength }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "articles_bundle.zip";
      a.click();
      URL.revokeObjectURL(url);
      setProgress("ZIP ready and downloaded.");
    } catch (err) {
      alert(err.message);
      setProgress("");
    }
  };

  const updateArticle = (idx, field, value) => {
    const newArticles = [...articles];
    newArticles[idx][field] = value;
    setArticles(newArticles);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "auto" }}>
      <h1>Full Control Article Generator → PDFs</h1>

      <textarea
        style={{ width: "100%", height: 80, margin: "8px 0", padding: "8px" }}
        placeholder="Master Instruction (ignored if custom titles are given)"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <textarea
        style={{ width: "100%", height: 100, margin: "8px 0", padding: "8px" }}
        placeholder="Optional: Enter custom article titles, one per line"
        value={titlesInput}
        onChange={(e) => setTitlesInput(e.target.value)}
      />

      <input
        style={{ width: "100%", margin: "8px 0", padding: "8px" }}
        placeholder="Optional Modifier (e.g., '2025 Update - ')"
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
      />

      <input
        type="number"
        style={{ width: "100%", margin: "8px 0", padding: "8px" }}
        placeholder="Word length (e.g., 800)"
        value={wordLength}
        onChange={(e) => setWordLength(e.target.value)}
      />

      <button
        onClick={handlePreview}
        disabled={loading}
        style={{ padding: "10px 18px", marginTop: 16 }}
      >
        {loading ? "Generating..." : "Preview Outlines"}
      </button>

      {progress && <p style={{ marginTop: 10 }}>{progress}</p>}

      {articles.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Articles (Editable):</h3>
          {articles.map((a, i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
              <input
                style={{ width: "100%", margin: "4px 0", padding: "6px" }}
                value={a.title}
                onChange={(e) => updateArticle(i, "title", e.target.value)}
              />
              <input
                style={{ width: "100%", margin: "4px 0", padding: "6px" }}
                value={a.filename}
                onChange={(e) => updateArticle(i, "filename", e.target.value)}
              />
              <textarea
                style={{ width: "100%", height: 150, margin: "4px 0", padding: "6px" }}
                value={a.content || a.outline}
                onChange={(e) => updateArticle(i, "content", e.target.value)}
              />
            </div>
          ))}
          <button
            onClick={handleDownload}
            style={{ padding: "10px 18px", marginTop: 16 }}
          >
            Download ZIP of PDFs
          </button>
        </div>
      )}
    </div>
  );
}