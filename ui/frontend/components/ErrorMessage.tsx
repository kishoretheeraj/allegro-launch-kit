"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
  onStartOver?: () => void;
}

export function ErrorMessage({ message, onRetry, onStartOver }: Props) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 px-5 py-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          size={16}
          className="mt-0.5 flex-shrink-0 text-red-600"
          aria-hidden="true"
        />
        <p className="text-sm text-red-700">{message}</p>
      </div>
      <div className="flex gap-4 ml-6">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded"
          >
            Try again
          </button>
        )}
        {onStartOver && (
          <button
            type="button"
            onClick={onStartOver}
            className="text-sm font-medium text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--allegro-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--allegro-orange)] focus:ring-offset-2 rounded"
          >
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
