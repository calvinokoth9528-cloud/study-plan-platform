"use client";

import { useState, useMemo } from "react";
import { cn, startOfDay, addDays, isSameDay, weekdayName } from "@/lib/utils";

interface Task {
  id: string;
  planId: string;
  topicId: string;
  scheduledDate: string;
  scheduledHours: number;
  isReview: boolean;
  status: string;
  actualHours?: number;
  confidence?: number;
  locked: boolean;
  sortOrder: number;
  courseId: string;
  courseName: string;
  courseColor: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ tasks, topicTitles, unavailableDays }: { tasks: Task[]; topicTitles: Record<string, string>; unavailableDays: string[] }) {
  const [view, setView] = useState<"month" | "week">("month");
  const [current, setCurrent] = useState(() => new Date());

  const monthStart = useMemo(() => {
    const d = new Date(current.getFullYear(), current.getMonth(), 1);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [current]);

  const monthDays = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(monthStart, i)), [monthStart]);

  const todayDate = startOfDay(new Date());

  function tasksForDate(date: Date): Task[] {
    const key = date.toISOString().slice(0, 10);
    return tasks.filter((t) => t.scheduledDate.slice(0, 10) === key);
  }
  function isUnavailable(date: Date) {
    return unavailableDays.includes(weekdayName(date));
  }
  function isOtherMonth(date: Date) {
    return date.getMonth() !== current.getMonth() || date.getFullYear() !== current.getFullYear();
  }

  const weekStart = useMemo(() => {
    const d = new Date(current);
    while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
    return d;
  }, [current]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  function TaskChip({ task }: { task: Task }) {
    return (
      <div
        className="truncate rounded px-1 py-0.5 text-[10px]"
        style={{
          backgroundColor: task.courseColor + "1a",
          color: task.status === "done" ? "var(--color-success)" : "var(--color-text-primary)",
        }}
        title={(task.isReview ? "Review: " : "Study: ") + (topicTitles[task.topicId] ?? task.topicId)}
      >
        {(task.isReview ? "R: " : "") + (topicTitles[task.topicId] ?? task.topicId).slice(0, 18)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="rounded p-1.5 hover:bg-bg-tertiary" onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Previous month">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="min-w-[150px] text-center text-sm font-medium text-text-primary">
            {current.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button className="rounded p-1.5 hover:bg-bg-tertiary" onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Next month">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button className="rounded px-2 py-1 text-xs hover:bg-bg-tertiary" onClick={() => setCurrent(new Date())}>Today</button>
        </div>
        <div className="flex gap-2">
          <button
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", view === "month" ? "bg-accent text-white" : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary")}
            onClick={() => setView("month")}
          >Month</button>
          <button
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", view === "week" ? "bg-accent text-white" : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary")}
            onClick={() => setView("week")}
          >Week</button>
        </div>
      </div>

      {view === "month" ? (
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name) => (
              <div key={name} className="py-1 text-center text-xs font-medium text-text-muted">{name}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date, idx) => {
              const isToday = isSameDay(date, todayDate);
              const isOther = isOtherMonth(date);
              const dayTasks = tasksForDate(date);
              const unavail = isUnavailable(date);
              const total = dayTasks.reduce((s, t) => s + t.scheduledHours, 0);
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[90px] rounded-lg border p-1",
                    isOther && "border-transparent bg-transparent opacity-40",
                    !isOther && "border-border bg-surface",
                    isToday && !isOther && "border-accent/50 ring-1 ring-accent/30",
                    unavail && !isOther && "bg-bg-tertiary/50"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between px-0.5">
                    <span className={cn("text-xs", isToday ? "font-semibold text-accent" : "text-text-secondary")}>{date.getDate()}</span>
                    {total > 0 && <span className="text-[9px] text-text-muted">{total.toFixed(1)}h</span>}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayTasks.slice(0, 4).map((t) => <TaskChip key={t.id} task={t} />)}
                    {dayTasks.length > 4 && <div className="px-1 text-[9px] text-text-muted">+{dayTasks.length - 4} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date) => {
            const isToday = isSameDay(date, todayDate);
            const dayTasks = tasksForDate(date);
            const unavail = isUnavailable(date);
            const total = dayTasks.reduce((s, t) => s + t.scheduledHours, 0);
            return (
              <div
                key={date.toISOString()}
                className={cn("min-h-[240px] rounded-xl border p-2", isToday ? "border-accent/50 ring-1 ring-accent/30" : "border-border bg-surface", unavail && "bg-bg-tertiary/50")}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn("text-sm font-medium", isToday ? "text-accent" : "text-text-secondary")}>{weekdayName(date, true).slice(0, 3)}</span>
                  <span className="text-sm font-semibold text-text-primary">{date.getDate()}</span>
                </div>
                {dayTasks.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-text-muted">{unavail ? "Unavailable" : "No tasks"}</div>
                ) : (
                  <div className="flex flex-col gap-1 overflow-auto">
                    <span className="mb-1 text-right text-[10px] text-text-muted">{total.toFixed(1)}h</span>
                    {dayTasks.map((t) => <TaskChip key={t.id} task={t} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
