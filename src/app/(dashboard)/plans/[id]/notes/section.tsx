"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardHeader, CardTitle, Button, Textarea, Badge,
} from "@/components/ui";

export function NotesSection({ planId }: { planId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/notes?planId=" + planId);
      if (!res.ok) throw new Error("Failed to load notes.");
      setNotes(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  useEffect(() => { load(); }, []);

  async function save(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPendingId(null);
    setError("");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, text: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save note.");
      }
      setNotes((prev) => [{ id: crypto.randomUUID(), text: trimmed, createdAt: new Date().toISOString() }, ...prev]);
      setDraft("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function update(id: string, text: string) {
    if (text === notes.find((n) => n.id === id)?.text) return;
    setPendingId(id);
    try {
      const res = await fetch("/api/notes/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update note.");
      }
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch("/api/notes/" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note.");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notes</CardTitle>
        <Badge variant="outline">Plan log</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(draft);
            }}
            placeholder="Add a note about this plan… (Ctrl+Enter to save)"
            rows={2}
            className="flex-[1_0_0]"
          />
          <Button onClick={() => save(draft)} disabled={!draft.trim()}>
            Add
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="text-xs text-text-muted">No notes yet — add one above.</p>
        ) : (
          <div className="flex flex-col gap-2 min-h-[120px] rounded-xl border border-border bg-bg-secondary/60 p-2">
            {notes.map((n, i) => (
              <div key={n.id} className="flex items-start justify-between gap-2 rounded-xl border border-border bg-background px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-text-primary">{n.text}</p>
                  <p className="mt-0.5 text-[9px] text-text-muted">
                    {new Date(n.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(n.id)}
                  aria-label="Delete note"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-text-muted">
          Notes are saved to the plan and travel with it in exports. Use them to track progress, flag
          blocks, or record what you tried when a plan drifts off-course.
        </p>
      </CardContent>
    </Card>
  );
}
