"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getPreviewContent, getDownloadUrl } from "@/lib/api";

interface Props {
  jobId: string;
  filename: string;
  label: string;
  onClose: () => void;
}

// Pre-process markdown: highlight [UNVERIFIED] spans and citations
function preprocessMarkdown(raw: string): string {
  // Replace [UNVERIFIED — needs human: ...] with a special marker the renderer can style
  return raw
    .replace(
      /\[UNVERIFIED\s*[—\-]\s*needs human:\s*([\s\S]*?)\]/gi,
      (_, inner) => `**⚠ UNVERIFIED — needs human:** ${inner.trim().replace(/\n/g, " ")}`
    )
    .replace(
      /\[datasheet\s+(.*?)\]/gi,
      (_, loc) => `*[datasheet ${loc}]*`
    );
}

export function DocumentViewer({ jobId, filename, label, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPreviewContent(jobId, filename)
      .then(setContent)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load document"));
  }, [jobId, filename]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--allegro-warm-gray)]"
    >
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-[var(--allegro-border)] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--allegro-navy)] text-base">{label}</h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{filename}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={getDownloadUrl(jobId, filename)}
            download={filename}
            aria-label={`Download ${label} as Markdown`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--allegro-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--allegro-navy)] hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
          >
            <Download size={13} aria-hidden="true" />
            Download
          </a>
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

          {!content && !error && (
            <div className="flex items-center justify-center py-24 text-[var(--color-muted)]">
              <Loader2 size={24} className="animate-spin" aria-label="Loading document" />
            </div>
          )}

          {content && (
            <div className="prose prose-sm max-w-none
              prose-headings:text-[var(--allegro-navy)] prose-headings:font-bold
              prose-h1:text-2xl prose-h2:text-lg prose-h3:text-base
              prose-p:text-[var(--allegro-navy)] prose-p:leading-relaxed
              prose-li:text-[var(--allegro-navy)]
              prose-strong:text-[var(--allegro-navy)]
              prose-em:text-[var(--color-muted)] prose-em:not-italic prose-em:text-[11px]
              prose-code:text-[var(--allegro-navy)] prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
              prose-blockquote:border-[var(--allegro-orange)] prose-blockquote:bg-amber-50 prose-blockquote:rounded-r-lg prose-blockquote:text-amber-800 prose-blockquote:text-sm
              prose-table:text-sm prose-th:text-[var(--allegro-navy)] prose-td:text-[var(--allegro-navy)]
              [&_strong:has(+_em)]:text-amber-800
            ">
              <ReactMarkdown
                components={{
                  strong({ children, ...props }) {
                    const text = String(children);
                    if (text.startsWith("⚠ UNVERIFIED")) {
                      return (
                        <span className="inline-flex items-start gap-1 bg-amber-100 text-amber-800 font-semibold text-[12px] px-1.5 py-0.5 rounded border border-amber-200">
                          {children}
                        </span>
                      );
                    }
                    return <strong {...props}>{children}</strong>;
                  },
                  em({ children }) {
                    const text = String(children);
                    if (text.startsWith("[datasheet")) {
                      return (
                        <span className="text-[var(--color-cite)] text-[11px] italic not-italic font-normal ml-1">
                          {children}
                        </span>
                      );
                    }
                    return <em>{children}</em>;
                  },
                  // Render checklist items: "- [ ] ..."
                  li({ children, ...props }) {
                    const text = String(children);
                    if (text.startsWith("[ ]") || text.startsWith("[x]") || text.startsWith("[X]")) {
                      const checked = text.startsWith("[x]") || text.startsWith("[X]");
                      const rest = text.replace(/^\[[ xX]\]\s*/, "");
                      return (
                        <li {...props} className="list-none -ml-4 flex items-start gap-2">
                          <span className="flex-shrink-0 text-[var(--allegro-navy)] mt-0.5">{checked ? "☑" : "☐"}</span>
                          <span>{rest}</span>
                        </li>
                      );
                    }
                    return <li {...props}>{children}</li>;
                  },
                }}
              >
                {preprocessMarkdown(content)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
