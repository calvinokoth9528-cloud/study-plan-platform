"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface DocMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  topicId: string | null;
  topicTitle: string | null;
  createdAt: string;
  link: string;
}

const MAX_BYTES = 15 * 1024 * 1024;

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsSection({
  courseId,
  topics,
  documents,
}: {
  courseId: string;
  topics: { id: string; title: string }[];
  documents: DocMeta[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [topicId, setTopicId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function upload() {
    setError(null);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large (max 15MB).");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("courseId", courseId);
      if (topicId) body.append("topicId", topicId);
      const res = await fetch("/api/documents", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? `Upload failed (${res.status}).`);
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      startTransition(() => window.location.reload());
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    startTransition(() => window.location.reload());
  }

  return (
    <Card id="documents">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Study documents</CardTitle>
        <span className="text-xs text-text-muted">{documents.length} file{documents.length === 1 ? "" : "s"} · max 15MB</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            aria-label="Attach to topic (optional)"
          >
            <option value="">General (no topic)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpeg,.jpg,.webp,.gif,.svg,.txt,.md,.csv,.doc,.docx,.xlsx,.pptx"
            className="max-w-xs flex-1 cursor-pointer rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text-secondary file:mr-2 file:cursor-pointer file:rounded-md file:border-none file:bg-accent/10 file:px-2 file:py-1 file:text-sm file:text-accent"
          />
          <Button size="sm" onClick={upload} disabled={busy || pending}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}

        {documents.length === 0 ? (
          <p className="py-2 text-center text-sm text-text-muted">
            No documents yet. Upload lecture notes, slides, or past papers to keep them beside your plan.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <DocIcon mimeType={d.mimeType} />
                  <div className="min-w-0">
                    <a
                      href={d.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-text-primary hover:text-accent hover:underline"
                    >
                      {d.name}
                    </a>
                    <div className="text-xs text-text-muted">
                      {d.topicTitle ?? "General"} · {fmtSize(d.size)} · {formatDate(d.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <a href={d.link} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">Open</Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => remove(d.id)} aria-label={`Delete ${d.name}`}>
                    <svg className="h-4 w-4 text-text-muted hover:text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocIcon({ mimeType }: { mimeType: string }) {
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  const label = isPdf ? "PDF" : isImage ? "IMG" : mimeType.startsWith("text/") ? "TXT" : "DOC";
  return (
    <span className="flex-shrink-0 rounded-md bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
      {label}
    </span>
  );
}
