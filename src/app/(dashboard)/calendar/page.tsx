import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import Link from "next/link";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const user = await requireAuth();

  const plans = await prisma.plan.findMany({
    where: { userId: user.id, status: "active" },
    include: { course: { select: { id: true, name: true, color: true } }, tasks: { orderBy: { scheduledDate: "asc" } } },
    orderBy: { generatedAt: "desc" },
  });

  let unavailableDays: string[] = [];
  if (plans.length > 0) {
    try {
      unavailableDays = JSON.parse(plans[0].unavailableDays) as string[];
    } catch {
      unavailableDays = [];
    }
  }

  const tasks = plans.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      planId: p.id,
      topicId: t.topicId,
      scheduledDate: t.scheduledDate.toISOString(),
      scheduledHours: t.scheduledHours,
      isReview: t.isReview,
      status: t.status,
      actualHours: t.actualHours ?? undefined,
      confidence: t.confidence ?? undefined,
      locked: t.locked,
      sortOrder: t.sortOrder,
      courseId: p.courseId,
      courseName: p.course.name,
      courseColor: p.course.color,
    }))
  );

  const topicTitles = new Map<string, string>();
  if (plans.length > 0) {
    const topics = await prisma.topic.findMany({
      where: { courseId: { in: plans.map((p) => p.courseId) } },
      select: { id: true, title: true },
    });
    topics.forEach((t) => topicTitles.set(t.id, t.title));
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Calendar</h1>
            <p className="mt-1 text-sm text-text-secondary">All your active plans on one timeline.</p>
          </div>
          <Link href="/plans"><Button variant="secondary" size="sm">Plans</Button></Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Study calendar</CardTitle></CardHeader>
          <CardContent>
            <CalendarView tasks={tasks} topicTitles={Object.fromEntries(topicTitles)} unavailableDays={unavailableDays} />
          </CardContent>
        </Card>

        {tasks.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-text-muted">No tasks scheduled yet. Create a course, add topics, and generate a plan.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
