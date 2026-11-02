"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui";

export function VersionsSection({ planId, versions }: { planId: string; versions: { id: string; label: string; createdAt: string }[] }) {
  const router = useRouter();
  const [restoring, setRestoring] = useState<string | null>(null);

  async function restore(versionId: string) {
    setRestoring(versionId);
    try {
      const res = await fetch("/api/plans/" + planId + "/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Restore failed.");
      }
      router.refresh();
    } finally {
      setRestoring(null);
    }
  }

  if (versions.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Plan versions</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-text-muted">
          Major adjustments (repairs, restores) snapshot the plan first so you can always go back.
        </p>
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant="muted">{new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Badge>
              <span className="truncate text-text-primary">{v.label}</span>
            </div>
            <Button size="sm" variant="secondary" isLoading={restoring === v.id} onClick={() => restore(v.id)}>
              Restore
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
