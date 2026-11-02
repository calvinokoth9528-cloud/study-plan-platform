"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, MultiSelect, FieldGroup, Card, CardContent } from "@/components/ui";

export function PlanEditForm({
  planId, planName, weeklyCapacity, initialUnavailable, weekdays,
}: {
  planId: string; planName: string; weeklyCapacity: number; initialUnavailable: string[]; weekdays: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(planName);
  const [capacity, setCapacity] = useState(weeklyCapacity);
  const [unavailable, setUnavailable] = useState<string[]>(initialUnavailable);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setError("");
    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/plans/" + planId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), weeklyCapacityHours: capacity, unavailableDays: unavailable }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save.");
      }
      router.push("/plans/" + planId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        {error && <p className="text-sm text-danger">{error}</p>}
        <FieldGroup label="Plan name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bayesian Statistics plan" />
        </FieldGroup>
        <FieldGroup label="Weekly study capacity (hours)">
          <Input type="number" min="1" max="168" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 1)} />
        </FieldGroup>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">Unavailable days</label>
          <MultiSelect options={weekdays} value={unavailable} onChange={setUnavailable} placeholder="Select days you can't study" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => router.back()}>Cancel</Button>
          <Button className="flex-1" isLoading={loading} onClick={save}>Save changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}
