"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import type { GenerateOptions } from "@/lib/api";

interface Props {
  onGenerate: (opts: GenerateOptions) => void;
  onBack: () => void;
  isGenerating?: boolean;
}

type DocOption = "faq" | "checklist" | "product_brief" | "both" | "all";
type FormatOption = "markdown" | "docx" | "both";

// Team → documents mapping
const TEAM_MAP: Record<string, { documents: DocOption; label: string; description: string }> = {
  marketing: {
    documents: "faq",
    label: "Marketing / Communications",
    description: "Customer FAQ — answers distributors and customers ask",
  },
  fae: {
    documents: "checklist",
    label: "Field Applications Engineering",
    description: "Design-in checklist — confirms the part fits a customer's design",
  },
  sales: {
    documents: "product_brief",
    label: "Sales / Distribution",
    description: "Product brief — one-page spec summary for distributors and reps",
  },
  launch: {
    documents: "all",
    label: "Full Product Launch",
    description: "All three documents — FAQ, checklist, and product brief (recommended)",
  },
};

function ChoiceButton({
  selected,
  onClick,
  label,
  description,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={[
        "w-full flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2",
        selected
          ? "border-[var(--allegro-orange)] bg-orange-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors",
          selected
            ? "border-[var(--allegro-orange)] bg-[var(--allegro-orange)]"
            : "border-gray-300 bg-white",
        ].join(" ")}
        aria-hidden="true"
      >
        {selected && (
          <span className="block h-full w-full rounded-full scale-[0.4] bg-white" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[var(--allegro-navy)]">{label}</p>
          {badge && (
            <span className="text-[10px] font-semibold bg-[var(--allegro-navy)] text-white px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</p>
        )}
      </div>
    </button>
  );
}

export function OptionsScreen({ onGenerate, onBack, isGenerating = false }: Props) {
  const [team, setTeam] = useState<string>("launch");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedDocs, setAdvancedDocs] = useState<DocOption>("all");
  const [format, setFormat] = useState<FormatOption>("both");
  const [audienceNote, setAudienceNote] = useState("");

  const MAX_NOTE = 200;

  const documents = advancedOpen ? advancedDocs : (TEAM_MAP[team]?.documents ?? "all");

  function handleSubmit() {
    onGenerate({ documents, format, audience_note: audienceNote.trim() });
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="text-xl font-semibold text-[var(--allegro-navy)]">
          Who needs these documents?
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          We&apos;ll generate the right documents for your team automatically.
        </p>
      </div>

      {/* Team-based picker */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--allegro-navy)] mb-2.5">
          Team
        </legend>
        <div role="radiogroup" aria-label="Team" className="flex flex-col gap-2">
          {Object.entries(TEAM_MAP).map(([key, cfg]) => (
            <ChoiceButton
              key={key}
              selected={!advancedOpen && team === key}
              onClick={() => { setTeam(key); setAdvancedOpen(false); }}
              label={cfg.label}
              description={cfg.description}
              badge={key === "launch" ? "Recommended" : undefined}
            />
          ))}
        </div>

        {/* Advanced: custom document selection */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--allegro-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-1 rounded"
          aria-expanded={advancedOpen}
        >
          {advancedOpen ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          {advancedOpen ? "Hide custom selection" : "Choose specific documents instead"}
        </button>

        {advancedOpen && (
          <div className="mt-3 pl-3 border-l-2 border-gray-200 flex flex-col gap-2">
            {([
              ["faq", "Customer FAQ", "answers customers and distributors ask"],
              ["checklist", "Design-in Checklist", "for field engineers reviewing a design"],
              ["product_brief", "Product Brief", "one-page summary for sales and distribution"],
              ["both", "FAQ + Checklist", "standard two-doc set"],
              ["all", "All three documents", "FAQ, checklist, and product brief"],
            ] as [DocOption, string, string][]).map(([val, label, desc]) => (
              <ChoiceButton
                key={val}
                selected={advancedDocs === val}
                onClick={() => setAdvancedDocs(val)}
                label={label}
                description={desc}
              />
            ))}
          </div>
        )}
      </fieldset>

      {/* Format */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--allegro-navy)] mb-2.5">
          Format
        </legend>
        <div role="radiogroup" aria-label="Output format" className="flex flex-col gap-2">
          <ChoiceButton
            selected={format === "markdown"}
            onClick={() => setFormat("markdown")}
            label="Cited Markdown"
            description="Plain text with inline citations — easy to edit in any tool"
          />
          <ChoiceButton
            selected={format === "docx"}
            onClick={() => setFormat("docx")}
            label="Word draft (.docx)"
            description="Formatted document with headings, tables, and highlighted gaps"
          />
          <ChoiceButton
            selected={format === "both"}
            onClick={() => setFormat("both")}
            label="Both"
          />
        </div>
      </fieldset>

      {/* Audience note */}
      <fieldset>
        <legend className="text-sm font-semibold text-[var(--allegro-navy)] mb-2.5">
          Audience note{" "}
          <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        </legend>
        <textarea
          value={audienceNote}
          onChange={(e) => setAudienceNote(e.target.value.slice(0, MAX_NOTE))}
          placeholder="e.g. Emphasize automotive qualification"
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-[var(--allegro-navy)] placeholder:text-gray-400 focus:border-[var(--allegro-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-1 resize-none"
          aria-describedby="note-hint note-count"
          maxLength={MAX_NOTE}
        />
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <p id="note-hint" className="flex items-start gap-1.5 text-xs text-[var(--color-muted)]">
            <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            This affects phrasing only — not specs. Numbers always come from the datasheet.
          </p>
          <span id="note-count" className="text-xs text-[var(--color-muted)] whitespace-nowrap tabular-nums">
            {audienceNote.length} / {MAX_NOTE}
          </span>
        </div>
      </fieldset>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--allegro-navy)] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
          disabled={isGenerating}
        >
          ← Back to extraction results
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isGenerating}
          className="h-11 rounded-lg bg-[var(--allegro-navy)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--allegro-navy-light)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
        >
          {isGenerating ? "Starting…" : "Generate documents →"}
        </button>
      </div>
    </div>
  );
}
