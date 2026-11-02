"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";

export interface TimerTask {
  id: string;
  topicTitle: string;
  scheduledDate: string;
  status: string;
}

interface TimerState {
  taskId: string;
  elapsedMs: number; // accumulated in previous runs
  runningAt: number | null; // epoch ms when current run started, null = paused
}

const STORAGE_KEY = "studyplan-timer-v1";

function loadState(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimerState;
    if (!parsed || typeof parsed.taskId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (h > 0 ? `${h}:${String(m).padStart(2, "0")}` : m) + ":" + String(s).padStart(2, "0");
}

export function StudyTimer({ tasks }: { tasks: TimerTask[] }) {
  const [state, setState] = useState<TimerState | null>(null);
  const [open, setOpen] = useState(false);
  const [, forceTick] = useState(0);
  const loaded = useRef(false);

  // Restore an in-flight timer across reloads.
  useEffect(() => {
    setState(loadState());
    loaded.current = true;
  }, []);

  // Tick once per second while any timer exists.
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (!loaded.current) return;
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [state]);

  const openTasks = useMemo(
    () =>
      tasks.filter((t) => t.status !== "done").sort((a, b) => {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }),
    [tasks]
  );

  const activeTask = state ? tasks.find((t) => t.id === state.taskId) ?? null : null;
  const elapsed =
    state && activeTask
      ? state.elapsedMs + (state.runningAt ? Math.max(0, Date.now() - state.runningAt) : 0)
      : 0;

  const running = Boolean(state?.runningAt);

  function start(taskId?: string) {
    const target = taskId ?? activeTask?.id ?? openTasks[0]?.id;
    if (!target) return;
    // Swap task while a run is active: bank the current run first.
    if (state && state.taskId !== target) {
      const banked: TimerState = {
        taskId: target,
        elapsedMs: state.elapsedMs + (state.runningAt ? Math.max(0, Date.now() - state.runningAt) : 0),
        runningAt: Date.now(),
      };
      setState(banked);
      return;
    }
    setState({
      taskId: target,
      elapsedMs: state?.elapsedMs ?? 0,
      runningAt: state?.runningAt ?? Date.now(),
    });
    setOpen(true);
  }

  function pause() {
    if (!state) return;
    setState({ ...state, elapsedMs: elapsed, runningAt: null });
  }

  async function stop(keep = true) {
    if (!state || !activeTask) return;
    const totalMs = elapsed;
    setState(null);
    if (!keep) return;

    const hours = Math.round((totalMs / 3600000) * 100) / 100;
    const endedAt = new Date();
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planTaskId: activeTask.id,
        startedAt: new Date(endedAt.getTime() - totalMs).toISOString(),
        endedAt: endedAt.toISOString(),
        actualHours: Math.max(hours, 0.02),
      }),
    });
    window.location.reload();
  }

  const idle = !state;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {(!idle || open) && (
        <div className="w-72 rounded-xl border border-border bg-surface p-4 shadow-lg">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Study timer
          </div>

          {state && state.taskId && (
            <div className="mb-2 truncate text-sm font-medium text-text-primary">
              {activeTask?.topicTitle ?? "Task"}
            </div>
          )}

          <div className="mb-3 text-center text-3xl font-semibold tabular-nums text-text-primary">
            {fmt(elapsed)}
          </div>

          {state ? (
            <div className="flex items-center justify-center gap-2">
              {running ? (
                <Button size="sm" onClick={pause}>Pause</Button>
              ) : (
                <Button size="sm" onClick={() => start()}>Resume</Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => stop(true)}>
                Log & stop
              </Button>
              <Button variant="ghost" size="sm" onClick={() => stop(false)}>
                Discard
              </Button>
            </div>
          ) : (
            open && (
              <div className="flex flex-col gap-2">
                <select
                  onChange={(e) => start(e.target.value)}
                  value=""
                  className="w-full cursor-pointer rounded-lg border border-border bg-bg-secondary px-2 py-1.5 text-sm text-text-primary"
                  aria-label="Pick a task to start"
                >
                  <option value="" disabled>
                    Pick a task…
                  </option>
                  {openTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.topicTitle} ({t.scheduledDate.slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {state && openTasks.length > 1 && (
            <select
              value={state.taskId}
              onChange={(e) => {
                const target = tasks.find((t) => t.id === e.target.value);
                if (target) start(target.id);
              }}
              className="mt-2 w-full cursor-pointer rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs text-text-secondary"
              aria-label="Switch task"
            >
              {openTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.topicTitle} ({t.scheduledDate.slice(0, 10)})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => (idle ? setOpen((v) => !v) : setOpen(true))}
        aria-label={idle ? "Open study timer" : "View running study timer"}
        className={
          "flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg transition-transform hover:scale-105 " +
          (idle ? "bg-surface border border-border" : "bg-accent text-white animate-pulse")
        }
      >
        {idle ? "⏱" : fmt(elapsed).split(":").slice(0, 2).join(":")}
      </button>
    </div>
  );
}
