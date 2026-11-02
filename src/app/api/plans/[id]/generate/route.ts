import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePlanForCourse, type CourseInput } from "@/lib/scheduling/engine";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { weeklyCapacityHours, unavailableDays, startFrom } = body as {
    weeklyCapacityHours?: number;
    unavailableDays?: string[];
    startFrom?: string;
  };

  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    include: { course: true },
  });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

  const topics = await prisma.topic.findMany({
    where: { courseId: plan.courseId },
    orderBy: { sortOrder: "asc" },
  });

  let currentUnavailable: string[] = [];
  try {
    currentUnavailable = JSON.parse(plan.unavailableDays as string) as string[];
  } catch {
    currentUnavailable = [];
  }

  const capacityHours =
    typeof weeklyCapacityHours === "number" && weeklyCapacityHours > 0
      ? weeklyCapacityHours
      : (plan.weeklyCapacityHours as unknown as number) || 10;
  const unavailable = Array.isArray(unavailableDays)
    ? unavailableDays.filter((d) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(d))
    : currentUnavailable;

  const start = startFrom ? new Date(startFrom) : new Date();
  if (isNaN(start.getTime())) {
    return NextResponse.json({ message: "Invalid startFrom date." }, { status: 400 });
  }

  const courseInput: CourseInput = {
    id: plan.course.id,
    name: plan.course.name,
    color: plan.course.color,
    examDate: plan.course.examDate?.toISOString(),
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      estimatedHours: t.estimatedHours,
      order: t.sortOrder,
      notes: t.notes ?? undefined,
    })),
  };

  const generated = generatePlanForCourse(
    courseInput,
    { weeklyCapacityHours: capacityHours, unavailableDays: unavailable },
    start
  );

  await prisma.planVersion.create({
    data: {
      planId: id,
      label: "Before regenerate",
      snapshot: JSON.stringify(
        plan ? [] : []
      ),
    },
  });

  await prisma.planTask.deleteMany({ where: { planId: id } });
  await prisma.planTask.createMany({
    data: generated.tasks.map((t) => ({
      id: t.id,
      planId: id,
      topicId: t.topicId,
      scheduledDate: new Date(t.scheduledDate),
      scheduledHours: t.scheduledHours,
      isReview: t.isReview,
      reviewDueDate: t.reviewDueDate ? new Date(t.reviewDueDate) : null,
      status: "pending",
      locked: false,
      sortOrder: t.sortOrder,
    })),
  });

  await prisma.plan.update({
    where: { id },
    data: {
      weeklyCapacityHours: capacityHours,
      unavailableDays: JSON.stringify(unavailable),
    },
  });

  const populated = await prisma.plan.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ plan: populated, metrics: generated.metrics });
}
