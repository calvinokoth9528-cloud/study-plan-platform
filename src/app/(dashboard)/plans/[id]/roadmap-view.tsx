import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

interface Task {
  id: string;
  topicId: string;
  scheduledDate: string;
  scheduledHours: number;
  isReview: boolean;
  reviewDueDate?: string;
  status: string;
  actualHours?: number;
  confidence?: number;
  locked: boolean;
  sortOrder: number;
}

export function RoadmapView({ tasks, topicTitles, courseColor }: { tasks: Task[]; topicTitles: Record<string, string>; courseColor: string }) {
  const topics = Object.entries(
    tasks.reduce((acc, t) => {
      const entry = acc[t.topicId] ?? { title: topicTitles[t.topicId] ?? t.topicId, scheduled: 0, actual: 0, doneCount: 0, count: 0 };
      entry.scheduled += t.scheduledHours;
      entry.actual += t.actualHours ?? 0;
      if (t.status === "done") entry.doneCount++;
      entry.count++;
      acc[t.topicId] = entry;
      return acc;
    }, {} as Record<string, { title: string; scheduled: number; actual: number; doneCount: number; count: number }>)
  );

  const totalDone = tasks.filter((t) => t.status === "done").length;
  const completionPct = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Roadmap</CardTitle>
        <div className="text-right">
          <div className="text-sm font-medium text-text-primary">{completionPct}% complete</div>
          <div className="text-xs text-text-muted">{totalDone}/{tasks.length} tasks</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-tertiary">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: completionPct + "%" }} />
        </div>

        {topics.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">No topics in this plan.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {topics.map(([topicId, t]) => {
              const pct = t.count > 0 ? Math.round((t.doneCount / t.count) * 100) : 0;
              return (
                <div key={topicId} className="rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: courseColor }} />
                      <span className="truncate text-sm font-medium text-text-primary">{t.title}</span>
                    </div>
                    <div className="ml-2 flex-shrink-0 text-xs text-text-muted">
                      {t.doneCount}/{t.count} · {t.scheduled.toFixed(1)}h planned{t.actual > 0 ? " · " + t.actual.toFixed(1) + "h logged" : ""}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
                    <div className="h-full rounded-full bg-success transition-all" style={{ width: pct + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
