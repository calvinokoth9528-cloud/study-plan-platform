"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, FieldGroup, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";

interface Topic {
  id: string;
  title: string;
  estimatedHours: number;
  sortOrder: number;
  notes?: string | null;
}

export function TopicSection({ courseId, topics, initialOpen = false }: { courseId: string; topics: Topic[]; initialOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [mode, setMode] = useState<"manual" | "llm" | "csv">("manual");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [csv, setCsv] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [llmDisabled, setLlmDisabled] = useState(false);
  const [llmResult, setLlmResult] = useState<{ topics: { title: string; estimatedHours: number }[] } | null>(null);

  async function addManual() {
    setError("");
    if (!title.trim()) { setError("Topic title is required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, title: title.trim(), estimatedHours: parseFloat(String(hours)) || 1, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add topic.");
      setTitle(""); setHours(1); setNotes("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function requestLlm() {
    setError("");
    if (!syllabusText.trim()) { setError("Paste syllabus text to generate topics."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/topics/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusText: syllabusText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Topic breakdown failed.");
      if (data.disabled) {
        setLlmDisabled(true);
        setError("LLM topic breakdown is disabled (no API key). Add topics manually or import CSV.");
        return;
      }
      setLlmResult(data as { topics: { title: string; estimatedHours: number }[] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function importFromLlm() {
    if (!llmResult || !llmResult.topics.length) return;
    setError("");
    setLoading(true);
    try {
      for (const t of llmResult.topics) {
        const res = await fetch("/api/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, title: t.title, estimatedHours: t.estimatedHours }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to import topic.");
        }
      }
      setLlmResult(null);
      setSyllabusText("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function importCsv() {
    setError("");
    if (!csv.trim()) { setError("Paste CSV content to import."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/topics/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, csv: csv.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "CSV import failed.");
      setCsv("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const manualForm = (
    <div className="flex flex-col gap-3">
      <FieldGroup label="Topic title" hint="e.g. Conjugate priors">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Topic title" autoFocus />
      </FieldGroup>
      <div className="flex gap-3">
        <FieldGroup label="Est. hours">
          <Input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(parseFloat(e.target.value) || 1)} />
        </FieldGroup>
        <FieldGroup label="Notes" className="flex-1">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </FieldGroup>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button className="flex-1" isLoading={loading} onClick={addManual}>Add topic</Button>
      </div>
    </div>
  );

  const llmForm = (
    <div className="flex flex-col gap-3">
      <Textarea
        value={syllabusText}
        onChange={(e) => setSyllabusText(e.target.value)}
        label="Syllabus text"
        hint="Paste the syllabus, course description, or list of units. The LLM suggests topics with hour estimates."
      />
      {llmDisabled && (
        <p className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-sm text-warning">
          LLM topic breakdown is disabled. Set OPENAI_API_KEY, or add topics manually / import a CSV.
        </p>
      )}
      {llmResult && (
        <div className="rounded-lg border border-border bg-bg-secondary p-3">
          <p className="mb-2 text-xs text-text-muted">Suggested topics ({llmResult.topics.length})</p>
          <div className="flex flex-col gap-1.5">
            {llmResult.topics.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{t.title}</span>
                <Badge variant="muted">{t.estimatedHours}h</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button className="flex-1" isLoading={loading} onClick={requestLlm}>Generate topics</Button>
        {llmResult && llmResult.topics.length > 0 && (
          <Button className="flex-1" isLoading={loading} onClick={importFromLlm}>Import all</Button>
        )}
      </div>
    </div>
  );

  const csvForm = (
    <div className="flex flex-col gap-3">
      <Textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        label="CSV content"
        hint="One topic per line. Optionally: title, hours. e.g. Conjugate priors, 3"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
        <Button className="flex-1" isLoading={loading} onClick={importCsv}>Import topics</Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle>Topics</CardTitle>
          <Badge variant="muted">{topics.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {open ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button variant={mode === "manual" ? "default" : "secondary"} size="sm" onClick={() => setMode("manual")}>Add manually</Button>
              <Button variant={mode === "llm" ? "default" : "secondary"} size="sm" onClick={() => setMode("llm")}>LLM breakdown</Button>
              <Button variant={mode === "csv" ? "default" : "secondary"} size="sm" onClick={() => setMode("csv")}>Import CSV</Button>
            </div>
            {mode === "manual" && manualForm}
            {mode === "llm" && llmForm}
            {mode === "csv" && csvForm}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {topics.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-text-muted">No topics yet. Add topics manually, use LLM breakdown, or import a CSV.</p>
                <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>+ Add topics</Button>
              </div>
            ) : (
              topics.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-right text-text-muted">{i + 1}.</span>
                    <span className="truncate text-text-primary">{t.title}</span>
                  </div>
                  <span className="flex-shrink-0 text-text-secondary">{t.estimatedHours}h</span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
