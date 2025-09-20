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
  const [count, setCount] = useState(20);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/batch-generate-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, count: Number(count) || 20 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFileList(data.files || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch("/api/batch-generate-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, count: Number(count) || 20 }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "articles_bundle.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "auto" }}>
      <h1>Batch Article → PDFs</h1>

      <textarea
        style={{ width: "100%", height: 160, margin: "8px 0", padding: "8px" }}
        placeholder="Enter a single master instruction for all articles"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
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
        {loading ? "Generating Preview..." : "Preview File List"}
      </button>

      {fileList.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Files to be generated:</h3>
          <ul>
            {fileList.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
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