import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type ReminderDigest, type ReminderTask, subjectFor, htmlFor, textFor } from "@/lib/reminders";

export const dynamic = "force-dynamic"; // daily cron + manual triggers, never cache

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
}

function today(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function sendDigestToUser(userId: string): Promise<{ skipped: false; ok: true } | { skipped: true } | { error: string }> {
  const digestDate = today();

  // Idempotency: max one reminder per user per day.
  const already = await prisma.reminderLog.findUnique({
    where: { userId_day: { userId, day: digestDate } },
  });
  if (already) return { skipped: true };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const tasks = await prisma.planTask.findMany({
    where: {
      status: { not: "done" },
      isReview: false, // only regular study work, filled below with additional nodes
      scheduledDate: { gte: new Date(digestDate + "T00:00:00.000Z"), lte: new Date(digestDate + "T23:59:59.999Z") },
    },
    include: {
      topic: { select: { title: true } },
      plan: {
        select: { status: true, course: { select: { name: true, color: true } } },
      },
    },
  });

  const todaysTasks: ReminderTask[] = tasks
    .filter((t) => t.plan.status === "active")
    .map((t) => ({
      topicTitle: t.topic.title,
      courseName: t.plan.course.name,
      courseColor: t.plan.course.color,
      scheduledHours: t.scheduledHours,
      isReview: t.isReview,
      status: t.status,
    }));

  if (todaysTasks.length === 0) return { skipped: true }; // nothing scheduled today

  const digest: ReminderDigest = { userName: user.name, day: digestDate, tasks: todaysTasks };

  const { RESEND_API_KEY, REMINDERS_FROM } = process.env;
  if (!RESEND_API_KEY) return { error: "RESEND_API_KEY is not set; reminders are disabled." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      // Default to Resend's shared test sender; set REMINDERS_FROM once a
      // domain is verified (e.g. "Study Plan <plan@yourdomain.com>").
      from: REMINDERS_FROM ?? "Study Plan <onboarding@resend.dev>",
      to: [user.email],
      subject: subjectFor(digest),
      html: htmlFor(digest),
      text: textFor(digest),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: `Resend send failed: ${res.status} ${body.slice(0, 200)}` };
  }

  await prisma.reminderLog.create({
    data: { userId, day: digestDate, taskCount: todaysTasks.length },
  });
  return { skipped: false, ok: true };
}

export async function GET() {
  return NextResponse.json({
    message: "POST to send reminders. With CRON_SECRET/REMINDER_SECRET bearer auth this runs for all users; with a session it sends your own daily digest as a test.",
    remindersEnabled: Boolean(process.env.RESEND_API_KEY),
  });
}

export async function POST(request: NextRequest) {
  const { CRON_SECRET, REMINDER_SECRET } = process.env;
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (CRON_SECRET && bearer === CRON_SECRET) return runForAll();
  if (REMINDER_SECRET && bearer === REMINDER_SECRET) return runForAll();

  // No secret matched: fall back to a logged-in user sending a test digest to
  // themselves (also works in local dev without any cron secret configured).
  try {
    const user = await requireAuth();
    const result = await sendDigestToUser(user.id);
    return respondOne(user.email, result);
  } catch {
    return unauthorized();
  }
}

async function runForAll() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const sent: string[] = [];
  const skipped: string[] = [];
  const errors: { email: string; error: string }[] = [];
  for (const u of users) {
    const result = await sendDigestToUser(u.id);
    if ("error" in result && result.error) {
      errors.push({ email: u.email, error: result.error });
    } else if ("skipped" in result && result.skipped) {
      skipped.push(u.email);
    } else {
      sent.push(u.email);
    }
  }
  return NextResponse.json({ sent, skipped, errors }, { status: 200 });
}

function respondOne(email: string, result: { skipped: boolean; ok: boolean | undefined } | { skipped: boolean } | { error: string }) {
  if ("error" in result && result.error) {
    return NextResponse.json({ message: result.error, email }, { status: 503 });
  }
  if ("skipped" in result && result.skipped) {
    return NextResponse.json({ message: "No reminder sent: already sent today or no tasks scheduled.", email }, { status: 200 });
  }
  return NextResponse.json({ message: "Reminder sent.", email }, { status: 200 });
}
