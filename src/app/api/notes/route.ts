import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const planId = req.nextUrl.searchParams.get("planId");
    if (!planId) return NextResponse.json({ message: "planId is required" }, { status: 400 });

    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId: user.id },
    });
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    const notes = await prisma.note.findMany({
      where: { planId, userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch (err) {
    console.error("GET /api/notes failed:", err);
    return NextResponse.json({ message: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { planId, text } = body as { planId?: string; text?: string };

    if (!planId || !text) return NextResponse.json({ message: "planId and text are required" }, { status: 400 });
    if (typeof text !== "string" || text.length > 4000) return NextResponse.json({ message: "Note is too long (max 4000 chars)" }, { status: 400 });

    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId: user.id },
    });
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    const note = await prisma.note.create({
      data: { planId, userId: user.id, text: text.trim() },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("POST /api/notes failed:", err);
    return NextResponse.json({ message: "Failed to save note" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { id, text } = body as { id?: string; text?: string };

    if (!id || !text) return NextResponse.json({ message: "id and text are required" }, { status: 400 });

    const note = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });
    if (!note) return NextResponse.json({ message: "Note not found" }, { status: 404 });

    const updated = await prisma.note.update({
      where: { id },
      data: { text: text.trim() },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/notes failed:", err);
    return NextResponse.json({ message: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });

    const note = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });
    if (!note) return NextResponse.json({ message: "Note not found" }, { status: 404 });

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notes failed:", err);
    return NextResponse.json({ message: "Failed to delete note" }, { status: 500 });
  }
}
