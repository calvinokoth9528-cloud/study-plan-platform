import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateIcs, type IcsEvent } from "@/lib/export";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");

  if (!planId) {
    return new NextResponse("planId is required", { status: 400 });
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: user.id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
    },
  });
  if (!plan) {
    return new NextResponse("Plan not found", { status: 404 });
  }

  const events: IcsEvent[] = plan.tasks.map((t) => {
    const start = new Date(t.scheduledDate);
    const hours = Math.max(0.25, t.scheduledHours);
    const end = new Date(start.getTime() + hours * 3600000);
    return {
      uid: t.id,
      summary: (t.isReview ? "Review: " : "Study: ") + plan.course.name,
      description: "Course: " + plan.course.name + (t.isReview ? " (review)" : "") + " - " + hours + "h",
      start,
      end,
      color: plan.course.color,
      isReview: t.isReview,
    };
  });

  const ics = generateIcs(events);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="study-plan-' + planId + '.ics"',
    },
  });
}
