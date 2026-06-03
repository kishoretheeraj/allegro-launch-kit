"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StepIndicator } from "@/components/StepIndicator";
import { UploadScreen } from "@/components/screens/UploadScreen";
import { ExtractionProgressScreen } from "@/components/screens/ExtractionProgressScreen";
import { ExtractionResultsScreen } from "@/components/screens/ExtractionResultsScreen";
import { OptionsScreen } from "@/components/screens/OptionsScreen";
import { GenerationProgressScreen } from "@/components/screens/GenerationProgressScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AboutModal } from "@/components/AboutModal";
import {
  uploadPDF,
  getJobStatus,
  getJobSummary,
  generateDocuments,
  getJobResults,
  deleteJob,
  getAppInfo,
  type GenerateOptions,
  type SpecsSummary,
  type JobResults,
} from "@/lib/api";

// ── Step state machine ────────────────────────────────────────────────────────
type Step =
  | "upload"           // Screen 1: file picker
  | "uploading"        // in-flight upload
  | "extracting"       // extraction polling
  | "extracted"        // Screen 3: results table
  | "options"          // Screen 4: doc/format/note
  | "generating"       // generation + verify polling
  | "complete"         // Screen 6: download
  | "error";

// ── Allegro MicroSystems dot-matrix mark ─────────────────────────────────────
// Approximates the real Allegro logo mark: a circle of colorful dots arranged
// in a rainbow spectrum (warm reds/oranges top-left → blues/teals bottom-right)
function AllegroMark() {
  // 7 columns × 6 rows of colored squares, clipped to an ellipse
  const cols = [2, 9, 16, 23, 30, 37, 44];
  const rows = [2, 9, 16, 23, 30, 37];
  const palette: string[][] = [
    ["#E8002D","#EE2200","#FF5500","#FF8800","#FFCC00","#BBDD00","#77BB00"],
    ["#CC0055","#EE0033","#FF4400","#FF7700","#FFAA00","#99CC00","#44AA22"],
    ["#990099","#BB0077","#DD0044","#FF5533","#FFA833","#66BB00","#00AA44"],
    ["#6600CC","#8800BB","#AA0088","#CC0066","#EE4422","#00AABB","#00BB77"],
    ["#3300DD","#5500CC","#7700BB","#9900AA","#BB2299","#00AACC","#00CC99"],
    ["#0044EE","#2222DD","#4400CC","#6600BB","#880099","#00BBDD","#00DDBB"],
  ];

  return (
    <svg width="52" height="44" viewBox="0 0 52 44" aria-hidden="true">
      <defs>
        <clipPath id="allegro-dot-clip">
          <ellipse cx="26" cy="22" rx="23" ry="20" />
        </clipPath>
      </defs>
      <g clipPath="url(#allegro-dot-clip)">
        {rows.map((y, r) =>
          cols.map((x, c) => (
            <rect
              key={`${r}-${c}`}
              x={x} y={y}
              width="5" height="5"
              rx="0.8"
              fill={palette[r][c]}
            />
          ))
        )}
      </g>
    </svg>
  );
}

// ── Map step to stepper number ────────────────────────────────────────────────
function stepToNumber(step: Step): number {
  if (step === "upload" || step === "uploading") return 1;
  if (step === "extracting") return 2;
  if (step === "extracted" || step === "options") return 3;
  if (step === "generating" || step === "complete" || step === "error") return 4;
  return 1;
}

// ── Screen headings ───────────────────────────────────────────────────────────
const SCREEN_TITLES: Partial<Record<Step, string>> = {
  upload: "Upload your datasheet",
  uploading: "Upload your datasheet",
  extracting: "Extracting specs…",
  extracted: "Extraction results",
  options: "Choose your documents",
  generating: "Building your documents…",
  complete: "Your documents are ready",
};

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [showAbout, setShowAbout] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [pdfSize, setPdfSize] = useState(0);
  const [jobStage, setJobStage] = useState("");
  const [jobProgress, setJobProgress] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [specsSummary, setSpecsSummary] = useState<SpecsSummary | null>(null);
  const [jobResults, setJobResults] = useState<JobResults | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch demo mode status on mount so the banner shows before any upload
  useEffect(() => {
    getAppInfo().then((info) => setDemoMode(info.demo_mode)).catch(() => {});
  }, []);

  // ── Polling ────────────────────────────────────────────────────────────────

  function stopPolling() {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  const pollExtraction = useCallback(
    (id: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(id);
          setJobStage(status.stage);
          setJobProgress(status.progress);
          setDemoMode(status.demo_mode);

          if (status.stage === "extraction_complete") {
            stopPolling();
            const summary = await getJobSummary(id);
            setSpecsSummary(summary);
            setStep("extracted");
          } else if (status.stage === "extraction_failed") {
            stopPolling();
            setErrorMsg(
              status.error ??
                "Extraction failed. This may be a scanned or encrypted PDF. Try exporting a text-layer PDF from Acrobat."
            );
            setStep("error");
          }
        } catch (e) {
          stopPolling();
          setErrorMsg(
            e instanceof Error ? e.message : "Connection error. Please try again."
          );
          setStep("error");
        }
      }, 600);
    },
    []
  );

  const pollGeneration = useCallback(
    (id: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(id);
          setJobStage(status.stage);

          if (status.stage === "complete") {
            stopPolling();
            const results = await getJobResults(id);
            setJobResults(results);
            setStep("complete");
          } else if (status.stage === "generation_failed") {
            stopPolling();
            setErrorMsg(
              status.error ??
                "Document generation failed. Please try again."
            );
            setStep("error");
          }
        } catch (e) {
          stopPolling();
          setErrorMsg(
            e instanceof Error ? e.message : "Connection error during generation. Please try again."
          );
          setStep("error");
        }
      }, 700);
    },
    []
  );

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleUpload(file: File) {
    try {
      setStep("uploading");
      setPdfName(file.name);
      setPdfSize(file.size);
      const result = await uploadPDF(file);
      setJobId(result.job_id);
      setStep("extracting");
      setJobStage("parsing_pdf");
      setJobProgress(5);
      pollExtraction(result.job_id);
    } catch (e) {
      setErrorMsg(
        e instanceof Error
          ? e.message
          : "Upload failed. Please check that the backend server is running on port 8000."
      );
      setStep("error");
    }
  }

  async function handleGenerate(opts: GenerateOptions) {
    if (!jobId) return;
    try {
      setStep("generating");
      setJobStage("generating");
      await generateDocuments(jobId, opts);
      pollGeneration(jobId);
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Failed to start generation. Please try again."
      );
      setStep("error");
    }
  }

  async function handleStartOver() {
    stopPolling();
    if (jobId) {
      try {
        await deleteJob(jobId);
      } catch {
        // best-effort cleanup
      }
    }
    setJobId(null);
    setPdfName("");
    setPdfSize(0);
    setJobStage("");
    setJobProgress(0);
    setSpecsSummary(null);
    setJobResults(null);
    setErrorMsg(null);
    setStep("upload");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentStep = stepToNumber(step);
  const title = SCREEN_TITLES[step] ?? "";

  return (
    <div className="flex flex-col min-h-screen">
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {/* Allegro MicroSystems site header — white background matching allegromicro.com */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Brand: colorful dot mark + wordmark */}
          <div className="flex items-center gap-3">
            <AllegroMark />
            <div className="leading-none">
              <div className="font-black text-[20px] text-[#003F7F] tracking-wide leading-none uppercase">
                ALLEGRO
              </div>
              <div className="text-[#F26524] text-[11px] font-medium leading-none mt-0.5 tracking-[0.04em]">
                microsystems
              </div>
            </div>
            <div className="h-8 w-px bg-gray-200 mx-3 hidden sm:block" aria-hidden="true" />
            <span className="text-sm font-semibold text-[#F26524] hidden sm:inline">
              Launch Kit
            </span>
          </div>
          {/* Right: context + controls */}
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-gray-400 hidden md:inline tracking-wide uppercase font-medium">
              Internal Tools
            </span>
            {step !== "upload" && step !== "uploading" && (
              <button
                type="button"
                onClick={handleStartOver}
                className="text-xs text-gray-400 hover:text-[#003F7F] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Demo mode banner — visible on every screen, immediately on mount */}
      {demoMode && (
        <div
          className="sticky top-[57px] z-10 bg-amber-50 border-b border-amber-200"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-amber-800 font-semibold text-xs">Demo mode</span>
            <span className="text-amber-700 text-xs">
              — showing pre-built ACS37002 specs. Live PDF extraction requires running locally.
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8 flex justify-center">
          <StepIndicator current={currentStep} />
        </div>

        {/* Screen heading */}
        {title && (
          <h1 className="mb-6 text-2xl font-bold text-[var(--allegro-navy)]">
            {title}
          </h1>
        )}

        {/* Error state */}
        {step === "error" && errorMsg && (
          <ErrorMessage
            message={errorMsg}
            onRetry={() => setStep("upload")}
            onStartOver={handleStartOver}
          />
        )}

        {/* Screen routing */}
        {(step === "upload" || step === "uploading") && (
          <UploadScreen
            onUpload={handleUpload}
            isUploading={step === "uploading"}
            demoMode={demoMode}
          />
        )}

        {step === "extracting" && (
          <ExtractionProgressScreen
            pdfName={pdfName}
            pdfSizeBytes={pdfSize}
            stage={jobStage}
            progress={jobProgress}
            onCancel={handleStartOver}
            demoMode={demoMode}
          />
        )}

        {step === "extracted" && specsSummary && (
          <ExtractionResultsScreen
            summary={specsSummary}
            onContinue={() => setStep("options")}
            onBack={handleStartOver}
          />
        )}

        {step === "options" && (
          <OptionsScreen
            onGenerate={handleGenerate}
            onBack={() => setStep("extracted")}
          />
        )}

        {step === "generating" && (
          <GenerationProgressScreen
            stage={jobStage}
            demoMode={demoMode}
          />
        )}

        {step === "complete" && jobResults && jobId && (
          <ResultsScreen
            results={jobResults}
            jobId={jobId}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--allegro-border)] bg-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-[var(--color-muted)]">
              Allegro Launch Kit · Every spec cited to source
            </p>
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--allegro-navy)] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
            >
              About
            </button>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] text-[var(--color-muted)]">
              Built with ♥ by{" "}
              <span className="font-medium text-[var(--allegro-navy)]">Kishore Theeraj</span>
              {" "}· Thayer School of Engineering, Dartmouth
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
