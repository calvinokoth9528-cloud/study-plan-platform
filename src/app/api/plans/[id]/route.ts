import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
      versions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { name, weeklyCapacityHours, unavailableDays, status } = body as {
    name?: string;
    weeklyCapacityHours?: number;
    unavailableDays?: string[];
    status?: string;
  };

  const plan = await prisma.plan.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (weeklyCapacityHours !== undefined) data.weeklyCapacityHours = weeklyCapacityHours;
  if (unavailableDays !== undefined) data.unavailableDays = JSON.stringify(unavailableDays.filter((d) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(d)));
  if (status !== undefined) data.status = status;

  await prisma.plan.update({ where: { id }, data });

  const updated = await prisma.plan.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const result = await prisma.plan.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
