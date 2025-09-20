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
  const [generating, setGenerating] = useState(false);

  const handleBatch = async () => {
    if (!instruction.trim()) {
      alert("Please enter an instruction for the articles.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/batch-generate-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, count: Number(count) || 20 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "articles_bundle.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "auto" }}>
      <h1>Batch Article → PDFs (1 instruction → many PDFs)</h1>
      <p>Enter a single master instruction. The tool will generate multiple unique articles and return a ZIP with individual PDFs.</p>

      <textarea
        style={{ width: "100%", height: 160, margin: "8px 0", padding: "8px" }}
        placeholder="e.g., Write SEO-friendly guides about Coinbase support tips. Use headings, FAQs, and include keywords like 'coinbase customer service' and 'coinbase chat'..."
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
        onClick={handleBatch}
        disabled={generating}
        style={{ padding: "10px 18px", marginTop: 16 }}
      >
        {generating ? "Generating..." : "Generate ZIP of PDFs"}
      </button>
    </div>
  );
}