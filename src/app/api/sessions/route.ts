import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { advanceFsrsCard, parseStoredFsrs } from "@/lib/scheduling/fsrs";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const body = await request.json();
  const { planTaskId, startedAt, endedAt, actualHours, confidence, note, markStatus } = body as {
    planTaskId?: string;
    startedAt?: string;
    endedAt?: string;
    actualHours?: number;
    confidence?: number;
    note?: string;
    markStatus?: string;
  };

  if (!planTaskId) {
    return NextResponse.json({ message: "planTaskId is required." }, { status: 400 });
  }

  const task = await prisma.planTask.findFirst({
    where: { id: planTaskId },
    include: { plan: true, topic: { select: { id: true, fsrsState: true } } },
  });
  if (!task || task.plan.userId !== user.id) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const started = startedAt ? new Date(startedAt) : new Date();
  const ended = endedAt ? new Date(endedAt) : null;

  const durationHours =
    actualHours != null
      ? actualHours
      : ended
      ? Math.max(0, (ended.getTime() - started.getTime()) / 3600000)
      : null;

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      planId: task.plan.id,
      planTaskId,
      startedAt: started,
      endedAt: ended,
      actualHours: durationHours,
      confidence: typeof confidence === "number" ? confidence : null,
      note: note?.trim() || null,
    },
  });

  // Advance the topic's FSRS memory card whenever a confidence score is logged,
  // so review intervals adapt to actual recall (Phase 2 FSRS upgrade).
  if (typeof confidence === "number") {
    const nextFsrs = advanceFsrsCard(parseStoredFsrs(task.topic.fsrsState), started, confidence);
    await prisma.topic.update({ where: { id: task.topic.id }, data: { fsrsState: JSON.stringify(nextFsrs) } });
  }

  if (markStatus) {
    const statusMap: Record<string, string> = {
      pending: "pending",
      in_progress: "in_progress",
      done: "done",
      partial: "partial",
    };
    const nextStatus = statusMap[markStatus];
    if (!nextStatus) {
      return NextResponse.json({ message: "Invalid markStatus." }, { status: 400 });
    }
    // Compute from the fetched row: SQL `increment` on a NULL column yields NULL
    // (NULL + n = NULL), so a nullable Float must be summed in the app.
    await prisma.planTask.update({
      where: { id: planTaskId },
      data: {
        status: nextStatus,
        ...(durationHours != null && {
          actualHours: (task.actualHours ?? 0) + durationHours,
        }),
        ...(typeof confidence === "number" && { confidence }),
      },
    });
  }

  return NextResponse.json(session, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const planTaskId = searchParams.get("planTaskId");
  if (!planTaskId) return NextResponse.json({ message: "planTaskId is required" }, { status: 400 });

  const task = await prisma.planTask.findFirst({ where: { id: planTaskId }, include: { plan: true } });
  if (!task || task.plan.userId !== user.id) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const sessions = await prisma.session.findMany({
    where: { planTaskId },
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json(sessions);
}
