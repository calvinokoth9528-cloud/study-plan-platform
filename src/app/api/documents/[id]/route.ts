import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readLocalFile, deleteStored } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;

  const doc = await prisma.document.findFirst({ where: { id, userId: user.id } });
  if (!doc) return NextResponse.json({ message: "Document not found" }, { status: 404 });

  // Remote (UploadThing) copy: stream through the server so the token and
  // origin stay off the localStorage. For local keys, read from disk.
  const local = await readLocalFile(doc.storageKey);
  if (local != null) {
    return new NextResponse(new Uint8Array(local), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (doc.url) {
    const upstream = await fetch(doc.url);
    if (!upstream.ok) {
      return NextResponse.json({ message: "Stored file is no longer available." }, { status: 500 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  return NextResponse.json({ message: "File content unavailable." }, { status: 500 });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireAuth();
  const { id } = await params;

  const doc = await prisma.document.findFirst({ where: { id, userId: user.id } });
  if (!doc) return NextResponse.json({ message: "Document not found" }, { status: 404 });

  await deleteStored(doc.storageKey);
  await prisma.document.delete({ where: { id: doc.id } });
  return NextResponse.json({ ok: true });
}
