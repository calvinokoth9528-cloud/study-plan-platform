import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePlanForCourse, type CourseInput } from "@/lib/scheduling/engine";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "active";

  const plans = await prisma.plan.findMany({
    where: { userId: user.id, status },
    include: {
      course: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { generatedAt: "desc" },
  });

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const body = await request.json();
  const {
    courseId,
    name,
    weeklyCapacityHours,
    unavailableDays,
    startFrom,
    generate,
  } = body as {
    courseId?: string;
    name?: string;
    weeklyCapacityHours?: number;
    unavailableDays?: string[];
    startFrom?: string;
    generate?: boolean;
  };

  if (!courseId) {
    return NextResponse.json({ message: "courseId is required." }, { status: 400 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: user.id },
    include: { topics: { orderBy: { sortOrder: "asc" } } },
  });
  if (!course) {
    return NextResponse.json({ message: "Course not found" }, { status: 404 });
  }

  const planName = name?.trim() || course.name + " plan";
  const capacityHours =
    typeof weeklyCapacityHours === "number" && weeklyCapacityHours > 0 ? weeklyCapacityHours : 10;
  const unavailable = Array.isArray(unavailableDays)
    ? unavailableDays.filter((d) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(d))
    : [];

  const plan = await prisma.plan.create({
    data: {
      userId: user.id,
      courseId,
      name: planName,
      weeklyCapacityHours: capacityHours,
      unavailableDays: JSON.stringify(unavailable),
    },
  });

  if (!generate) return NextResponse.json(plan, { status: 201 });

  const start = startFrom ? new Date(startFrom) : new Date();
  if (isNaN(start.getTime())) {
    return NextResponse.json({ message: "Invalid startFrom date." }, { status: 400 });
  }

  const courseInput: CourseInput = {
    id: course.id,
    name: course.name,
    color: course.color,
    examDate: course.examDate?.toISOString(),
    topics: course.topics.map((t) => ({
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

  await prisma.planTask.createMany({
    data: generated.tasks.map((t) => ({
      id: t.id,
      planId: plan.id,
      topicId: t.topicId,
      scheduledDate: new Date(t.scheduledDate),
      scheduledHours: t.scheduledHours,
      isReview: t.isReview,
      reviewDueDate: t.reviewDueDate ? new Date(t.reviewDueDate) : null,
      status: t.status,
      locked: t.locked,
      sortOrder: t.sortOrder,
    })),
  });

  // archive any other active plan for this course
  await prisma.plan.updateMany({
    where: { courseId, userId: user.id, status: "active", id: { not: plan.id } },
    data: { status: "archived" },
  });

  const populated = await prisma.plan.findUnique({
    where: { id: plan.id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ plan: populated, metrics: generated.metrics });
}
