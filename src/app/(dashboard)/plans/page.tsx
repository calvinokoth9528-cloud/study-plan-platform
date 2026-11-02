import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Plans" };

export default async function PlansPage() {
  const user = await requireAuth();

  const [activePlans, archivedPlans] = await Promise.all([
    prisma.plan.findMany({
      where: { userId: user.id, status: "active" },
      include: {
        course: { select: { id: true, name: true, color: true } },
        tasks: { select: { status: true, scheduledHours: true, actualHours: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { userId: user.id, status: "archived" },
      include: { course: { select: { id: true, name: true, color: true } }, _count: { select: { tasks: true } } },
      orderBy: { generatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Plans</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Each course can have one active plan. Older plans are archived automatically.
          </p>
        </div>

        {activePlans.length === 0 && archivedPlans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-sm text-text-muted">No plans yet. Create a course, add topics, then generate a plan.</p>
              <Link href="/courses"><Button>Manage courses</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {activePlans.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Active plans</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {activePlans.map((p) => {
                    const tasks = p.tasks;
                    const totalHours = tasks.reduce((s, t) => s + t.scheduledHours, 0);
                    const doneHours = tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);
                    const doneCount = tasks.filter((t) => t.status === "done").length;
                    const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
                    return (
                      <Link key={p.id} href={"/plans/" + p.id}>
                        <Card className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:border-accent/50">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: p.course.color }} />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--text-primary)]">{p.name}</div>
                              <div className="text-xs text-text-muted">
                                {p.course.name} · {p._count.tasks} tasks · generated {formatDate(p.generatedAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-text-primary">{pct}%</div>
                              <div className="text-xs text-text-muted">{doneHours.toFixed(1)}h of {totalHours.toFixed(1)}h</div>
                            </div>
                            <svg className="h-4 w-4 text-text-muted transition-colors group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {archivedPlans.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Archived</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {archivedPlans.map((p) => (
                    <Link key={p.id} href={"/plans/" + p.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm transition-all hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] hover:shadow-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: p.course.color }} />
                        <span className="truncate text-text-primary">{p.name}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Badge variant="muted">{p._count.tasks} tasks</Badge>
                        <span className="text-xs text-text-muted">{formatDate(p.generatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
