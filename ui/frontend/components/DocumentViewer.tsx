"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Download, Loader2, Eye, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPreviewContent, getDownloadUrl } from "@/lib/api";

interface Props {
  jobId: string;
  filename: string;
  label: string;
  onClose: () => void;
}

export function DocumentViewer({ jobId, filename, label, onClose }: Props) {
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [processedMd, setProcessedMd] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // UNVERIFIED editing
  const uvDescriptions = useRef<string[]>([]);
  const [totalUnverified, setTotalUnverified] = useState(0);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [activeEdit, setActiveEdit] = useState<number | null>(null);

  // Citation visibility (off by default → cleaner reading)
  const [showCitations, setShowCitations] = useState(false);

  // Fetch raw markdown
  useEffect(() => {
    getPreviewContent(jobId, filename)
      .then(setRawContent)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load document"));
  }, [jobId, filename]);

  // Parse raw markdown: enumerate UNVERIFIED markers and replace with tokens
  useEffect(() => {
    if (!rawContent) return;
    const descs: string[] = [];
    let count = 0;
    const processed = rawContent
      .replace(
        /\[UNVERIFIED\s*[—\-]\s*needs human:\s*([\s\S]*?)\]/gi,
        (_, inner: string) => {
          const idx = count++;
          descs.push(inner.trim().replace(/\n/g, " "));
          return `**⚠UV${idx}**`;
        }
      )
      .replace(/\[datasheet\s+(.*?)\]/gi, (_, loc: string) => `*[datasheet ${loc}]*`);
    uvDescriptions.current = descs;
    setTotalUnverified(count);
    setProcessedMd(processed);
    setEdits({});
    setActiveEdit(null);
  }, [rawContent]);

  const filledCount = Object.keys(edits).length;

  // ESC closes modal only when no edit is active
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeEdit === null) onClose();
    },
    [onClose, activeEdit]
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

  function handleDownloadFinal() {
    if (!rawContent) return;
    let editIdx = 0;
    const finalMd = rawContent.replace(
      /\[UNVERIFIED\s*[—\-]\s*needs human:\s*([\s\S]*?)\]/gi,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--allegro-warm-gray)]"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-[var(--allegro-border)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--allegro-navy)] text-base truncate">{label}</h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{filename}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Gap progress pill */}
          {totalUnverified > 0 && (
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
            Citations
          </button>

          {/* Download raw markdown */}
          <a
            href={getDownloadUrl(jobId, filename)}
            download={filename}
            aria-label={`Download ${label} as Markdown`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--allegro-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--allegro-navy)] hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
          >
            <Download size={13} aria-hidden="true" />
            Markdown
          </a>

          {/* Download Final — with filled-in values substituted */}
          {rawContent && (
            <button
              type="button"
              onClick={handleDownloadFinal}
              title={
                filledCount > 0
                  ? `Download with ${filledCount} gap${filledCount > 1 ? "s" : ""} filled`
                  : "Download final draft"
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--allegro-navy)] text-white px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
            >
              <Download size={13} aria-hidden="true" />
              Download Final
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
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
                prose-th:text-[var(--allegro-navy)] prose-th:font-semibold prose-th:bg-gray-50
                prose-td:text-[var(--allegro-navy)]
                [&_table]:border-collapse [&_table]:w-full
                [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left
                [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2
                [&_tr:nth-child(even)]:bg-gray-50
              "
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // UNVERIFIED editable badges
                  strong({ children }) {
                    const text =
                      typeof children === "string"
                        ? children
                        : Array.isArray(children)
                        ? children.map((c) => (typeof c === "string" ? c : "")).join("")
                        : String(children ?? "");
                    const match = text.match(/^⚠UV(\d+)$/);
                    if (!match) {
                      return <strong>{children}</strong>;
                    }

                    const idx = parseInt(match[1], 10);
                    const description = uvDescriptions.current[idx] ?? "";
                    const filledValue = edits[idx];

                    // Active: show input
                    if (activeEdit === idx) {
                      return (
                        <span className="inline-flex items-center">
                          <input
                            autoFocus
                            defaultValue={filledValue ?? ""}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              setEdits((prev) => {
                                if (!val) {
                                  const next = { ...prev };
                                  delete next[idx];
                                  return next;
                                }
                                return { ...prev, [idx]: val };
                              });
                              setActiveEdit(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                              if (e.key === "Escape") setActiveEdit(null);
                            }}
                            placeholder={description}
                            className="border border-amber-400 rounded px-2 py-0.5 text-[12px] text-[var(--allegro-navy)] bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-[200px] max-w-[360px]"
                          />
                        </span>
                      );
                    }

                    // Filled: green pill, click to re-edit
                    if (filledValue !== undefined) {
                      return (
                        <button
                          type="button"
                          onClick={() => setActiveEdit(idx)}
                          title="Click to edit"
                          className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[12px] px-2 py-0.5 rounded border border-green-300 font-medium hover:bg-green-200 transition-colors cursor-pointer"
                        >
                          ✓ {filledValue}
                        </button>
                      );
                    }

                    // Unfilled: amber badge, click to fill
                    return (
                      <button
                        type="button"
                        onClick={() => setActiveEdit(idx)}
                        title={`Click to fill: ${description}`}
                        className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[12px] px-1.5 py-0.5 rounded border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer group"
                      >
                        <span className="font-semibold">⚠ needs human:</span>
                        <span className="font-normal text-amber-700 ml-0.5">{description}</span>
                        <span className="opacity-0 group-hover:opacity-60 text-[10px] ml-0.5 transition-opacity">
                          ✎
                        </span>
                      </button>
                    );
                  },

                  // Datasheet citations — toggle on/off
                  em({ children }) {
                    const text =
                      typeof children === "string" ? children : String(children ?? "");
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
                    const text =
                      typeof children === "string" ? children : String(children ?? "");
                    if (
                      text.startsWith("[ ]") ||
                      text.startsWith("[x]") ||
                      text.startsWith("[X]")
                    ) {
                      const checked = text.startsWith("[x]") || text.startsWith("[X]");
                      const rest = text.replace(/^\[[ xX]\]\s*/, "");
                      return (
                        <li
                          {...props}
                          className="list-none -ml-4 flex items-start gap-2"
                        >
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

      {/* Footer hint when unfilled gaps remain */}
      {totalUnverified > 0 && filledCount < totalUnverified && (
        <div className="flex-shrink-0 bg-amber-50 border-t border-amber-200 px-4 sm:px-6 py-2.5 text-center">
          <p className="text-xs text-amber-700">
            Click any{" "}
            <span className="font-semibold bg-amber-100 border border-amber-300 rounded px-1 py-0.5">
              ⚠ needs human
            </span>{" "}
            badge to fill it in — then use <strong>Download Final</strong> to export.
          </p>
        </div>
      )}
    </div>
  );
}
