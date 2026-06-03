"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Download, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { JobResults, DocumentPreview, UnverifiedGap } from "@/lib/api";
import { getDownloadUrl } from "@/lib/api";

interface Props {
  results: JobResults;
  jobId: string;
  onStartOver: () => void;
}

function DownloadButton({
  href,
  label,
  type,
}: {
  href: string;
  label: string;
  type: "md" | "docx";
}) {
  return (
    <a
      href={href}
      download
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--allegro-border)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--allegro-navy)] transition-colors hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
    >
      <Download size={14} aria-hidden="true" />
      {type === "docx" ? "Word" : "Markdown"}
    </a>
  );
}

function DocumentCard({
  preview,
  jobId,
  verifyPassed,
}: {
  preview: DocumentPreview;
  jobId: string;
  verifyPassed: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--allegro-border)] bg-white flex flex-col gap-0 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <h3 className="font-semibold text-[var(--allegro-navy)]">{preview.label}</h3>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">{preview.part_number}</p>
      </div>

      {preview.preview && (
        <div className="px-5 py-4 border-b border-gray-100">
          <pre className="text-xs text-[var(--color-muted)] leading-relaxed whitespace-pre-wrap font-sans line-clamp-5 overflow-hidden">
            {preview.preview}
          </pre>
        </div>
      )}

      <div className="px-5 py-3 flex flex-col gap-3">
        {preview.unverified_count > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-warning-text)]">
            <AlertTriangle size={12} aria-hidden="true" />
            {preview.unverified_count}{" "}
            {preview.unverified_count === 1 ? "gap" : "gaps"} for human review
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {preview.md_file && (
            <DownloadButton
              href={getDownloadUrl(jobId, preview.md_file)}
              label={`Download ${preview.label} as Markdown`}
              type="md"
            />
          )}
          {preview.docx_file && (
            <DownloadButton
              href={
                verifyPassed
                  ? getDownloadUrl(jobId, preview.docx_file)
                  : "#"
              }
              label={`Download ${preview.label} as Word document`}
              type="docx"
            />
          )}
          {preview.docx_file && !verifyPassed && (
            <p className="text-xs text-[var(--color-muted)] self-center">
              Word unavailable until verification passes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UnverifiedGapList({ gaps }: { gaps: UnverifiedGap[] }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 3;
  const shown = expanded ? gaps : gaps.slice(0, PREVIEW);

  return (
    <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-5 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-warning-text)] mb-3">
        <AlertTriangle size={14} aria-hidden="true" />
        {gaps.length} {gaps.length === 1 ? "gap" : "gaps"} flagged for human review
      </h3>
      <ul className="flex flex-col gap-2 mb-3">
        {shown.map((gap, i) => (
          <li key={i} className="flex gap-2 text-xs text-[var(--color-warning-text)]">
            <span className="flex-shrink-0 font-semibold">{gap.document}:</span>
            <span className="opacity-90">{gap.description}</span>
          </li>
        ))}
      </ul>
      {gaps.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--color-warning-text)] hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--color-warning-border)] focus:ring-offset-1 rounded"
          aria-expanded={expanded}
        >
          {expanded ? (
            <><ChevronUp size={12} aria-hidden="true" /> Show fewer</>
          ) : (
            <><ChevronDown size={12} aria-hidden="true" /> Show all {gaps.length} gaps</>
          )}
        </button>
      )}
      <p className="mt-3 text-xs text-[var(--color-warning-text)] opacity-75 border-t border-amber-200 pt-3">
        These appear as <code className="font-mono">[UNVERIFIED — needs human: …]</code> markers in your documents. They are correct, honest output — a human reviewer completes them.
      </p>
    </div>
  );
}

export function ResultsScreen({ results, jobId, onStartOver }: Props) {
  const { verify_passed, verify_tally, unverified_gaps, document_previews, demo_mode } = results;

  return (
    <div className="flex flex-col gap-6">
      {/* Verification badge — primary visual */}
      <div
        className={[
          "rounded-xl border-2 px-6 py-6 text-center",
          verify_passed
            ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)]"
            : "border-red-400 bg-red-50",
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-2">
          {verify_passed ? (
            <CheckCircle2
              size={40}
              className="text-[var(--color-success)]"
              aria-hidden="true"
            />
          ) : (
            <XCircle size={40} className="text-red-600" aria-hidden="true" />
          )}
          <p
            className={[
              "text-2xl font-bold",
              verify_passed ? "text-[var(--color-success)]" : "text-red-700",
            ].join(" ")}
          >
            {verify_passed ? "Verified" : "Needs correction"}
          </p>
          <p
            className={[
              "text-sm font-medium",
              verify_passed ? "text-[var(--color-success)]" : "text-red-600",
            ].join(" ")}
          >
            {verify_tally} — all numbers cite their datasheet source
          </p>
        </div>
      </div>

      {/* Verify FAIL message */}
      {!verify_passed && results.verify_gaps.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <h3 className="text-sm font-semibold text-red-700 mb-2">
            Untraceable claims found — download is blocked
          </h3>
          <ul className="flex flex-col gap-1.5">
            {results.verify_gaps.map((g, i) => (
              <li key={i} className="text-xs text-red-600">
                Line {g.line}: claimed <code className="font-mono">{g.claimed}</code> — datasheet says{" "}
                <code className="font-mono">{g.corrected}</code>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-red-600 border-t border-red-200 pt-3">
            Please generate again. If the issue persists, contact support.
          </p>
        </div>
      )}

      {/* Document cards */}
      {document_previews.length > 0 && (
        <div
          className={[
            "grid gap-4",
            document_previews.length > 1 ? "sm:grid-cols-2" : "grid-cols-1",
          ].join(" ")}
        >
          {document_previews.map((preview) => (
            <DocumentCard
              key={preview.label}
              preview={preview}
              jobId={jobId}
              verifyPassed={verify_passed}
            />
          ))}
        </div>
      )}

      {/* Unverified gaps */}
      {unverified_gaps.length > 0 && (
        <UnverifiedGapList gaps={unverified_gaps} />
      )}

      {/* Demo mode notice */}
      {demo_mode && (
        <p className="text-xs text-[var(--color-muted)] italic text-center border-t border-[var(--allegro-border)] pt-4">
          Demo mode: document text is pre-generated. Extraction, verification, and Word rendering ran for real.
        </p>
      )}

      {/* Start over */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onStartOver}
          className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--allegro-navy)] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
        >
          Start a new document →
        </button>
      </div>
    </div>
  );
}
