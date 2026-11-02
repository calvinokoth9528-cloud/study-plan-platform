import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { text } = body as { text?: string };

    if (!text) return NextResponse.json({ message: "text is required" }, { status: 400 });

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
    console.error("PATCH /api/notes/:id failed:", err);
    return NextResponse.json({ message: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: { id, userId: user.id },
    });
    if (!note) return NextResponse.json({ message: "Note not found" }, { status: 404 });

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notes/:id failed:", err);
    return NextResponse.json({ message: "Failed to delete note" }, { status: 500 });
  }
}
