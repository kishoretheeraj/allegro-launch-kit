// Empty string → relative paths, which work when frontend and backend share a domain.
// Set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local for local dev.
const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface UploadResult {
  job_id: string;
  filename: string;
  size_bytes: number;
}

export interface JobStatus {
  job_id: string;
  stage: string;
  progress: number;
  error: string | null;
  demo_mode: boolean;
}

export interface SpecEntry {
  parameter: string;
  value: string;
  unit: string;
  source: string;
  confidence: "high" | "low";
}

export interface SpecsSummary {
  pdf_name: string;
  total: number;
  high_conf: number;
  low_conf: number;
  sample_specs: SpecEntry[];
  all_specs: SpecEntry[];
  low_conf_preview: SpecEntry[];
}

export interface GenerateOptions {
  documents: "faq" | "checklist" | "both";
  format: "markdown" | "docx" | "both";
  audience_note: string;
}

export interface DocumentPreview {
  label: string;
  part_number: string;
  preview: string;
  unverified_count: number;
  md_file: string | null;
  docx_file: string | null;
}

export interface VerifyGap {
  line: number;
  claimed: string;
  corrected: string;
}

export interface UnverifiedGap {
  document: string;
  description: string;
}

export interface JobResults {
  job_id: string;
  verify_passed: boolean;
  verify_tally: string;
  verify_gaps: VerifyGap[];
  unverified_gaps: UnverifiedGap[];
  document_previews: DocumentPreview[];
  available_files: string[];
  demo_mode: boolean;
}

async function _req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function uploadPDF(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return _req<UploadResult>("/api/upload", { method: "POST", body: form });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return _req<JobStatus>(`/api/jobs/${jobId}/status`);
}

export async function getJobSummary(jobId: string): Promise<SpecsSummary> {
  return _req<SpecsSummary>(`/api/jobs/${jobId}/summary`);
}

export async function generateDocuments(
  jobId: string,
  opts: GenerateOptions
): Promise<{ job_id: string; status: string; demo_mode: boolean }> {
  return _req(`/api/jobs/${jobId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

export async function getJobResults(jobId: string): Promise<JobResults> {
  return _req<JobResults>(`/api/jobs/${jobId}/results`);
}

export function getDownloadUrl(jobId: string, filename: string): string {
  return `${BASE}/api/jobs/${jobId}/download/${encodeURIComponent(filename)}`;
}

export async function deleteJob(jobId: string): Promise<void> {
  await _req(`/api/jobs/${jobId}`, { method: "DELETE" });
}
