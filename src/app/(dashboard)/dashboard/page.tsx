import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import Link from "next/link";
import { DonutChart } from "@/components/charts";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-4">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-3xl font-semibold" style={{ color }}>{value}</span>
        {sub && <span className="text-xs text-text-muted">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function confidenceLabel(v: number): string {
  if (v <= 1) return "Unsure";
  if (v <= 2) return "Foggy";
  if (v <= 3) return "Okay";
  if (v <= 4) return "Solid";
  return "Locked in";
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [courses, activePlans, recentSessions] = await Promise.all([
    prisma.course.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { topics: { select: { id: true, estimatedHours: true } } },
    }),
    prisma.plan.findMany({
      where: { userId: user.id, status: "active" },
      orderBy: { generatedAt: "desc" },
      include: { course: { select: { id: true, name: true, color: true } }, tasks: { select: { status: true, scheduledHours: true, actualHours: true } } },
    }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 8,
      include: { task: { include: { topic: { include: { course: { select: { id: true, name: true, color: true } } } } } } },
    }),
  ]);

  const totalEstimatedHours = courses.reduce((s, c) => s + c.topics.reduce((t, tp) => t + tp.estimatedHours, 0), 0);
  const allSessions = await prisma.session.aggregate({ where: { userId: user.id }, _sum: { actualHours: true } });
  const loggedFromSessions = allSessions._sum.actualHours ?? 0;
  const activePlansCount = activePlans.length;

  const chartData = courses.map((c) => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name,
    value: c.topics.reduce((t, tp) => t + tp.estimatedHours, 0),
  }));
  const courseColors: Record<string, string> = {};
  courses.forEach((c) => {
    courseColors[c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name] = c.color;
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
            <p className="mt-1 text-sm text-text-secondary">Welcome back, {user.name ?? user.email}.</p>
          </div>
          <Link href="/courses"><Button>New plan</Button></Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total est. hours" value={totalEstimatedHours.toFixed(1)} sub="across all courses" color="#6366f1" />
          <StatCard label="Hours logged" value={loggedFromSessions.toFixed(1)} sub="study time recorded" color="#10b981" />
          <StatCard label="Active plans" value={activePlansCount} sub="in progress" color="#f59e0b" />
          <StatCard label="Courses" value={courses.length} sub="on your list" color="var(--text-primary)" />
        </div>

        <Card>
          <CardHeader><CardTitle>Study distribution</CardTitle></CardHeader>
          <CardContent>
            {chartData.length ? (
              <DonutChart data={chartData} colors={courseColors} />
            ) : (
              <p className="py-4 text-center text-sm text-text-muted">Add courses and topics to see your study distribution.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent sessions</CardTitle>
            <Link href="/analytics" className="text-sm text-accent hover:underline">View analytics</Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentSessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">No study sessions yet. Start from your plan.</p>
            ) : (
              recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: s.task?.topic?.course?.color ?? "#94a3b8" }} />
                    <span className="truncate text-sm font-medium text-text-primary">{s.task?.topic?.title ?? "Task"}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {s.actualHours != null && <span className="text-sm text-text-secondary">{s.actualHours.toFixed(2)}h</span>}
                    {s.confidence != null && <Badge variant="muted">{confidenceLabel(s.confidence)}</Badge>}
                    <span className="text-xs text-text-muted">{formatDate(s.startedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent courses</CardTitle>
            <Link href="/courses" className="text-sm text-accent hover:underline">Manage courses</Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {courses.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">No courses yet. Create your first course to start planning.</p>
            ) : (
              courses.map((c) => (
                <Link key={c.id} href={"/courses/" + c.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm transition-colors hover:bg-bg-tertiary">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-text-primary">{c.name}</span>
                  </div>
                  <Badge variant="muted">{c.topics.length} topic{c.topics.length === 1 ? "" : "s"}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
