"use client";

import { useRef, useState, DragEvent, KeyboardEvent } from "react";
import { Upload } from "lucide-react";

interface Props {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

export function UploadScreen({ onUpload, isUploading = false }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files are supported. Please select a .pdf datasheet.");
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDropZoneKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  function formatSize(bytes: number) {
    const mb = bytes / (1024 * 1024);
    return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload datasheet PDF. Press Enter or Space to browse files."
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleDropZoneKey}
        onClick={() => !selectedFile && inputRef.current?.click()}
        className={[
          "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-14 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-[var(--allegro-orange)] bg-orange-50"
            : "border-gray-300 bg-white hover:border-[var(--allegro-orange)] hover:bg-orange-50/40",
          "focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="sr-only"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        {!selectedFile ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
              <Upload className="h-6 w-6 text-[var(--allegro-orange)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-medium text-[var(--allegro-navy)]">
                Drop a datasheet PDF here
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                or{" "}
                <span className="font-medium text-[var(--allegro-navy)] underline underline-offset-2">
                  click to browse
                </span>
              </p>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Accepts Allegro current-sensor datasheets (.pdf)
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Upload className="h-5 w-5 text-[var(--color-success)]" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-[var(--allegro-navy)]">{selectedFile.name}</p>
              <p className="text-sm text-[var(--color-muted)]">{formatSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--allegro-navy)]"
            >
              Choose a different file
            </button>
          </div>
        )}
      </div>

      {/* Validation error */}
      {fileError && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">
          {fileError}
        </p>
      )}

      {/* Submit CTA */}
      {selectedFile && (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => onUpload(selectedFile)}
          className="h-12 w-full rounded-lg bg-[var(--allegro-navy)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--allegro-navy-light)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2"
          aria-label={`Extract specs from ${selectedFile.name}`}
        >
          {isUploading ? "Uploading…" : "Extract specs →"}
        </button>
      )}

      {/* Trust signals */}
      <div className="rounded-xl border border-[var(--allegro-border)] bg-white px-6 py-4">
        <ul className="flex flex-col gap-2.5">
          {[
            "Every number in the output is cited to the datasheet.",
            "Anything not found is flagged for human review — never guessed.",
            "A verification check runs before any file is available to download.",
          ].map((text) => (
            <li key={text} className="flex items-start gap-2.5 text-sm text-[var(--allegro-navy)]">
              <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--allegro-orange)]" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
