import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { tasks, label } = body as {
    tasks: Array<{
      id: string;
      topicId: string;
      scheduledDate: string;
      scheduledHours: number;
      isReview: boolean;
      reviewDueDate?: string;
      status: string;
      locked: boolean;
      sortOrder: number;
    }>;
    label?: string;
  };

  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    include: { tasks: { select: { id: true, topicId: true, scheduledDate: true, scheduledHours: true } } },
  });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

  // Snapshot the current task set for restore
  await prisma.planVersion.create({
    data: {
      planId: id,
      label: label ?? "Before repair",
      snapshot: JSON.stringify(
        plan.tasks.map((t) => ({
          id: t.id,
          topicId: t.topicId,
          scheduledDate: t.scheduledDate.toISOString(),
          scheduledHours: t.scheduledHours,
          isReview: false,
          status: "pending",
          locked: false,
          sortOrder: 0,
        }))
      ),
    },
  });

  const incomingIds = new Set(tasks.map((t) => t.id));
  const currentIds = plan.tasks.map((t) => t.id);

  await prisma.planTask.deleteMany({
    where: { planId: id, id: { in: currentIds.filter((cid) => !incomingIds.has(cid)) } },
  });

  for (const t of tasks) {
    const scheduledDate = new Date(t.scheduledDate);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ message: "Invalid date for task " + t.id + "." }, { status: 400 });
    }
    await prisma.planTask.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        planId: id,
        topicId: t.topicId,
        scheduledDate,
        scheduledHours: t.scheduledHours,
        isReview: t.isReview,
        reviewDueDate: t.reviewDueDate ? new Date(t.reviewDueDate) : null,
        status: t.status,
        locked: t.locked,
        sortOrder: t.sortOrder,
      },
      update: {
        topicId: t.topicId,
        scheduledDate,
        scheduledHours: t.scheduledHours,
        isReview: t.isReview,
        reviewDueDate: t.reviewDueDate ? new Date(t.reviewDueDate) : null,
        status: t.status,
        locked: t.locked,
        sortOrder: t.sortOrder,
      },
    });
  }

  const updated = await prisma.plan.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
      versions: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(updated);
}
