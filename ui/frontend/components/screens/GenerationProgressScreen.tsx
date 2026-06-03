"use client";

import { Check, Loader2 } from "lucide-react";

interface StageItem {
  key: string;
  label: string;
}

const STAGES: StageItem[] = [
  { key: "templates_loaded", label: "Templates loaded" },
  { key: "generating", label: "Filling from spec table" },
  { key: "verifying", label: "Running verification check" },
  { key: "rendering_docx", label: "Rendering Word draft" },
  { key: "complete", label: "Done" },
];

function stageIndex(stage: string): number {
  const map: Record<string, number> = {
    generating: 1,
    generating_faq: 1,
    generating_checklist: 1,
    generating_demo: 1,
    verifying: 2,
    rendering_docx: 3,
    complete: 4,
  };
  return map[stage] ?? 0;
}

interface Props {
  stage: string;
  demoMode?: boolean;
}

export function GenerationProgressScreen({ stage, demoMode = false }: Props) {
  const currentIdx = stageIndex(stage);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-[var(--allegro-navy)]">
          Generating your launch documents…
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Building documents from datasheet facts only. Every number in the output was found on a specific page.
        </p>
      </div>

      {/* Stage list */}
      <div aria-live="polite" aria-label="Generation stages" className="flex flex-col gap-4">
        {STAGES.slice(0, -1).map(({ key, label }, idx) => {
          const isDone = currentIdx > idx;
          const isActive = currentIdx === idx;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {isDone ? (
                  <Check size={16} className="text-[var(--color-success)]" aria-hidden="true" />
                ) : isActive ? (
                  <Loader2 size={16} className="text-[var(--allegro-orange)] animate-spin" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden="true" />
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
                {isActive ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {demoMode && (
        <p className="text-xs text-[var(--color-muted)] italic border-t border-[var(--allegro-border)] pt-4">
          Running in demo mode — document text is pre-generated. Extraction, verification, and Word rendering run for real.
        </p>
      )}
    </div>
  );
}
