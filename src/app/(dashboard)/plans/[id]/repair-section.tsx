"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, FieldGroup, Select, Input } from "@/components/ui";
import type { PlanTaskOutput, PlanDiff, PlanMetrics } from "@/lib/scheduling/types";

interface Proposal {
  label: string;
  description: string;
  tasks: PlanTaskOutput[];
  diff: PlanDiff;
  metrics: PlanMetrics;
}

export function RepairSection({ planId }: { planId: string }) {
  const router = useRouter();
  const [computing, setComputing] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [strategy, setStrategy] = useState<"minimal" | "rebalance">("minimal");
  const [horizon, setHorizon] = useState(60);
  const [error, setError] = useState("");

  async function compute() {
    setError("");
    setComputing(true);
    try {
      const res = await fetch("/api/plans/" + planId + "/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy, horizonDays: horizon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Repair computation failed.");
      setProposal(data as Proposal);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setComputing(false);
    }
  }

  async function applyProposal() {
    if (!proposal) return;
    setComputing(true);
    try {
      const res = await fetch("/api/plans/" + planId + "/apply-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: proposal.tasks, label: proposal.label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to apply repair.");
      setProposal(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setComputing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schedule repair</CardTitle>
        {proposal && <Badge variant="warning">Proposal ready</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!proposal ? (
          <>
            <p className="text-sm text-text-secondary">
              When your plan drifts from reality, repair it here. The system suggests minimal changes and shows a diff before applying.
            </p>
            <div className="flex flex-wrap gap-3">
              <FieldGroup label="Strategy" className="w-64">
                <Select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as "minimal" | "rebalance")}
                  options={[
                    { value: "minimal", label: "Minimal (preserve as much as possible)" },
                    { value: "rebalance", label: "Rebalance (smooth overloaded days)" },
                  ]}
                />
              </FieldGroup>
              <FieldGroup label="Look-ahead (days)" className="w-40">
                <Input type="number" min="7" max="180" value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value, 10) || 60)} />
              </FieldGroup>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button isLoading={computing} onClick={compute} className="w-fit">Compute repair</Button>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{proposal.label}</p>
              <p className="mt-1 text-xs text-text-muted">{proposal.description}</p>
              <div className="mt-2 flex gap-4 text-xs text-text-secondary">
                <span>
                  {proposal.metrics.daysUsed} days used · {proposal.metrics.totalTopicHours.toFixed(1)}h topics · {proposal.metrics.totalReviewHours.toFixed(1)}h reviews
                </span>
                {proposal.metrics.overloadDays.length > 0 && (
                  <span className="text-warning">{proposal.metrics.overloadDays.length} overloaded days</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-3">
                <p className="mb-1 text-xs text-text-muted">Moved tasks</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{proposal.diff.movedTasks.length}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-3">
                <p className="mb-1 text-xs text-text-muted">Added tasks</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{proposal.diff.addedTasks.length}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-3">
                <p className="mb-1 text-xs text-text-muted">Protected tasks</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">{proposal.diff.protectedTasks.length}</p>
              </div>
            </div>

            {proposal.diff.movedTasks.length > 0 && (
              <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-3">
                <p className="mb-2 text-xs font-medium text-text-secondary">Task moves</p>
                <div className="flex max-h-48 flex-col gap-1 overflow-auto text-xs">
                  {proposal.diff.movedTasks.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-text-secondary">
                      <span className="font-mono">{m.from.slice(0, 10)}</span>
                      <span>→</span>
                      <span className="font-mono">{m.to.slice(0, 10)}</span>
                      <span>· {m.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proposal.diff.conflictNotes.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="mb-1 text-xs font-medium text-warning">Notes</p>
                <ul className="list-inside list-disc space-y-1 text-xs text-text-secondary">
                  {proposal.diff.conflictNotes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setProposal(null)}>Cancel</Button>
              <Button className="flex-1" isLoading={computing} onClick={applyProposal}>Apply repair</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
