import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: { id, userId: user.id },
    include: {
      topics: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, estimatedHours: true, sortOrder: true, notes: true } },
      plans: { where: { status: "active" }, include: { _count: { select: { tasks: true } } } },
    },
  });
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });
  return NextResponse.json(course);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { name, color, examDate } = body as { name?: string; color?: string; examDate?: string | null };

  const result = await prisma.course.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(color !== undefined && { color: color.trim() }),
      ...(examDate !== undefined && { examDate: examDate ? new Date(examDate) : null }),
    },
  });

  if (result.count === 0) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  const updated = await prisma.course.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const result = await prisma.course.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return NextResponse.json({ message: "Course not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
