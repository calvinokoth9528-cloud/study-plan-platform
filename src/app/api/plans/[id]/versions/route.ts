import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const plan = await prisma.plan.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

  const versions = await prisma.planVersion.findMany({ where: { planId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(versions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { versionId, label } = body as { versionId?: string; label?: string };

  if (!versionId) return NextResponse.json({ message: "versionId is required" }, { status: 400 });

  const plan = await prisma.plan.findFirst({ where: { id, userId: user.id }, include: { tasks: true } });
  if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

  const version = await prisma.planVersion.findFirst({ where: { id: versionId, planId: id } });
  if (!version) return NextResponse.json({ message: "Version not found" }, { status: 404 });

  const snapshot = JSON.parse(version.snapshot) as Array<{
    id: string;
    topicId: string;
    scheduledDate: string;
    scheduledHours: number;
    isReview?: boolean;
    status?: string;
    locked?: boolean;
    sortOrder?: number;
  }>;

  // Snapshot current state before restoring
  await prisma.planVersion.create({
    data: {
      planId: id,
      label: label ?? "Before restore: " + version.label,
      snapshot: JSON.stringify(
        plan.tasks.map((t) => ({
          id: t.id,
          topicId: t.topicId,
          scheduledDate: t.scheduledDate.toISOString(),
          scheduledHours: t.scheduledHours,
          isReview: t.isReview,
          status: t.status,
          locked: t.locked,
          sortOrder: t.sortOrder,
        }))
      ),
    },
  });

  await prisma.planTask.deleteMany({ where: { planId: id } });
  for (const t of snapshot) {
    const scheduledDate = new Date(t.scheduledDate);
    if (isNaN(scheduledDate.getTime())) continue;
    await prisma.planTask.create({
      data: {
        id: t.id,
        planId: id,
        topicId: t.topicId,
        scheduledDate,
        scheduledHours: t.scheduledHours,
        isReview: t.isReview ?? false,
        status: t.status ?? "pending",
        locked: t.locked ?? false,
        sortOrder: t.sortOrder ?? 0,
      },
    });
  }

  const updated = await prisma.plan.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, name: true, color: true } },
      tasks: { orderBy: { scheduledDate: "asc" } },
      versions: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(updated);
}
