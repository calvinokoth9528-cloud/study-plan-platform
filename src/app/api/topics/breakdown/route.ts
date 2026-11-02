import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateTopicBreakdown, type LlmTopic } from "@/lib/scheduling/engine";

export async function POST(request: NextRequest) {
  await requireAuth();
  const body = await request.json();
  const { syllabusText, courseName } = body as { syllabusText?: string; courseName?: string };

  if (!syllabusText || typeof syllabusText !== "string" || syllabusText.trim().length === 0) {
    return NextResponse.json({ message: "syllabusText is required." }, { status: 400 });
  }

  try {
    const topics = await generateTopicBreakdown({
      syllabusText: syllabusText.trim(),
      courseName: courseName?.trim() || undefined,
    });
    return NextResponse.json({ topics } as { topics: LlmTopic[] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Topic breakdown failed.";
    if (message.includes("OPENAI_API_KEY is not set")) {
      return NextResponse.json({ message, disabled: true }, { status: 503 });
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
