import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { DonutChart, BarChart } from "@/components/charts";
import Link from "next/link";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireAuth();

  const [sessionAgg, recentSessions, courses] = await Promise.all([
    prisma.session.aggregate({ where: { userId: user.id }, _sum: { actualHours: true }, _count: { _all: true } }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 60,
      include: { task: { include: { topic: { include: { course: { select: { id: true, name: true, color: true } } } } } } },
    }),
    prisma.course.findMany({
      where: { userId: user.id },
      include: { topics: { select: { estimatedHours: true } }, plans: { where: { status: "active" }, include: { tasks: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const totalLogged = sessionAgg._sum.actualHours ?? 0;
  const totalSessions = sessionAgg._count._all;

  const perCourse = courses.map((c) => {
    let totalActual = 0;
    let totalCompleted = 0;
    let totalTasks = 0;
    for (const p of c.plans) {
      totalTasks += p.tasks.length;
      totalCompleted += p.tasks.filter((t) => t.status === "done").length;
      totalActual += p.tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);
    }
    return {
      name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
      color: c.color,
      estimated: c.topics.reduce((s, t) => s + t.estimatedHours, 0),
      actual: totalActual,
      completed: totalCompleted,
      total: totalTasks,
    };
  });

  const weeklyData = computeWeeklyHours(recentSessions);

  const topTopics = Object.entries(
    recentSessions.reduce((acc, s) => {
      const topic = s.task?.topic;
      if (!topic) return acc;
      const key = topic.title;
      acc[key] = acc[key] ?? { title: key, hours: 0, color: topic.course?.color ?? "#94a3b8" };
      acc[key].hours += s.actualHours ?? 0;
      return acc;
    }, {} as Record<string, { title: string; hours: number; color: string }>)
  )
    .map(([, v]) => v)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
            <p className="mt-1 text-sm text-text-secondary">Track your study time, completion, and focus topics.</p>
          </div>
          <Link href="/courses"><Button variant="secondary" size="sm">Manage courses</Button></Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 text-xs text-text-muted">Sessions logged</div>
              <div className="text-2xl font-semibold text-text-primary">{totalSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 text-xs text-text-muted">Hours logged</div>
              <div className="text-2xl font-semibold text-text-primary">{totalLogged.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 text-xs text-text-muted">Courses</div>
              <div className="text-2xl font-semibold text-text-primary">{courses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="mb-1 text-xs text-text-muted">Avg per session</div>
              <div className="text-2xl font-semibold text-text-primary">
                {totalSessions > 0 ? (totalLogged / totalSessions).toFixed(2) + "h" : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Weekly study hours</CardTitle></CardHeader>
            <CardContent>
              {weeklyData.length ? (
                <BarChart data={weeklyData} />
              ) : (
                <p className="py-6 text-center text-sm text-text-muted">No session data yet. Log sessions to see your weekly trend.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Hours logged by course</CardTitle></CardHeader>
            <CardContent>
              {perCourse.some((c) => c.actual > 0) ? (
                <DonutChart
                  data={perCourse.map((c) => ({ name: c.name, value: c.actual }))}
                  colors={Object.fromEntries(perCourse.map((c) => [c.name, c.color]))}
                />
              ) : (
                <p className="py-6 text-center text-sm text-text-muted">No logged hours yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Top topics by hours</CardTitle></CardHeader>
          <CardContent>
            {topTopics.length ? (
              <div className="flex flex-col gap-2">
                {topTopics.map((t) => (
                  <div key={t.title} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="truncate text-sm text-text-primary">{t.title}</span>
                    </div>
                    <div className="ml-2 flex-shrink-0 text-sm font-medium text-text-primary">{t.hours.toFixed(2)}h</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-text-muted">No session data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function computeWeeklyHours(sessions: { startedAt: Date; actualHours: number | null }[]): { label: string; hours: number }[] {
  const map = new Map<string, number>();
  const sorted = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  for (const s of sorted) {
    const d = new Date(s.startedAt);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const key = startOfWeek.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + (s.actualHours ?? 0));
  }
  return [...map.entries()].map(([date, hours]) => ({
    label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hours,
  }));
}
