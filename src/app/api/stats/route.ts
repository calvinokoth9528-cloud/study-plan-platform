import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");

  if (planId) {
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId: user.id },
      include: {
        course: { select: { id: true, name: true, color: true } },
        tasks: true,
      },
    });
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    const tasks = plan.tasks;
    const totalScheduled = tasks.reduce((s, t) => s + t.scheduledHours, 0);
    const totalActual = tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);
    const done = tasks.filter((t) => t.status === "done").length;
    const completionPct = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

    const byTopic: Record<string, { topicId: string; scheduled: number; actual: number; done: number; count: number }> = {};
    for (const t of tasks) {
      const entry = byTopic[t.topicId] ?? { topicId: t.topicId, scheduled: 0, actual: 0, done: 0, count: 0 };
      entry.scheduled += t.scheduledHours;
      entry.actual += t.actualHours ?? 0;
      if (t.status === "done") entry.done++;
      entry.count++;
      byTopic[t.topicId] = entry;
    }

    const sessions = await prisma.session.findMany({
      where: { planTaskId: { in: tasks.map((t) => t.id) } },
      select: { actualHours: true, startedAt: true },
    });

    return NextResponse.json({
      planId,
      courseName: plan.course.name,
      courseColor: plan.course.color,
      totalTasks: tasks.length,
      completedTasks: done,
      completionPct: Math.round(completionPct * 100) / 100,
      totalScheduledHours: totalScheduled,
      totalActualHours: totalActual,
      totalSessionHours: sessions.reduce((s, x) => s + (x.actualHours ?? 0), 0),
      byTopic: Object.values(byTopic),
      sessionsCount: sessions.length,
    });
  }

  const courses = await prisma.course.findMany({
    where: { userId: user.id },
    include: {
      topics: { select: { id: true, estimatedHours: true } },
      plans: { where: { status: "active" }, include: { tasks: true } },
    },
  });

  const totalEstimated = courses.reduce(
    (s, c) => s + c.topics.reduce((t, tp) => t + tp.estimatedHours, 0),
    0
  );

  let totalActual = 0;
  let totalCompletedTasks = 0;
  let totalTasks = 0;
  const perCourse: { name: string; color: string; estimated: number; actual: number; completed: number; total: number }[] = [];

  for (const c of courses) {
    let planActual = 0;
    let planCompleted = 0;
    let planTotal = 0;
    for (const p of c.plans) {
      const tasks = p.tasks;
      planTotal += tasks.length;
      planCompleted += tasks.filter((t) => t.status === "done").length;
      planActual += tasks.reduce((s, t) => s + (t.actualHours ?? 0), 0);
    }
    totalActual += planActual;
    totalCompletedTasks += planCompleted;
    totalTasks += planTotal;
    perCourse.push({
      name: c.name,
      color: c.color,
      estimated: c.topics.reduce((t, tp) => t + tp.estimatedHours, 0),
      actual: planActual,
      completed: planCompleted,
      total: planTotal,
    });
  }

  const sessionSum = await prisma.session.aggregate({
    where: { userId: user.id },
    _sum: { actualHours: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    totalCourses: courses.length,
    totalEstimatedHours: totalEstimated,
    totalActualHours: totalActual,
    totalSessionHours: sessionSum._sum.actualHours ?? 0,
    sessionCount: sessionSum._count._all,
    totalTasks,
    completedTasks: totalCompletedTasks,
    completionPct: totalTasks > 0 ? (totalCompletedTasks / totalTasks) * 100 : 0,
    perCourse,
  });
}
