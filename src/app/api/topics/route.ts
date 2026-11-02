import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const body = await request.json();
  const { courseId, title, estimatedHours, sortOrder, notes } = body as {
    courseId?: string;
    title?: string;
    estimatedHours?: number;
    sortOrder?: number;
    notes?: string;
  };

  if (!courseId || !title) {
    return NextResponse.json({ message: "courseId and title are required." }, { status: 400 });
  }

  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  const topic = await prisma.topic.create({
    data: {
      courseId,
      title: title.trim(),
      estimatedHours: typeof estimatedHours === "number" && estimatedHours > 0 ? estimatedHours : 1,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(topic, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ message: "courseId is required" }, { status: 400 });

  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  const topics = await prisma.topic.findMany({ where: { courseId }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json(topics);
}
