"use client";

import { Check, Loader2 } from "lucide-react";

const STAGES = [
  { key: "parsing_pdf", label: "Parsing PDF" },
  { key: "finding_tables", label: "Finding spec tables" },
  { key: "building_spec_list", label: "Building spec list" },
];

function stageIndex(stage: string) {
  return STAGES.findIndex((s) => s.key === stage);
}

interface Props {
  pdfName: string;
  pdfSizeBytes: number;
  stage: string;
  progress: number;
  onCancel: () => void;
  demoMode?: boolean;
}

export function ExtractionProgressScreen({
  pdfName,
  pdfSizeBytes,
  stage,
  progress,
  onCancel,
  demoMode = false,
}: Props) {
  const currentIdx = stageIndex(stage);
  const mb = (pdfSizeBytes / (1024 * 1024)).toFixed(1);

  if (demoMode) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-[var(--allegro-navy)]">
            Loading pre-built specs…
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Demo mode — ACS37002 pre-extracted spec table
          </p>
        </div>

        {/* Progress bar (cosmetic) */}
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Loading progress">
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--allegro-navy)] transition-all duration-500"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
              <Loader2 size={16} className="text-[var(--allegro-orange)] animate-spin" aria-hidden="true" />
            </span>
            <span className="text-sm text-[var(--allegro-navy)] font-medium">
              Loading ACS37002 spec table…
            </span>
          </div>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Live PDF parsing runs locally with <code className="font-mono bg-amber-100 px-1 rounded">DEMO_MODE=false</code>.
        </p>

        <button
          type="button"
          onClick={onCancel}
          className="self-start text-sm text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--allegro-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
        >
          Cancel and start over
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-[var(--allegro-navy)]">
          Extracting specs
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          {pdfName}
          {pdfSizeBytes > 0 && (
            <span> &mdash; {mb} MB</span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Extraction progress">
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--allegro-navy)] transition-all duration-500"
            style={{ width: `${Math.max(progress, 8)}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div
        aria-live="polite"
        aria-label="Extraction stages"
        className="flex flex-col gap-3"
      >
        {STAGES.map(({ key, label }, idx) => {
          const isDone = currentIdx > idx;
          const isActive = currentIdx === idx;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {isDone ? (
                  <Check
                    size={16}
                    className="text-[var(--color-success)]"
                    aria-hidden="true"
                  />
                ) : isActive ? (
                  <Loader2
                    size={16}
                    className="text-[var(--allegro-orange)] animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-gray-300"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={[
                  "text-sm",
                  isDone || isActive
                    ? "text-[var(--allegro-navy)] font-medium"
                    : "text-gray-400",
                ].join(" ")}
              >
                {label}
                {isDone ? "" : isActive ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="self-start text-sm text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--allegro-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
      >
        Cancel and start over
      </button>
    </div>
  );
}
