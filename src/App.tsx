import { useState, useEffect, useCallback, useRef } from "react";
import LZString from "lz-string";

type Tab = "html" | "css" | "js";

const DEFAULT_HTML = `<div class="container">
  <h1>مرحباً بك! 👋</h1>
  <p>ابدأ بكتابة الكود الخاص بك هنا</p>
  <button onclick="sayHello()">اضغط هنا</button>
  <div id="output"></div>
</div>`;

const DEFAULT_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  color: #fff;
}

.container {
  text-align: center;
  padding: 2rem;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(to right, #f7971e, #ffd200);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  font-size: 1.2rem;
  color: #aaa;
  margin-bottom: 2rem;
}

button {
  padding: 12px 32px;
  font-size: 1rem;
  border: none;
  border-radius: 50px;
  background: linear-gradient(to right, #f7971e, #ffd200);
  color: #1a1a2e;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(247, 151, 30, 0.4);
}

#output {
  margin-top: 1.5rem;
  font-size: 1.3rem;
  color: #ffd200;
}`;

const DEFAULT_JS = `function sayHello() {
  const output = document.getElementById('output');
  output.textContent = '🎉 أهلاً وسهلاً!';
  output.style.animation = 'none';
  output.offsetHeight; // trigger reflow
  output.style.animation = 'fadeIn 0.5s ease';
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = \`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
\`;
document.head.appendChild(style);`;

function encodeCode(html: string, css: string, js: string): string {
  const data = JSON.stringify({ html, css, js });
  return LZString.compressToEncodedURIComponent(data);
}

function decodeCode(encoded: string): { html: string; css: string; js: string } | null {
  try {
    const data = LZString.decompressFromEncodedURIComponent(encoded);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function App() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [css, setCss] = useState(DEFAULT_CSS);
  const [js, setJs] = useState(DEFAULT_JS);
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [layout, setLayout] = useState<"horizontal" | "vertical">("vertical");
  const [viewMode, setViewMode] = useState<"editor" | "preview" | "both">("both");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      // Check if it's a view-only mode
      const isViewOnly = hash.startsWith("view/");
      const encoded = isViewOnly ? hash.slice(5) : hash;
      const decoded = decodeCode(encoded);
      if (decoded) {
        setHtml(decoded.html);
        setCss(decoded.css);
        setJs(decoded.js);
        if (isViewOnly) {
          setViewMode("preview");
        }
      }
    }
  }, []);

  const getSrcDoc = useCallback(() => {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${js}<\/script>
</body>
</html>`;
  }, [html, css, js]);

  // Update preview
  useEffect(() => {
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = getSrcDoc();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [getSrcDoc]);

  const generateLink = (viewOnly = false) => {
    const encoded = encodeCode(html, css, js);
    const prefix = viewOnly ? "#view/" : "#";
    const link = `${window.location.origin}${window.location.pathname}${prefix}${encoded}`;
    setGeneratedLink(link);
    setShowLinkModal(true);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = generatedLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadHTML = () => {
    const blob = new Blob([getSrcDoc()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codeshare-project.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setHtml("");
    setCss("");
    setJs("");
  };

  const getCurrentCode = () => {
    if (activeTab === "html") return html;
    if (activeTab === "css") return css;
    return js;
  };

  const setCurrentCode = (val: string) => {
    if (activeTab === "html") setHtml(val);
    else if (activeTab === "css") setCss(val);
    else setJs(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setCurrentCode(newValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  // Full preview mode
  if (viewMode === "preview") {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#1e1e2e]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-[#313244]">
          <div className="flex items-center gap-3">
            <CodeShareLogo />
            <span className="text-[#cdd6f4] text-sm">وضع المعاينة</span>
          </div>
          <button
            onClick={() => setViewMode("both")}
            className="px-4 py-1.5 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded-lg font-medium hover:bg-[#74c7ec] transition-colors"
          >
            فتح المحرر
          </button>
        </div>
        <iframe
          ref={iframeRef}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-modals"
          title="preview"
        />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "html", label: "HTML", icon: "🟧" },
    { id: "css", label: "CSS", icon: "🟦" },
    { id: "js", label: "JavaScript", icon: "🟨" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e2e] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[#181825] border-b border-[#313244] shrink-0">
        <div className="flex items-center gap-4">
          <CodeShareLogo />
          <div className="hidden sm:flex items-center gap-1 bg-[#1e1e2e] rounded-lg p-1">
            <button
              onClick={() => setLayout("vertical")}
              className={`p-1.5 rounded transition-colors ${layout === "vertical" ? "bg-[#313244] text-[#cdd6f4]" : "text-[#6c7086] hover:text-[#cdd6f4]"}`}
              title="تقسيم عمودي"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="9" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              onClick={() => setLayout("horizontal")}
              className={`p-1.5 rounded transition-colors ${layout === "horizontal" ? "bg-[#313244] text-[#cdd6f4]" : "text-[#6c7086] hover:text-[#cdd6f4]"}`}
              title="تقسيم أفقي"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="1" width="6" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#f38ba8] hover:bg-[#f38ba8]/10 rounded-lg transition-colors"
            title="مسح الكل"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            مسح
          </button>
          <button
            onClick={downloadHTML}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#a6e3a1] hover:bg-[#a6e3a1]/10 rounded-lg transition-colors"
            title="تحميل"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            تحميل
          </button>
          <div className="relative">
            <button
              onClick={() => generateLink(false)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#cba6f7] text-[#1e1e2e] rounded-lg font-semibold hover:bg-[#b4befe] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              إنشاء رابط
            </button>
          </div>
          <button
            onClick={() => generateLink(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#89b4fa] text-[#1e1e2e] rounded-lg font-semibold hover:bg-[#74c7ec] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            رابط معاينة
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={`flex-1 flex ${layout === "vertical" ? "flex-col" : "flex-row"} overflow-hidden`}>
        {/* Editor Panel */}
        <div className={`flex flex-col ${layout === "vertical" ? "h-1/2" : "w-1/2"} border-${layout === "vertical" ? "b" : "r"} border-[#313244]`}>
          {/* Tabs */}
          <div className="flex items-center bg-[#181825] border-b border-[#313244] shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-[#cdd6f4] border-[#cba6f7] bg-[#1e1e2e]"
                    : "text-[#6c7086] border-transparent hover:text-[#a6adc8] hover:bg-[#1e1e2e]/50"
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="px-3 py-1">
              <span className="text-[10px] text-[#585b70] font-mono">
                {getCurrentCode().length} chars
              </span>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 flex">
              {/* Line Numbers */}
              <div className="w-12 bg-[#181825] text-[#585b70] text-xs font-mono py-3 text-right pr-3 overflow-hidden select-none shrink-0">
                {getCurrentCode().split("\n").map((_, i) => (
                  <div key={i} className="leading-6">{i + 1}</div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={getCurrentCode()}
                onChange={(e) => setCurrentCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-[#1e1e2e] text-[#cdd6f4] font-mono text-sm p-3 resize-none outline-none leading-6 overflow-auto"
                spellCheck={false}
                dir="ltr"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={`flex flex-col ${layout === "vertical" ? "h-1/2" : "w-1/2"}`}>
          <div className="flex items-center justify-between bg-[#181825] border-b border-[#313244] px-4 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#f38ba8]" />
                <div className="w-3 h-3 rounded-full bg-[#f9e2af]" />
                <div className="w-3 h-3 rounded-full bg-[#a6e3a1]" />
              </div>
              <span className="text-[#6c7086] text-sm mr-2">المعاينة</span>
            </div>
            <button
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.srcdoc = getSrcDoc();
                }
              }}
              className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-1"
              title="تحديث"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
          <iframe
            ref={iframeRef}
            className="flex-1 w-full bg-white"
            sandbox="allow-scripts allow-modals"
            title="preview"
          />
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLinkModal(false)}>
          <div
            className="bg-[#1e1e2e] border border-[#313244] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#cdd6f4] text-lg font-semibold flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cba6f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                تم إنشاء الرابط!
              </h3>
              <button onClick={() => setShowLinkModal(false)} className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-[#a6adc8] text-sm mb-4">
              شارك هذا الرابط مع أي شخص لعرض الكود الخاص بك:
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={generatedLink}
                readOnly
                dir="ltr"
                className="flex-1 bg-[#181825] border border-[#313244] rounded-lg px-3 py-2.5 text-[#cdd6f4] text-sm font-mono outline-none focus:border-[#cba6f7] transition-colors overflow-hidden text-ellipsis"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyLink}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                  copied
                    ? "bg-[#a6e3a1] text-[#1e1e2e]"
                    : "bg-[#cba6f7] text-[#1e1e2e] hover:bg-[#b4befe]"
                }`}
              >
                {copied ? "✓ تم النسخ!" : "نسخ"}
              </button>
            </div>

            <div className="flex gap-2 text-xs">
              <span className="text-[#585b70] bg-[#181825] px-2 py-1 rounded-md">
                حجم الرابط: {(generatedLink.length / 1024).toFixed(1)} KB
              </span>
              <span className="text-[#585b70] bg-[#181825] px-2 py-1 rounded-md">
                {generatedLink.includes("#view/") ? "🔒 معاينة فقط" : "✏️ محرر + معاينة"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeShareLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#cba6f7] to-[#89b4fa] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1e2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </div>
      <span className="text-[#cdd6f4] font-bold text-lg hidden sm:block">
        Code<span className="text-[#cba6f7]">Share</span>
      </span>
    </div>
  );
}
