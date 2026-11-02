import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password } = body as { email?: string; name?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
    }

    const hashed = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name?.trim() || null,
        password: hashed,
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ message: "Account created.", user }, { status: 201 });
  } catch (err) {
    console.error("signup error", err);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
