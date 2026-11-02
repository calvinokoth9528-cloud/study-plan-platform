import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireAuth();
  const courses = await prisma.course.findMany({
    where: { userId: user.id },
    include: {
      topics: { select: { id: true, title: true, estimatedHours: true, sortOrder: true, notes: true } },
      _count: { select: { topics: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  const user = await requireAuth();
  const body = await request.json();
  const { name, color, examDate } = body as { name?: string; color?: string; examDate?: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ message: "Course name is required." }, { status: 400 });
  }

  const course = await prisma.course.create({
    data: {
      userId: user.id,
      name: name.trim(),
      color: color?.trim() || "#6366f1",
      examDate: examDate ? new Date(examDate) : null,
    },
  });

  return NextResponse.json(course, { status: 201 });
}
