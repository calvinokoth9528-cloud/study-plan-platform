import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRepair, nextReviewDateFromSession } from "@/lib/scheduling/engine";
import { fsrsNextDue, parseStoredFsrs } from "@/lib/scheduling/fsrs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { horizonDays, strategy } = body as { horizonDays?: number; strategy?: "minimal" | "rebalance" };

  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    include: {
      course: { select: { id: true, name: true, color: true, examDate: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
    },
  });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

  const tasks = plan.tasks;
  const completedIds: string[] = [];
  const partialIds: string[] = [];
  const actualHoursByTopic: Record<string, number> = {};
  const confidenceByTopic: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status === "done") completedIds.push(t.topicId);
    if (t.status === "partial") partialIds.push(t.topicId);
    if (t.actualHours != null) {
      actualHoursByTopic[t.topicId] = (actualHoursByTopic[t.topicId] ?? 0) + t.actualHours;
    }
    if (t.confidence != null) confidenceByTopic[t.topicId] = t.confidence;
  }

  const nextReviewDates: Record<string, string | null> = {};
  const lastSessions = await Promise.all(
    tasks.map((t) =>
      prisma.session.findMany({
        where: { planTaskId: t.id },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { startedAt: true, actualHours: true, confidence: true },
      })
    )
  );
  lastSessions.forEach((sessions, idx) => {
    const t = tasks[idx];
    if (!sessions.length) return;
    const last = sessions[0];
    const prevDate = t.reviewDueDate ?? undefined;
    nextReviewDates[t.topicId] = nextReviewDateFromSession(
      t.topicId,
      new Date(),
      prevDate,
      last.confidence ?? 3
    );
  });

  // FSRS state (persisted per topic on session log) takes precedence over the
  // confidence heuristic fallback above.
  const topicIds = [...new Set(tasks.map((t) => t.topicId))];
  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    select: { id: true, fsrsState: true },
  });
  for (const topic of topics) {
    const due = fsrsNextDue(parseStoredFsrs(topic.fsrsState));
    if (due) nextReviewDates[topic.id] = due;
  }

  let unavailable: string[] = [];
  try {
    unavailable = JSON.parse(plan.unavailableDays as string) as string[];
  } catch {
    unavailable = [];
  }

  const horizon = typeof horizonDays === "number" && horizonDays > 0 ? horizonDays : 60;
  const startFrom = (plan.updatedAt ?? plan.generatedAt).toISOString();

  const proposal = computeRepair(
    {
      courseId: plan.courseId,
      courseName: plan.course.name,
      color: plan.course.color,
      tasks: tasks.map((t) => ({
        id: t.id,
        topicId: t.topicId,
        scheduledDate: t.scheduledDate.toISOString(),
        scheduledHours: t.scheduledHours,
        isReview: t.isReview,
        reviewDueDate: t.reviewDueDate?.toISOString() ?? undefined,
        status: t.status,
        actualHours: t.actualHours ?? undefined,
        confidence: t.confidence ?? undefined,
        locked: t.locked,
      })),
      completedTopicIds: completedIds,
      partialTopicIds: partialIds,
      topicActualHours: actualHoursByTopic,
      topicConfidence: confidenceByTopic,
      weeklyCapacityHours: plan.weeklyCapacityHours as unknown as number,
      unavailableDays: unavailable,
      startFrom,
      examDate: plan.course.examDate?.toISOString(),
      horizonDays: horizon,
      nextReviewDates,
    },
    strategy ?? "minimal"
  );

  return NextResponse.json(proposal);
}
