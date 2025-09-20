import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("authenticated") !== "true") {
      router.push('/login');
    }
  }, [router]);

  const [instruction, setInstruction] = useState("");
  const [titlesInput, setTitlesInput] = useState("");
  const [modifier, setModifier] = useState("");
  const [wordLength, setWordLength] = useState(800);
  const [outlines, setOutlines] = useState([]);
  const [articles, setArticles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loadingOutlines, setLoadingOutlines] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const handlePreview = async () => {
    if(!instruction){alert("Instruction is required.");return;}
    if(!titlesInput.trim()){alert("At least one title is required.");return;}
    setOutlines([]);
    setArticles([]);
    setLoadingOutlines(true);
    const titles = titlesInput.split('\n').map(t => t.trim()).filter(Boolean);
    const res = await fetch('/api/generate-outlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction, titles }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      setOutlines(data.articles || []);
    }
    setLoadingOutlines(false);
  };

  const handleGenerateArticles = async () => {
    setArticles([]);
    setProgress(0);
    setLoadingArticles(true);
    for (let i = 0; i < outlines.length; i++) {
      const res = await fetch('/api/expand-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline: outlines[i], modifier, wordLength }),
      });
      const data = await res.json();
      setArticles(prev => [...prev, data]);
      setProgress(Math.round(((i + 1) / outlines.length) * 100));
    }
    setLoadingArticles(false);
  };

  const handleDownload = async () => {
    const res = await fetch('/api/generate-zip-from-articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'articles_bundle.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateArticle = (idx, field, value) => {
    const newArr = [...articles];
    newArr[idx][field] = value;
    setArticles(newArr);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">PDFBluk</h1>
          <button
            className="text-gray-600 hover:text-gray-900"
            onClick={() => {
              localStorage.removeItem('authenticated');
              router.push('/login');
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-10 px-6">
        <div className="bg-white rounded-md shadow-lg p-8 mb-10">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Generate Articles to PDF</h2>
          <div className="space-y-4">
            <textarea
              className="w-full border-gray-300 rounded-md p-4 focus:ring focus:ring-indigo-200 focus:border-indigo-500"
              placeholder="Master Instruction (required)"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
            <textarea
              className="w-full border-gray-300 rounded-md p-4 focus:ring focus:ring-indigo-200 focus:border-indigo-500"
              placeholder="Article titles (required, one per line)"
              value={titlesInput}
              onChange={(e) => setTitlesInput(e.target.value)}
            />
            <input
              className="w-full border-gray-300 rounded-md p-4 focus:ring focus:ring-indigo-200 focus:border-indigo-500"
              placeholder="Optional Modifier (e.g., '2025 Update - ')"
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
            />
            <div className="w-full md:w-1/3">
              <input
                type="number"
                className="w-full border-gray-300 rounded-md p-4 focus:ring focus:ring-indigo-200 focus:border-indigo-500"
                placeholder="Word length (e.g., 800)"
                value={wordLength}
                onChange={(e) => setWordLength(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            <button
              onClick={handlePreview}
              className="px-6 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
              disabled={loadingOutlines}
            >
              {loadingOutlines ? 'Generating Outlines...' : 'Preview Outlines'}
            </button>
            {outlines.length > 0 && (
              <button
                onClick={handleGenerateArticles}
                className="px-6 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 font-medium"
                disabled={loadingArticles}
              >
                {loadingArticles ? `Generate Articles ${progress}%` : 'Generate Articles'}
              </button>
            )}
          </div>
        </div>

        {/* Outlines Preview Section */}
        {outlines.length > 0 && (
          <div className="bg-white rounded-md shadow p-6 mb-10">
            <h3 className="text-lg font-semibold mb-4">Preview Outlines ({outlines.length})</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {outlines.map((o, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="font-semibold text-gray-800 mb-1">{o.title}</div>
                  <div className="text-xs text-gray-500 mb-2">Filename: {o.filename}</div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{o.outline || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingArticles && outlines.length > 0 && (
          <div className="mb-10">
            <p className="text-gray-600 mb-2">Progress: {progress}%</p>
            <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {articles.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Generated Articles</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {articles.map((a, idx) => (
                <div key={idx} className="bg-white rounded-md shadow p-6">
                  <div className="mb-4">
                    <input
                      className="w-full text-2xl font-semibold border-b border-gray-300 p-2 focus:outline-none"
                      value={a.title}
                      onChange={(e) => updateArticle(idx, "title", e.target.value)}
                    />
                    <input
                      className="w-full text-sm text-gray-500 border-b border-gray-300 p-2 focus:outline-none mt-1"
                      value={a.filename}
                      onChange={(e) => updateArticle(idx, "filename", e.target.value)}
                    />
                  </div>
                  <textarea
                    className="w-full border rounded-md p-4 text-gray-700 h-64 focus:ring focus:ring-indigo-200 focus:border-indigo-500"
                    value={a.content}
                    onChange={(e) => updateArticle(idx, "content", e.target.value)}
                  />
                  <div className="flex justify-end mt-4 text-xs text-gray-500">
                    {a.content.split(" ").length} words
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-semibold"
              >
                Download All PDFs ZIP
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
