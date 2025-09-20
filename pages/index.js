import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Disclosure } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/24/solid";

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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-6 hidden md:block">
        <h1 className="text-2xl font-bold text-blue-600 mb-8">AI Writer</h1>
        <nav className="space-y-4">
          <a className="block text-gray-700 hover:text-blue-600" href="#">Home</a>
          <a className="block text-gray-700 hover:text-blue-600" href="#">Generated Files</a>
          <a className="block text-gray-700 hover:text-blue-600" href="#">Settings</a>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        {/* Top Navbar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Article Generator</h2>
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

        {/* Input Card */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Configuration</h3>
          <textarea
            className="w-full border rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500"
            placeholder="Master Instruction (ignored if custom titles are given)"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <textarea
            className="w-full border rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500"
            placeholder="Optional: Custom article titles, one per line"
            value={titlesInput}
            onChange={(e) => setTitlesInput(e.target.value)}
          />
          <input
            className="w-full border rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500"
            placeholder="Optional Modifier (e.g., '2025 Update - ')"
            value={modifier}
            onChange={(e) => setModifier(e.target.value)}
          />
          <input
            type="number"
            className="w-full border rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500"
            placeholder="Word length (e.g., 800)"
            value={wordLength}
            onChange={(e) => setWordLength(e.target.value)}
          />

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              Preview Outlines
            </button>
            {outlines.length > 0 && (
              <button
                onClick={handleGenerateArticles}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Generate Articles
              </button>
            )}
          </div>
        </div>

        {/* Progress Tracker */}
        {progress > 0 && (
          <div className="mb-8">
            <p className="text-sm text-gray-500 mb-2">
              Generating... {progress}% complete
            </p>
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
            <h3 className="text-lg font-semibold mb-4">Generated Articles</h3>
            {articles.map((a, i) => (
              <Disclosure key={i} defaultOpen>
                {({ open }) => (
                  <div className="bg-white shadow-md rounded-lg mb-4">
                    <Disclosure.Button className="flex justify-between items-center w-full px-4 py-3 text-left text-gray-800 font-medium focus:outline-none">
                      <span>{a.title}</span>
                      <ChevronUpIcon
                        className={`${open ? "transform rotate-180" : ""} w-5 h-5 text-gray-500`}
                      />
                    </Disclosure.Button>
                    <Disclosure.Panel className="px-4 pb-4 text-gray-700">
                      <input
                        className="w-full border-b p-2 mb-2 font-semibold"
                        value={a.title}
                        onChange={(e) => updateArticle(i, "title", e.target.value)}
                      />
                      <input
                        className="w-full border-b p-2 mb-2 text-sm text-gray-600"
                        value={a.filename}
                        onChange={(e) => updateArticle(i, "filename", e.target.value)}
                      />
                      <textarea
                        className="w-full border rounded-lg p-3 h-48 mb-2 focus:ring-2 focus:ring-blue-500"
                        value={a.content}
                        onChange={(e) => updateArticle(i, "content", e.target.value)}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{a.content.split(" ").length} words</span>
                        <span className="italic">Editable</span>
                      </div>
                    </Disclosure.Panel>
                  </div>
                )}
              </Disclosure>
            ))}
            <button
              onClick={handleDownload}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition"
            >
              Download ZIP of PDFs
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
