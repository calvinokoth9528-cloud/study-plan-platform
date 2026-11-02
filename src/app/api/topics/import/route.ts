import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const body = await request.json();
  const { courseId, csv } = body as { courseId?: string; csv?: string };

  if (!courseId || !csv) {
    return NextResponse.json({ message: "courseId and csv are required." }, { status: 400 });
  }

  const course = await prisma.course.findFirst({ where: { id: courseId, userId: user.id } });
  if (!course) return NextResponse.json({ message: "Course not found" }, { status: 404 });

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return NextResponse.json({ message: "CSV is empty." }, { status: 400 });
  }

  const first = parseCsvRow(lines[0]);
  const hasHeader = first.some((cell) => /^(title|topic|name|hours|est\.?hours|estimated)$/i.test(cell));

  const rows: { title: string; estimatedHours: number }[] = [];
  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    const title = row[0];
    if (!title) continue;
    let hours = 1;
    if (row.length >= 2) {
      const parsed = parseFloat(row[1]);
      if (!isNaN(parsed) && parsed > 0) hours = parsed;
    }
    rows.push({ title, estimatedHours: hours });
  }

  if (rows.length === 0) {
    return NextResponse.json({ message: "No valid rows found in CSV." }, { status: 400 });
  }

  const created = await Promise.all(
    rows.map((r, idx) =>
      prisma.topic.create({
        data: { courseId, title: r.title, estimatedHours: r.estimatedHours, sortOrder: idx, notes: null },
      })
    )
  );

  return NextResponse.json({ imported: created.length, topics: created });
}
