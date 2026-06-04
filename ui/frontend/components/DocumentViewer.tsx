"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Download, Loader2, Eye, EyeOff, PanelRight, PanelRightClose } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPreviewContent, getDownloadUrl } from "@/lib/api";

interface Props {
  jobId: string;
  filename: string;
  label: string;
  onClose: () => void;
}

// Extract plain text from React children (handles string, number, array)
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  return "";
}

export function DocumentViewer({ jobId, filename, label, onClose }: Props) {
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [processedMd, setProcessedMd] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const STORAGE_KEY = `allegro-gaps-${jobId}-${filename}`;

  const uvDescriptions = useRef<string[]>([]);
  const [totalUnverified, setTotalUnverified] = useState(0);
  const [edits, setEdits] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(`allegro-gaps-${jobId}-${filename}`);
      return saved ? (JSON.parse(saved) as Record<number, string>) : {};
    } catch {
      return {};
    }
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  const [showCitations, setShowCitations] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch raw markdown
  useEffect(() => {
    getPreviewContent(jobId, filename)
      .then(setRawContent)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load document"));
  }, [jobId, filename]);

  // Parse UNVERIFIED markers and citations
  useEffect(() => {
    if (!rawContent) return;
    const descs: string[] = [];
    let count = 0;
    const processed = rawContent
      .replace(
        /\[UNVERIFIED\s*[—–\-]\s*needs human:\s*([\s\S]*?)\]/gi,
        (_, inner: string) => {
          descs.push(inner.trim().replace(/\n/g, " "));
          return `**⚠UV${count++}**`;
        }
      )
      .replace(/\[datasheet\s+(.*?)\]/gi, (_, loc: string) => `*[datasheet ${loc}]*`);
    uvDescriptions.current = descs;
    inputRefs.current = new Array(count).fill(null);
    setTotalUnverified(count);
    setProcessedMd(processed);
    // Do NOT reset edits here — localStorage initializer already loaded saved edits
  }, [rawContent]);

  // Auto-save edits to localStorage on every change
  useEffect(() => {
    try {
      if (Object.keys(edits).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1500);
      return () => clearTimeout(t);
    } catch {
      // ignore (private browsing / storage full)
    }
  }, [edits, STORAGE_KEY]);

  const filledCount = Object.keys(edits).length;

  // ESC closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSetEdit(idx: number, value: string) {
    setEdits((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[idx];
        return next;
      }
      return { ...prev, [idx]: value };
    });
  }

  function scrollToInput(idx: number) {
    setSidebarOpen(true);
    // Let the sidebar open, then scroll
    requestAnimationFrame(() => {
      const el = inputRefs.current[idx];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    });
  }

  function handleDownloadFinal() {
    if (!rawContent) return;
    let editIdx = 0;
    const finalMd = rawContent.replace(
      /\[UNVERIFIED\s*[—–\-]\s*needs human:\s*([\s\S]*?)\]/gi,
      (original) => {
        const val = edits[editIdx++];
        return val !== undefined ? val : original;
      }
    );
    const blob = new Blob([finalMd], { type: "text/markdown; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.md$/, "_final.md");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasSidebar = totalUnverified > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--allegro-warm-gray)]"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-[var(--allegro-border)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--allegro-navy)] text-base truncate">{label}</h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{filename}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Gap progress pill */}
          {hasSidebar && (
            <span
              className={[
                "text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap",
                filledCount === totalUnverified
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-amber-50 border-amber-200 text-amber-700",
              ].join(" ")}
            >
              {filledCount}/{totalUnverified} gaps filled
            </span>
          )}

          {/* Sidebar toggle */}
          {hasSidebar && (
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Hide gap filler" : "Show gap filler"}
              className={[
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2",
                sidebarOpen
                  ? "border-[var(--allegro-orange)] bg-orange-50 text-[var(--allegro-orange)]"
                  : "border-[var(--allegro-border)] bg-white text-[var(--color-muted)] hover:bg-gray-50",
              ].join(" ")}
            >
              {sidebarOpen ? (
                <PanelRightClose size={13} aria-hidden="true" />
              ) : (
                <PanelRight size={13} aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Fill gaps</span>
            </button>
          )}

          {/* Citations toggle */}
          <button
            type="button"
            onClick={() => setShowCitations((v) => !v)}
            title={showCitations ? "Hide citations" : "Show datasheet citations"}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2",
              showCitations
                ? "border-[var(--allegro-orange)] bg-orange-50 text-[var(--allegro-orange)]"
                : "border-[var(--allegro-border)] bg-white text-[var(--color-muted)] hover:bg-gray-50",
            ].join(" ")}
          >
            {showCitations ? (
              <EyeOff size={13} aria-hidden="true" />
            ) : (
              <Eye size={13} aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Citations</span>
          </button>

          {/* No-gaps indicator (only for documents with zero UNVERIFIED markers) */}
          {rawContent && totalUnverified === 0 && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
              ✓ No gaps to fill
            </span>
          )}

          {/* Download raw markdown */}
          <a
            href={getDownloadUrl(jobId, filename)}
            download={filename}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--allegro-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--allegro-navy)] hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
          >
            <Download size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Markdown</span>
          </a>

          {/* Download Final — always visible once content is loaded */}
          {rawContent && (
            <button
              type="button"
              onClick={handleDownloadFinal}
              title={filledCount > 0 ? `Download with ${filledCount} gap(s) filled` : "Download final draft"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--allegro-navy)] text-white px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
            >
              <Download size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Download Final</span>
              <span className="sm:hidden">Final</span>
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document viewer"
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--allegro-navy)] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Body: document + sidebar ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document panel */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="mx-auto max-w-3xl">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!processedMd && !error && (
              <div className="flex items-center justify-center py-24 text-[var(--color-muted)]">
                <Loader2 size={24} className="animate-spin" aria-label="Loading document" />
              </div>
            )}

            {processedMd && (
              <div
                className="
                  prose prose-sm max-w-none
                  prose-headings:text-[var(--allegro-navy)] prose-headings:font-bold
                  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-base
                  prose-p:text-[var(--allegro-navy)] prose-p:leading-relaxed
                  prose-li:text-[var(--allegro-navy)]
                  prose-strong:text-[var(--allegro-navy)]
                  prose-em:text-[var(--color-muted)] prose-em:not-italic prose-em:text-[11px]
                  prose-code:text-[var(--allegro-navy)] prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
                  prose-blockquote:border-[var(--allegro-orange)] prose-blockquote:bg-amber-50 prose-blockquote:rounded-r-lg prose-blockquote:text-amber-800 prose-blockquote:text-sm
                  prose-table:w-full prose-table:text-sm
                  prose-th:text-[var(--allegro-navy)] prose-th:font-semibold prose-th:bg-gray-50 prose-th:text-left
                  prose-td:text-[var(--allegro-navy)]
                  [&_table]:border-collapse [&_table]:w-full
                  [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2
                  [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2
                  [&_tr:nth-child(even)_td]:bg-gray-50
                "
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // UNVERIFIED status badges (read-only; click → focus sidebar input)
                    strong({ children }) {
                      const text = extractText(children);
                      const match = text.match(/^⚠UV(\d+)$/);
                      if (!match) return <strong>{children}</strong>;

                      const idx = parseInt(match[1], 10);
                      const description = uvDescriptions.current[idx] ?? "";
                      const filledValue = edits[idx];

                      if (filledValue) {
                        return (
                          <button
                            type="button"
                            onClick={() => scrollToInput(idx)}
                            title="Click to re-edit in the gap filler →"
                            className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[12px] px-2 py-0.5 rounded border border-green-300 font-medium hover:bg-green-200 transition-colors cursor-pointer"
                          >
                            ✓ {filledValue}
                          </button>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => scrollToInput(idx)}
                          title="Click to fill in the gap filler →"
                          className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[12px] px-1.5 py-0.5 rounded border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold">⚠</span>
                          <span className="font-normal">{description}</span>
                        </button>
                      );
                    },

                    // Datasheet citations — toggle on/off
                    em({ children }) {
                      const text = extractText(children);
                      if (text.startsWith("[datasheet")) {
                        if (!showCitations) return <></>;
                        return (
                          <span className="text-gray-400 text-[11px] not-italic font-normal ml-1">
                            {children}
                          </span>
                        );
                      }
                      return <em>{children}</em>;
                    },

                    // Checkbox list items
                    li({ children, ...props }) {
                      const text = extractText(children);
                      if (
                        text.startsWith("[ ]") ||
                        text.startsWith("[x]") ||
                        text.startsWith("[X]")
                      ) {
                        const checked = !text.startsWith("[ ]");
                        const rest = text.replace(/^\[[ xX]\]\s*/, "");
                        return (
                          <li {...props} className="list-none -ml-4 flex items-start gap-2">
                            <span className="flex-shrink-0 text-[var(--allegro-navy)] mt-0.5">
                              {checked ? "☑" : "☐"}
                            </span>
                            <span>{rest}</span>
                          </li>
                        );
                      }
                      return <li {...props}>{children}</li>;
                    },
                  }}
                >
                  {processedMd}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* ── Gap filler sidebar ─────────────────────────────────── */}
        {hasSidebar && sidebarOpen && (
          <div className="w-72 sm:w-80 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
            {/* Sidebar header */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[var(--allegro-navy)] text-sm">Fill in gaps</h3>
                {savedFlash && (
                  <span className="text-[11px] text-green-600 font-medium">✓ Saved</span>
                )}
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {filledCount === totalUnverified
                  ? "All gaps filled ✓"
                  : `${filledCount} of ${totalUnverified} completed — edits auto-saved`}
              </p>
            </div>

            {/* Gap inputs */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {Array.from({ length: totalUnverified }, (_, idx) => {
                const desc = uvDescriptions.current[idx] ?? "";
                const filled = edits[idx];
                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`gap-${idx}`}
                      className="text-[11px] font-semibold text-[var(--allegro-navy)] leading-snug"
                    >
                      {idx + 1}. {desc}
                    </label>
                    <input
                      id={`gap-${idx}`}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      value={edits[idx] ?? ""}
                      onChange={(e) => handleSetEdit(idx, e.target.value)}
                      placeholder="Type value here…"
                      className={[
                        "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-1 transition-colors",
                        filled
                          ? "border-green-300 bg-green-50 text-[var(--allegro-navy)]"
                          : "border-gray-200 bg-white text-[var(--allegro-navy)] placeholder:text-gray-400 hover:border-gray-300",
                      ].join(" ")}
                    />
                    {filled && (
                      <span className="text-[11px] text-green-600 font-medium">✓ Filled</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar footer */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-200 flex flex-col gap-1.5">
              <p className="text-[11px] text-[var(--color-muted)] text-center leading-snug">
                Use <strong>Download Final</strong> in the header to export.
                {filledCount < totalUnverified && (
                  <span> Unfilled gaps stay as [UNVERIFIED].</span>
                )}
              </p>
              {filledCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEdits({});
                    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                  }}
                  className="text-[11px] text-[var(--color-muted)] hover:text-red-600 underline transition-colors text-center"
                >
                  Clear all edits
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
