"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, FieldGroup, Card, CardContent } from "@/components/ui";

export function CourseForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FieldGroup label="Course name" error={error}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bayesian Statistics" autoFocus required />
          </FieldGroup>

          <div className="flex gap-4">
            <FieldGroup label="Color">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24 cursor-pointer p-1" />
            </FieldGroup>
            <FieldGroup label="Exam / deadline" hint="Optional" className="flex-1">
              <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </FieldGroup>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">Back</Button>
            <Button type="submit" className="flex-1" isLoading={loading}>Create course</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
