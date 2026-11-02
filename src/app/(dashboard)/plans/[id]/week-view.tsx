"use client";

import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui";
import { cn, formatDate, weekdayName, startOfDay, addDays, isSameDay } from "@/lib/utils";

interface Task {
  id: string;
  topicId: string;
  scheduledDate: string;
  scheduledHours: number;
  isReview: boolean;
  reviewDueDate?: string;
  status: string;
  actualHours?: number;
  confidence?: number;
  locked: boolean;
  sortOrder: number;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "partial", label: "Partial" },
];

export function WeekView({ tasks, courseColor, unavailableDays }: { tasks: Task[]; courseColor: string; unavailableDays: string[] }) {
  const onStatusChange = async (taskId: string, status: string) => {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTaskId: taskId, markStatus: status, confidence: status === "done" ? 4 : undefined }),
    });
    window.location.reload();
  };

  const today = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today);
    while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
    return d;
  });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.scheduledDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    map.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [tasks]);

  const totalHoursByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      const key = t.scheduledDate.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + t.scheduledHours);
    }
    return map;
  }, [tasks]);

  const moveWeek = useCallback((delta: number) => setWeekStart((p) => addDays(p, delta)), []);
  const goToToday = useCallback(() => {
    const d = new Date(startOfDay(new Date()));
    while (d.getDay() !== 0) d.setDate(d.getDate() - 1);
    setWeekStart(d);
  }, []);

  function dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }
  function isUnavailable(date: Date) {
    return unavailableDays.includes(weekdayName(date));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => moveWeek(-1)} aria-label="Previous week">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Button>
        <span className="min-w-[140px] text-center text-sm font-medium text-text-primary">
          {formatDate(weekStart, { month: "short", day: "numeric" })} — {formatDate(addDays(weekStart, 6), { month: "short", day: "numeric" })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => moveWeek(1)} aria-label="Next week">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Button>
        <div className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const key = dayKey(day);
          const isToday = isSameDay(day, today);
          const isUnavail = isUnavailable(day);
          const total = totalHoursByDate.get(key) ?? 0;
          const dayTasks = tasksByDate.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[150px] flex-col rounded-xl border p-2",
                isToday ? "border-accent/50 ring-1 ring-accent/30" : "border-border bg-surface",
                isUnavail && "bg-bg-tertiary/50"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={cn("text-xs font-semibold", isToday ? "text-accent" : "text-text-primary")}>{day.getDate()}</span>
                <span className="text-[10px] text-text-muted">{weekdayName(day).slice(0, 3)}</span>
              </div>
              {dayTasks.length === 0 ? (
                <p className="flex-1 text-center text-[10px] text-text-muted">{isUnavail ? "Unavailable" : "—"}</p>
              ) : (
                <div className="flex flex-col gap-1 overflow-auto">
                  {dayTasks.map((t) => (
                    <TaskBlock key={t.id} task={t} courseColor={courseColor} onStatusChange={onStatusChange} />
                  ))}
                </div>
              )}
              {dayTasks.length > 0 && (
                <span className="mt-1 text-right text-[10px] text-text-muted">{total.toFixed(1)}h</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskBlock({ task, courseColor, onStatusChange }: { task: Task; courseColor: string; onStatusChange: (taskId: string, status: string) => void | Promise<void> }) {
  const statusColors: Record<string, string> = {
    pending: "bg-bg-tertiary text-text-secondary",
    in_progress: "border border-accent/30 bg-accent/10 text-accent",
    done: "bg-success/10 text-success",
    partial: "bg-warning/10 text-warning",
  };
  return (
    <div className={cn("flex items-center justify-between gap-1 rounded-lg border border-border px-1.5 py-1 text-[10px]", statusColors[task.status] ?? statusColors.pending, task.locked && "opacity-60")}>
      <span className="flex min-w-0 items-center gap-1 truncate">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: courseColor }} />
        {task.isReview ? "Review" : "Study"} · {task.scheduledHours}h
      </span>
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
        disabled={task.locked}
        className="flex-shrink-0 cursor-pointer border-none bg-transparent p-0 text-[10px] text-inherit"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
