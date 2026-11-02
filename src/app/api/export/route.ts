import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tasksToCsv, sessionsToCsv, type CsvTaskRow, type CsvSessionRow } from "@/lib/export";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");
  const mode = (searchParams.get("mode") ?? "tasks").toLowerCase();

  if (!planId) {
    return new NextResponse("planId is required", { status: 400 });
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: user.id },
    include: {
      course: { select: { id: true, name: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
    },
  });
  if (!plan) {
    return new NextResponse("Plan not found", { status: 404 });
  }

  const topicTitles = new Map<string, string>();
  const topics = await prisma.topic.findMany({
    where: { courseId: plan.courseId },
    select: { id: true, title: true },
  });
  topics.forEach((t) => topicTitles.set(t.id, t.title));

  if (mode === "sessions") {
    const sessionRows: CsvSessionRow[] = [];
    for (const t of plan.tasks) {
      const sessions = await prisma.session.findMany({
        where: { planTaskId: t.id },
        orderBy: { startedAt: "desc" },
      });
      for (const s of sessions) {
        sessionRows.push({
          id: s.id,
          topicTitle: topicTitles.get(t.topicId) ?? t.topicId,
          courseName: plan.course.name,
          startedAt: s.startedAt.toISOString(),
          endedAt: s.endedAt?.toISOString(),
          actualHours: s.actualHours ?? undefined,
          confidence: s.confidence ?? undefined,
          note: s.note ?? undefined,
        });
      }
    }
    const csv = sessionsToCsv(sessionRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="study-sessions-' + planId + '.csv"',
      },
    });
  }

  const taskRows: CsvTaskRow[] = plan.tasks.map((t) => ({
    id: t.id,
    topicId: t.topicId,
    topicTitle: topicTitles.get(t.topicId) ?? t.topicId,
    courseName: plan.course.name,
    scheduledDate: t.scheduledDate.toISOString().slice(0, 10),
    scheduledHours: t.scheduledHours,
    isReview: t.isReview,
    reviewDueDate: t.reviewDueDate?.toISOString().slice(0, 10),
    status: t.status,
    actualHours: t.actualHours ?? undefined,
    confidence: t.confidence ?? undefined,
    locked: t.locked,
  }));

  const csv = tasksToCsv(taskRows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="study-tasks-' + planId + '.csv"',
    },
  });
}
