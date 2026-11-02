"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, FieldGroup, Card, CardContent, Badge, MultiSelect } from "@/components/ui";
import Link from "next/link";

interface ActivePlan {
  id: string;
  _count: { tasks: number };
}

const WEEKDAY_OPTIONS = [
  { value: "Sun", label: "Sun" },
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
];

export function GenerateSection({
  courseId,
  courseName,
  hasTopics,
  activePlan,
}: {
  courseId: string;
  courseName: string;
  hasTopics: boolean;
  activePlan: ActivePlan | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!activePlan);
  const [capacity, setCapacity] = useState(10);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [startFrom, setStartFrom] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError("");
    if (!hasTopics) {
      setError("Add at least one topic before generating a plan.");
      return;
    }
    if (parseFloat(String(capacity)) <= 0) {
      setError("Weekly capacity must be greater than 0.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          name: courseName + " plan",
          weeklyCapacityHours: parseFloat(String(capacity)),
          unavailableDays: unavailable,
          startFrom: startFrom || undefined,
          generate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate plan.");
      router.push("/plans/" + (data.plan?.id ?? data.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className={"border-l-4 " + (activePlan ? "border-l-success" : "border-l-accent/30")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-text-primary">Plan generation</h2>
              {activePlan && <Badge variant="success">Plan active</Badge>}
            </div>
            <p className="text-sm text-text-secondary">
              {activePlan
                ? "A plan is already active for this course. Generate a new one to replace it."
                : hasTopics
                ? "Set your weekly capacity, unavailable days, and generate a day-by-day plan."
                : "Add topics first, then generate a plan."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Close" : "Configure"}
            </Button>
            {activePlan && (
              <Link href={"/plans/" + activePlan.id}><Button size="sm">View plan</Button></Link>
            )}
          </div>
        </div>

        {open && (
          <div className="mt-4 flex flex-col gap-4">
            <FieldGroup label="Weekly study capacity (hours)">
              <Input type="number" min="1" max="168" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 1)} />
            </FieldGroup>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-primary">Unavailable days</label>
              <MultiSelect options={WEEKDAY_OPTIONS} value={unavailable} onChange={setUnavailable} placeholder="Select days you can't study" />
            </div>

            <FieldGroup label="Start from" hint="First scheduled day (defaults to today)">
              <Input type="date" value={startFrom} onChange={(e) => setStartFrom(e.target.value)} min={today} />
            </FieldGroup>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Done</Button>
              <Button className="flex-1" isLoading={loading} onClick={generate}>Generate plan</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
