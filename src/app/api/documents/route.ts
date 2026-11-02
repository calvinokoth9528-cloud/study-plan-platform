import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storeFile, isUploadThingConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_PREFIXES = [
  "application/pdf",
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "text/plain", "text/markdown", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ message: "courseId is required" }, { status: 400 });

  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  const topics = await prisma.topic.findMany({
    where: { courseId },
    select: { id: true, title: true },
  });
  const topicIds = topics.map((t) => t.id);

  const documents = await prisma.document.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
  });

  const titleById = new Map(topics.map((t) => [t.id, t.title]));
  return NextResponse.json(
    documents.map((d) => ({
      id: d.id,
      name: d.name,
      mimeType: d.mimeType,
      size: d.size,
      topicId: d.topicId,
      topicTitle: d.topicId ? (titleById.get(d.topicId) ?? null) : null,
      createdAt: d.createdAt.toISOString(),
      link: d.url ?? `/api/documents/${d.id}`,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "A 'file' part is required." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ message: "File too large (max 15MB)." }, { status: 413 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_PREFIXES.includes(mimeType)) {
    return NextResponse.json({ message: `Unsupported file type: ${mimeType}.` }, { status: 415 });
  }

  const courseId = stringPart(form.get("courseId"));
  const topicId = stringPart(form.get("topicId")) || null;
  if (!courseId) return NextResponse.json({ message: "courseId is required." }, { status: 400 });

  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  if (topicId) {
    const topic = await prisma.topic.findFirst({ where: { id: topicId, courseId } });
    if (!topic) return NextResponse.json({ message: "Topic not found in this course." }, { status: 400 });
  }

  let storageKey: string = `pending-${crypto.randomUUID()}`;
  let url: string | undefined;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storeFile(file.name, mimeType, bytes);
    storageKey = stored.storageKey;
    url = stored.utfsUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ message }, { status: 500 });
  }

  const doc = await prisma.document.create({
    data: {
      userId: user.id,
      courseId,
      topicId,
      name: file.name,
      mimeType,
      size: file.size,
      storageKey,
      url: url ?? null,
    },
  });

  return NextResponse.json(
    {
      id: doc.id,
      name: doc.name,
      mimeType: doc.mimeType,
      size: doc.size,
      topicId: doc.topicId,
      createdAt: doc.createdAt.toISOString(),
      link: doc.url ?? `/api/documents/${doc.id}`,
      storage: isUploadThingConfigured() ? "uploadthing" : "local",
    },
    { status: 201 }
  );
}

function stringPart(v: FormDataEntryValue | null): string | undefined {
  return typeof v === "string" ? v : undefined;
}
