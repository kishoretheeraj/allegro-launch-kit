"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { SpecsSummary, SpecEntry } from "@/lib/api";

interface Props {
  summary: SpecsSummary;
  onContinue: () => void;
  onBack: () => void;
}

function ConfidencePill({ confidence }: { confidence: "high" | "low" | string }) {
  if (confidence === "high") {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--allegro-navy)] px-2 py-0.5 text-[10px] font-semibold text-white">
        Formal table
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-warning-text)]">
      Needs review
    </span>
  );
}

function SpecRow({ spec }: { spec: SpecEntry }) {
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <td className="py-2.5 pr-4 text-sm text-[var(--allegro-navy)] font-medium align-top">
        {spec.parameter}
      </td>
      <td className="py-2.5 pr-4 text-sm text-[var(--allegro-navy)] tabular-nums whitespace-nowrap align-top">
        {spec.value}
        {spec.unit && (
          <span className="ml-1 text-[var(--color-muted)]">{spec.unit}</span>
        )}
      </td>
      <td className="py-2.5 pr-4 text-xs text-[var(--color-cite)] align-top whitespace-nowrap">
        {spec.source}
      </td>
      <td className="py-2.5 align-top">
        <ConfidencePill confidence={spec.confidence} />
      </td>
    </tr>
  );
}

export function ExtractionResultsScreen({ summary, onContinue, onBack }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [showLowConf, setShowLowConf] = useState(false);

  const specsToShow = showAll ? summary.all_specs : summary.sample_specs;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary card */}
      <div className="rounded-xl border border-[var(--allegro-border)] bg-white px-6 py-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-[var(--allegro-navy)]">
            {summary.total} specs extracted
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            from {summary.pdf_name}
          </p>
        </div>
        <div className="mt-4 flex gap-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[var(--allegro-navy)]">
              {summary.high_conf}
            </span>
            <span className="text-sm text-[var(--color-muted)]">
              from formal tables{" "}
              <span className="hidden sm:inline text-[10px] font-medium text-[var(--allegro-navy)] bg-blue-50 rounded px-1.5 py-0.5">
                ready to use
              </span>
            </span>
          </div>
          {summary.low_conf > 0 && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[var(--color-warning-text)]">
                {summary.low_conf}
              </span>
              <span className="text-sm text-[var(--color-muted)]">
                from running text{" "}
                <span className="hidden sm:inline text-[10px] font-medium text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] rounded px-1.5 py-0.5">
                  flagged for review
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Spec table */}
      <div className="rounded-xl border border-[var(--allegro-border)] bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[var(--allegro-navy)]">
            {showAll ? `All ${summary.total} extracted specs` : "Sample specs — from formal tables"}
          </h3>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            The verification step will check every number in your output against this list.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Extracted specs">
            <caption className="sr-only">
              Specs extracted from {summary.pdf_name}. Columns: parameter, value, source page, confidence.
            </caption>
            <thead>
              <tr className="border-b border-gray-100">
                <th scope="col" className="px-6 py-2.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  Parameter
                </th>
                <th scope="col" className="pr-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  Value
                </th>
                <th scope="col" className="pr-4 py-2.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  Source
                </th>
                <th scope="col" className="pr-6 py-2.5 text-left text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="px-6">
              {specsToShow.map((spec, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-2.5 pr-4 text-sm text-[var(--allegro-navy)] font-medium align-top">
                    {spec.parameter}
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-[var(--allegro-navy)] tabular-nums whitespace-nowrap align-top">
                    {spec.value}
                    {spec.unit && (
                      <span className="ml-1 text-[var(--color-muted)]">{spec.unit}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-[var(--color-cite)] align-top whitespace-nowrap">
                    {spec.source}
                  </td>
                  <td className="py-2.5 pr-6 align-top">
                    <ConfidencePill confidence={spec.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary.total > summary.sample_specs.length && (
          <div className="px-6 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--allegro-navy)] hover:text-[var(--allegro-navy-light)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-1 rounded"
              aria-expanded={showAll}
            >
              {showAll ? (
                <>
                  <ChevronUp size={14} aria-hidden="true" />
                  Show summary only
                </>
              ) : (
                <>
                  <ChevronDown size={14} aria-hidden="true" />
                  Show all {summary.total} specs
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Low-confidence warning */}
      {summary.low_conf > 0 && (
        <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] px-5 py-4">
          <button
            type="button"
            onClick={() => setShowLowConf((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-warning-border)] focus:ring-offset-1 rounded"
            aria-expanded={showLowConf}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                size={16}
                className="mt-0.5 flex-shrink-0 text-[var(--color-warning-text)]"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--color-warning-text)]">
                  {summary.low_conf} entries extracted from running text
                </p>
                <p className="text-xs text-[var(--color-warning-text)] mt-0.5 opacity-80">
                  These will be flagged for human review in your output. The verification step checks them automatically.
                </p>
              </div>
            </div>
            {showLowConf ? (
              <ChevronUp size={14} className="flex-shrink-0 text-[var(--color-warning-text)]" aria-hidden="true" />
            ) : (
              <ChevronDown size={14} className="flex-shrink-0 text-[var(--color-warning-text)]" aria-hidden="true" />
            )}
          </button>

          {showLowConf && summary.low_conf_preview.length > 0 && (
            <div className="mt-3 ml-6">
              <ul className="flex flex-col gap-1">
                {summary.low_conf_preview.map((s, i) => (
                  <li key={i} className="text-xs text-[var(--color-warning-text)]">
                    <span className="font-medium">{s.parameter}</span>
                    {" — "}
                    {s.value} {s.unit}
                    {s.source && (
                      <span className="ml-1 opacity-70">[{s.source}]</span>
                    )}
                  </li>
                ))}
                {summary.low_conf > summary.low_conf_preview.length && (
                  <li className="text-xs text-[var(--color-warning-text)] opacity-70">
                    … and {summary.low_conf - summary.low_conf_preview.length} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--allegro-navy)] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
        >
          ← Upload a different datasheet
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="h-11 rounded-lg bg-[var(--allegro-navy)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--allegro-navy-light)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
        >
          Continue to options →
        </button>
      </div>
    </div>
  );
}
