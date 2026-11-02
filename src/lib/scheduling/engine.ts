import { v4 as uuid } from "uuid";
import {
  type TopicInput,
  type CourseInput,
  type CapacityInput,
  type DaySlot,
  type GeneratedPlan,
  type PlanMetrics,
  type PlanTaskOutput,
  type ExistingTaskSnapshot,
  type RepairContext,
  type RepairProposal,
  type PlanDiff,
} from "./types";

export type { TopicInput, CourseInput, CapacityInput, DaySlot };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d;
}

function toISO(d: Date): string {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out.toISOString();
}

function daysBetween(a: Date, b: Date): number {
  const sa = new Date(a); sa.setHours(0, 0, 0, 0);
  const sb = new Date(b); sb.setHours(0, 0, 0, 0);
  return Math.round((sb.getTime() - sa.getTime()) / 86400000);
}

function freeSlotsInRange(start: Date, end: Date, unavailable: string[]): DaySlot[] {
  const slots: DaySlot[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const finish = new Date(end);
  finish.setHours(0, 0, 0, 0);
  while (cur <= finish) {
    const name = cur.toLocaleDateString("en-US", { weekday: "short" });
    slots.push({
      date: toISO(cur),
      availableHours: unavailable.includes(name) ? 0 : Infinity,
      load: 0,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return slots;
}

function dailyTarget(capacity: number, unavailable: string[]): number {
  const available = 7 - unavailable.length;
  if (available <= 0) return capacity;
  return capacity / available;
}

// ---------------------------------------------------------------------------
// Priority model
// ---------------------------------------------------------------------------

function priorityOf(topic: TopicInput, examDate?: Date): number {
  let score = 0;
  if (examDate) {
    const d = daysBetween(new Date(), examDate);
    score = Math.max(0, 100 - d) + 50;
  }
  score += topic.estimatedHours * 2;
  score += topic.order * 0.01;
  return score;
}

// ---------------------------------------------------------------------------
// Generate a fresh plan for one course
// ---------------------------------------------------------------------------

export function generatePlanForCourse(
  course: CourseInput,
  capacity: CapacityInput,
  startFrom: Date
): GeneratedPlan {
  const UNIT = 0.5; // one unit = 30 min
  const examDate = parseDate(course.examDate);
  const targetPerDay = dailyTarget(capacity.weeklyCapacityHours, capacity.unavailableDays);
  const maxDays = 365;
  const horizon = new Date(startFrom);
  horizon.setDate(horizon.getDate() + maxDays);

  const slots = freeSlotsInRange(startFrom, horizon, capacity.unavailableDays).map((s) => ({
    ...s,
    availableHours: Math.min(s.availableHours, targetPerDay),
  }));

  const unitsPerTopic = course.topics.map((t) => {
    const units = Math.max(1, Math.round(t.estimatedHours / UNIT));
    return { topic: t, units, priority: priorityOf(t, examDate) };
  });

  unitsPerTopic.sort((a, b) => b.priority - a.priority || a.topic.order - b.topic.order);

  const tasks: PlanTaskOutput[] = [];
  let slotIndex = 0;

  for (const item of unitsPerTopic) {
    let remaining = item.units;
    let topicOrder = 0;
    while (remaining > 0 && slotIndex < slots.length) {
      const slot = slots[slotIndex];
      if (slot.availableHours <= 0) {
        slotIndex++;
        continue;
      }
      const scheduled = Math.min(UNIT, slot.availableHours);
      slot.load += scheduled;
      slot.availableHours -= scheduled;
      tasks.push({
        id: uuid(),
        topicId: item.topic.id,
        scheduledDate: slot.date,
        scheduledHours: scheduled,
        isReview: false,
        status: "pending",
        locked: false,
        sortOrder: topicOrder++,
      });
      remaining--;
      if (slot.availableHours <= 0) slotIndex++;
    }
  }

  const totalTopicHours = tasks.reduce((s, t) => s + t.scheduledHours, 0);
  const overloadDays = slots.filter((s) => s.load > targetPerDay + 1e-9).map((s) => s.date);
  const daysUsed = slots.filter((s) => s.load > 0).length;
  const usedDates = [...new Set(tasks.map((t) => t.scheduledDate))].sort();
  const weeksEstimated =
    usedDates.length > 1
      ? Math.max(1, Math.round(daysBetween(new Date(usedDates[0]), new Date(usedDates[usedDates.length - 1])) / 7))
      : usedDates.length;

  return {
    courseId: course.id,
    courseName: course.name,
    color: course.color,
    startFrom: toISO(startFrom),
    weeks: slots.filter((s) => s.load > 0),
    tasks,
    metrics: { totalTopicHours, totalReviewHours: 0, totalWeeksEstimated: weeksEstimated, daysUsed, overloadDays },
  };
}

// ---------------------------------------------------------------------------
// Repair
// ---------------------------------------------------------------------------

export function computeRepair(ctx: RepairContext, strategy: "minimal" | "rebalance" = "minimal"): RepairProposal {
  const UNIT = 0.5;
  const targetPerDay = dailyTarget(ctx.weeklyCapacityHours, ctx.unavailableDays);
  const start = parseDate(ctx.startFrom) ?? new Date();
  const horizon = new Date(start);
  horizon.setDate(horizon.getDate() + ctx.horizonDays);

  const slots = freeSlotsInRange(start, horizon, ctx.unavailableDays).map((s) => ({
    ...s,
    availableHours: targetPerDay,
    load: 0,
  }));

  const needsWork = new Set<string>();
  const needsReview = new Set<string>();
  for (const t of ctx.tasks) {
    if (t.status === "done") {
      const next = ctx.nextReviewDates[t.topicId];
      if (next && new Date(next) <= new Date()) needsReview.add(t.topicId);
      continue;
    }
    if (t.status === "partial" || t.status === "pending" || t.status === "in_progress") {
      needsWork.add(t.topicId);
    }
  }

  const diff: PlanDiff = { movedTasks: [], addedTasks: [], removedTasks: [], protectedTasks: [], conflictNotes: [] };
  const newTasks: PlanTaskOutput[] = [];
  const keptIds = new Set<string>();

  // 1) Reserve locked tasks (protected intent)
  for (const t of ctx.tasks) {
    if (!t.locked) continue;
    diff.protectedTasks.push({ id: t.id, topicId: t.topicId, date: t.scheduledDate });
    const slot = slots.find((s) => s.date === t.scheduledDate);
    if (slot) {
      slot.load += t.scheduledHours;
      slot.availableHours = Math.max(0, slot.availableHours - t.scheduledHours);
    }
    newTasks.push({
      id: t.id,
      topicId: t.topicId,
      scheduledDate: t.scheduledDate,
      scheduledHours: t.scheduledHours,
      isReview: t.isReview,
      reviewDueDate: t.reviewDueDate ?? undefined,
      status: t.status === "done" ? "pending" : (t.status as PlanTaskOutput["status"]),
      locked: true,
      sortOrder: 0,
    });
    keptIds.add(t.id);
  }

  // 2) Keep live tasks on their original date where capacity allows; otherwise mark for move
  const toMove: ExistingTaskSnapshot[] = [];
  for (const t of ctx.tasks) {
    if (t.locked) continue;
    const needs = needsWork.has(t.topicId) || needsReview.has(t.topicId);
    if (!needs) {
      diff.removedTasks.push({ id: t.id, topicId: t.topicId, date: t.scheduledDate });
      continue;
    }
    const slot = slots.find((s) => s.date === t.scheduledDate);
    if (slot && slot.availableHours >= t.scheduledHours) {
      slot.load += t.scheduledHours;
      slot.availableHours -= t.scheduledHours;
      newTasks.push({
        id: t.id,
        topicId: t.topicId,
        scheduledDate: t.scheduledDate,
        scheduledHours: t.scheduledHours,
        isReview: t.isReview,
        reviewDueDate: t.reviewDueDate ?? undefined,
        status: t.status as PlanTaskOutput["status"],
        locked: false,
        sortOrder: 0,
      });
      keptIds.add(t.id);
    } else {
      toMove.push(t);
    }
  }

  // 3) Move the rest to the earliest day at/after their original date with capacity
  const slotIndex = 0;
  for (const t of toMove) {
    let candidate: DaySlot | null = null;
    for (let i = slotIndex; i < slots.length; i++) {
      if (slots[i].date >= t.scheduledDate && slots[i].availableHours >= t.scheduledHours) {
        candidate = slots[i];
        break;
      }
    }
    if (!candidate) {
      candidate = slots.find((s) => s.availableHours >= t.scheduledHours) ?? null;
    }
    if (candidate) {
      candidate.load += t.scheduledHours;
      candidate.availableHours -= t.scheduledHours;
      diff.movedTasks.push({ id: t.id, topicId: t.topicId, from: t.scheduledDate, to: candidate.date, hours: t.scheduledHours });
      newTasks.push({
        id: t.id,
        topicId: t.topicId,
        scheduledDate: candidate.date,
        scheduledHours: t.scheduledHours,
        isReview: t.isReview,
        reviewDueDate: t.reviewDueDate ?? undefined,
        status: t.status as PlanTaskOutput["status"],
        locked: false,
        sortOrder: 0,
      });
      keptIds.add(t.id);
    } else {
      diff.removedTasks.push({ id: t.id, topicId: t.topicId, date: t.scheduledDate });
      diff.conflictNotes.push(
        `Could not reschedule a task for topic ${t.topicId}: not enough capacity within the horizon.`
      );
    }
  }

  // 4) Add FSRS review units (0.5h) for topics due for review
  for (const topicId of [...needsReview]) {
    let candidate: DaySlot | null = null;
    for (let i = slotIndex; i < slots.length; i++) {
      if (slots[i].availableHours >= UNIT) {
        candidate = slots[i];
        break;
      }
    }
    if (candidate) {
      candidate.load += UNIT;
      candidate.availableHours -= UNIT;
      const id = uuid();
      newTasks.push({
        id,
        topicId,
        scheduledDate: candidate.date,
        scheduledHours: UNIT,
        isReview: true,
        status: "pending",
        locked: false,
        sortOrder: 0,
      });
      diff.addedTasks.push({ id, topicId, date: candidate.date, hours: UNIT, isReview: true });
    }
  }

  // 5) Add catch-up units for in-progress topics whose actual hours exceed estimates
  for (const topicId of Object.keys(ctx.topicActualHours)) {
    if (needsWork.has(topicId) && ctx.topicConfidence[topicId] !== undefined && ctx.topicConfidence[topicId] <= 2) {
      let candidate: DaySlot | null = null;
      for (let i = slotIndex; i < slots.length; i++) {
        if (slots[i].availableHours >= UNIT) {
          candidate = slots[i];
          break;
        }
      }
      if (candidate) {
        candidate.load += UNIT;
        candidate.availableHours -= UNIT;
        const id = uuid();
        newTasks.push({
          id,
          topicId,
          scheduledDate: candidate.date,
          scheduledHours: UNIT,
          isReview: false,
          status: "pending",
          locked: false,
          sortOrder: 0,
        });
        diff.addedTasks.push({ id, topicId, date: candidate.date, hours: UNIT, isReview: false });
        diff.conflictNotes.push(`Added extra catch-up time for topic ${topicId} (low confidence).`);
      }
    }
  }

  const overloadDays = slots.filter((s) => s.load > targetPerDay + 1e-9).map((s) => s.date);
  const metrics: PlanMetrics = {
    totalTopicHours: newTasks.filter((t) => !t.isReview).reduce((s, t) => s + t.scheduledHours, 0),
    totalReviewHours: newTasks.filter((t) => t.isReview).reduce((s, t) => s + t.scheduledHours, 0),
    totalWeeksEstimated: newTasks.length
      ? Math.max(
          1,
          Math.round(
            daysBetween(
              new Date([...new Set(newTasks.map((t) => t.scheduledDate))].sort()[0]),
              new Date([...new Set(newTasks.map((t) => t.scheduledDate))].sort().pop()!)
            ) / 7
          )
        )
      : 0,
    daysUsed: slots.filter((s) => s.load > 0).length,
    overloadDays,
  };

  return {
    label: strategy === "minimal" ? "Minimal reschedule" : "Rebalance workload",
    description:
      strategy === "minimal"
        ? "Preserve your existing schedule where possible and only move what is necessary."
        : "Redistribute work to smooth out overloaded days.",
    tasks: newTasks,
    diff,
    metrics,
  };
}

// ---------------------------------------------------------------------------
// FSRS / review date heuristic (confidence 0-5 -> next review in N days)
// ---------------------------------------------------------------------------

export function nextReviewDateFromSession(
  topicId: string,
  today: Date,
  prevReviewDate?: Date,
  confidence: number = 3
): string | null {
  let days = 7;
  if (confidence <= 1) days = 1;
  else if (confidence === 2) days = 3;
  else if (confidence === 3) days = 7;
  else if (confidence === 4) days = 14;
  else days = 30;
  const next = new Date(today);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

// ---------------------------------------------------------------------------
// LLM topic breakdown (OpenAI-compatible, env-gated)
// ---------------------------------------------------------------------------

export interface LlmBreakdownRequest {
  syllabusText: string;
  courseName?: string;
}

export interface LlmTopic {
  title: string;
  estimatedHours: number;
  order: number;
}

export async function generateTopicBreakdown(request: LlmBreakdownRequest): Promise<LlmTopic[]> {
  const { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL } = process.env;
  if (!OPENAI_API_KEY) {
    throw new Error("LLM topic breakdown is disabled: OPENAI_API_KEY is not set.");
  }

  const url = (OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/?$/, "") + "/chat/completions";
  const model = OPENAI_MODEL ?? "gpt-4.1-mini";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "You are a study-plan assistant. Given a syllabus excerpt or course description, return a JSON array of study topics. Each topic: {title: string, estimatedHours: number (0.5-10), order: integer starting at 0}. Output ONLY a JSON array - no markdown, no extra text.",
        },
        {
          role: "user",
          content: "Course: " + (request.courseName ?? "Unknown") + "\nSyllabus:\n" + request.syllabusText,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error("LLM request failed: " + res.status + " " + res.statusText);

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as LlmTopic[];
    return parsed.map((t, i) => ({ ...t, order: t.order ?? i }));
  } catch {
    throw new Error("LLM returned invalid JSON for topic breakdown.");
  }
}
