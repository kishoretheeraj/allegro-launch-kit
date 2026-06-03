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
import {
  uploadPDF,
  getJobStatus,
  getJobSummary,
  generateDocuments,
  getJobResults,
  deleteJob,
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

// ── Logo ─────────────────────────────────────────────────────────────────────
function AllegroLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Stylised "A" mark derived from Allegro's angular wordmark motif */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="28" height="28" rx="6" fill="#1C3657" />
        <path
          d="M14 5L22 22H18.5L14 11.5L9.5 22H6L14 5Z"
          fill="#F26524"
        />
        <path d="M10.5 18H17.5L18.5 21H9.5L10.5 18Z" fill="white" fillOpacity="0.9" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-xs font-semibold tracking-widest uppercase text-[var(--allegro-orange)]">
          Allegro
        </span>
        <span className="text-sm font-bold text-[var(--allegro-navy)] tracking-tight">
          Launch Kit
        </span>
      </div>
    </div>
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[var(--allegro-border)]">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <AllegroLogo />
          {step !== "upload" && step !== "uploading" && (
            <button
              type="button"
              onClick={handleStartOver}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--allegro-navy)] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
            >
              Start over
            </button>
          )}
        </div>
      </header>

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
          />
        )}

        {step === "extracting" && (
          <ExtractionProgressScreen
            pdfName={pdfName}
            pdfSizeBytes={pdfSize}
            stage={jobStage}
            progress={jobProgress}
            onCancel={handleStartOver}
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
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-[var(--color-muted)]">
            Allegro Launch Kit · Every spec cited to source
          </p>
          {demoMode && step !== "upload" && (
            <span className="text-[10px] font-semibold text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] px-2 py-0.5 rounded-full">
              Demo mode
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
