"use client";

import { Check } from "lucide-react";

const STEPS = ["Upload", "Extract", "Options", "Generate"];

interface Props {
  current: number; // 1-based; 5 = complete
}

export function StepIndicator({ current }: Props) {
  return (
    <nav
      aria-label={`Step ${current} of ${STEPS.length}: ${STEPS[current - 1] ?? "Complete"}. Steps ${
        current > 1 ? `1 through ${current - 1} complete.` : "none complete yet."
      }`}
    >
      <ol className="flex items-center gap-0">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const isComplete = stepNum < current;
          const isActive = stepNum === current;
          const isFuture = stepNum > current;

          return (
            <li key={label} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    isComplete
                      ? "bg-[var(--allegro-navy)] text-white"
                      : isActive
                      ? "bg-[var(--allegro-orange)] text-white"
                      : "border-2 border-gray-300 text-gray-400 bg-white",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {isComplete ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={[
                    "text-xs font-medium hidden sm:block",
                    isComplete || isActive
                      ? "text-[var(--allegro-navy)]"
                      : "text-gray-400",
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={[
                    "h-0.5 w-12 sm:w-20 mx-1 mb-5",
                    isComplete ? "bg-[var(--allegro-navy)]" : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
