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
  const [modifier, setModifier] = useState("");
  const [count, setCount] = useState(5);
  const [outlineList, setOutlineList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handlePreview = async () => {
    setLoading(true);
    setProgress("Generating titles and outlines...");
    try {
      const res = await fetch("/api/generate-outlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, count: Number(count) || 5 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutlineList(data.articles || []);
      setProgress(`Preview ready: ${data.articles.length} outlines.`);
    } catch (err) {
      alert(err.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setProgress("Generating ZIP with full articles...");
    try {
      const res = await fetch("/api/generate-zip-from-outlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlines: outlineList, modifier }),
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

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "auto" }}>
      <h1>Hybrid Article Generator → PDFs (with Modifier)</h1>

      <textarea
        style={{ width: "100%", height: 160, margin: "8px 0", padding: "8px" }}
        placeholder="Enter a single master instruction"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <input
        style={{ width: "100%", margin: "8px 0", padding: "8px" }}
        placeholder="Optional Modifier (e.g., '2025 Update - ')"
        value={modifier}
        onChange={(e) => setModifier(e.target.value)}
      />

      <label style={{ display: "block", marginTop: 8 }}>
        Number of articles (max 20):{" "}
        <input
          type="number"
          min="1"
          max="20"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          style={{ width: 80, marginLeft: 8 }}
        />
      </label>

      <button
        onClick={handlePreview}
        disabled={loading}
        style={{ padding: "10px 18px", marginTop: 16 }}
      >
        {loading ? "Generating..." : "Preview Outlines"}
      </button>

      {progress && <p style={{ marginTop: 10 }}>{progress}</p>}

      {outlineList.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Planned Articles:</h3>
          <ul>
            {outlineList.map((a, i) => (
              <li key={i}>
                <b>{modifier}{a.title}</b><br/>
                <i>{a.outline}</i><br/>
                Filename: {a.filename}
              </li>
            ))}
          </ul>
          <button
            onClick={handleDownload}
            style={{ padding: "10px 18px", marginTop: 16 }}
          >
            Download ZIP of Full PDFs
          </button>
        </div>
      )}
    </div>
  );
}