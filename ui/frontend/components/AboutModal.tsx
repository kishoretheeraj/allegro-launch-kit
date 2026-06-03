"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function AboutModal({ onClose }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="About Allegro Launch Kit"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-[var(--allegro-navy)] text-base">About Launch Kit</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">How grounding and verification work</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--allegro-navy)] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5 text-sm text-[var(--allegro-navy)]">

          <section>
            <h3 className="font-semibold mb-1.5">What it does</h3>
            <p className="text-[var(--color-muted)] leading-relaxed">
              Launch Kit converts an Allegro current-sensor datasheet PDF into cited, review-ready
              launch collateral — customer FAQ, FAE design-in checklist, and distributor product brief.
              Every number in the output is traced to a specific page and table in the datasheet.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">How grounding works</h3>
            <ol className="flex flex-col gap-2 text-[var(--color-muted)]">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--allegro-navy)] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                <span><strong className="text-[var(--allegro-navy)]">Extract</strong> — pdfplumber parses the datasheet, pulling values from formal spec tables (Min/Typ/Max). Results land in <code className="text-xs bg-gray-100 px-1 rounded">specs.json</code>.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--allegro-navy)] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                <span><strong className="text-[var(--allegro-navy)]">Generate</strong> — Claude fills document templates using only the extracted specs. Every value must come from <code className="text-xs bg-gray-100 px-1 rounded">specs.json</code> with a citation.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--allegro-orange)] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                <span><strong className="text-[var(--allegro-navy)]">Verify</strong> — every numeric claim in the output is checked against <code className="text-xs bg-gray-100 px-1 rounded">specs.json</code>. If any claim cannot be traced, the run fails. Downloads are blocked until verify passes.</span>
              </li>
            </ol>
          </section>

          <section>
            <h3 className="font-semibold mb-1.5">What <code className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">[UNVERIFIED — needs human]</code> means</h3>
            <p className="text-[var(--color-muted)] leading-relaxed">
              This marker means a field was expected but not found in any formal parameter table.
              It is <strong className="text-[var(--allegro-navy)]">correct, honest output</strong> — not an error.
              The tool refuses to guess. A human reviewer completes these gaps before publication.
            </p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Known limitations</h3>
            <table className="w-full text-xs text-[var(--color-muted)] border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 pr-3 font-semibold text-[var(--allegro-navy)]">Limitation</th>
                  <th className="text-left py-1.5 font-semibold text-[var(--allegro-navy)]">Effect</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Text-scan captures test conditions", "Low-confidence noise; all flagged for review"],
                  ["± stripped from stored value", "Magnitude only in specs.json; raw context preserved"],
                  ["Range values → max only", "Min temp bound not a standalone spec"],
                  ["Verify checks presence, not correctness", "Wrong-column value that deduplicates still passes; L3 regression catches this"],
                  ["Scanned PDFs not supported", "Extraction requires a text-layer PDF"],
                ].map(([lim, effect]) => (
                  <tr key={lim} className="border-b border-gray-100">
                    <td className="py-1.5 pr-3 font-medium text-[var(--allegro-navy)]">{lim}</td>
                    <td className="py-1.5">{effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-[var(--allegro-warm-gray)] rounded-xl px-4 py-3">
            <p className="text-xs text-[var(--color-muted)]">
              Built against the <strong className="text-[var(--allegro-navy)]">ACS37002</strong> as the development and regression target
              (208 specs extracted, 25/25 regression checks pass across 5 datasheets).
              The ACS37017 launch uses this same tested pipeline.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
