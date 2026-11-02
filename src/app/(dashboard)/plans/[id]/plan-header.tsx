import { Card, CardContent, Button, Badge } from "@/components/ui";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export function PlanHeader({
  planId, planName, planStatus, generatedAt, taskCount, courseName, courseColor,
  completionPct, totalHours, doneHours, doneCount,
}: {
  planId: string; planName: string; planStatus: string; generatedAt: string; taskCount: number;
  courseName: string; courseColor: string;
  completionPct: number; totalHours: number; doneHours: number; doneCount: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: courseColor }} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold text-text-primary">{planName}</h1>
                <Badge variant={planStatus === "active" ? "success" : "muted"}>{planStatus}</Badge>
              </div>
              <p className="text-sm text-text-muted">
                {courseName} · generated {formatDate(generatedAt, { month: "short", day: "numeric", hour: "numeric" })} · {taskCount} tasks
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={"/plans/" + planId + "/edit"}>
              <Button variant="secondary" size="sm">Edit plan</Button>
            </Link>
            <a href={"/api/export/ics?planId=" + planId}>
              <Button variant="secondary" size="sm">Export ICS</Button>
            </a>
            <a href={"/api/export?planId=" + planId}>
              <Button variant="secondary" size="sm">Export CSV</Button>
            </a>
            <Link href="/calendar">
              <Button size="sm">Calendar</Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-bg-secondary p-3">
            <div className="mb-1 text-xs text-text-muted">Completion</div>
            <div className="text-2xl font-semibold text-text-primary">{completionPct}%</div>
            <div className="text-xs text-text-muted">{doneCount} of {taskCount} tasks</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-secondary p-3">
            <div className="mb-1 text-xs text-text-muted">Scheduled hours</div>
            <div className="text-2xl font-semibold text-text-primary">{totalHours.toFixed(1)}h</div>
            <div className="text-xs text-text-muted">across all tasks</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-secondary p-3">
            <div className="mb-1 text-xs text-text-muted">Hours logged</div>
            <div className="text-2xl font-semibold text-text-primary">{doneHours.toFixed(1)}h</div>
            <div className="text-xs text-text-muted">actual study time</div>
          </div>
          <div className="rounded-lg border border-border bg-bg-secondary p-3">
            <div className="mb-1 text-xs text-text-muted">Exports</div>
            <div className="text-xs text-text-secondary">ICS for calendar apps · CSV for spreadsheets</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
