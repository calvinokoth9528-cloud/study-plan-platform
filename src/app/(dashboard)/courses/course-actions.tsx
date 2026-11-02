"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardContent, FieldGroup } from "@/components/ui";

export function CourseActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError("Course name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, examDate: examDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create course.");
      router.push("/courses/" + data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={() => setOpen((v) => !v)}>{open ? "Cancel" : "+ New course"}</Button>

      {open && (
        <Card className="mt-3 border-accent/30 shadow-md">
          <CardContent className="flex flex-col gap-4">
            <h3 className="text-base font-semibold text-text-primary">Create a course</h3>
            <FieldGroup label="Course name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bayesian Statistics" autoFocus />
            </FieldGroup>
            <div className="flex gap-4">
              <FieldGroup label="Color">
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 cursor-pointer p-1" />
              </FieldGroup>
              <FieldGroup label="Exam / deadline" hint="Optional" className="flex-1">
                <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </FieldGroup>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" isLoading={loading} onClick={handleCreate}>Create</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
