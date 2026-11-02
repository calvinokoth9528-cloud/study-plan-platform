// Pure helpers to build the daily study-reminder digest. No network, no DB:
// route code feeds in plan tasks scheduled for today, this produces the
// subject + HTML email body for the Resend send.

export interface ReminderTask {
  topicTitle: string;
  courseName: string;
  courseColor: string;
  scheduledHours: number;
  isReview: boolean;
  status: string;
}

export interface ReminderDigest {
  userName: string | null;
  day: string; // YYYY-MM-DD
  tasks: ReminderTask[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtHours(h: number): string {
  return (h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)) + "h";
}

function statusLabel(status: string): string {
  switch (status) {
    case "done":
      return "done ✓";
    case "in_progress":
      return "in progress";
    case "partial":
      return "partially done";
    default:
      return "to go";
  }
}

function reviewBadge(isReview: boolean): string {
  return isReview
    ? ' <span style="font-size:11px;background:#6366f11a;color:#6366f1;border-radius:4px;padding:1px 6px;">FSRS review</span>'
    : "";
}

export function subjectFor(digest: ReminderDigest): string {
  const total = digest.tasks.reduce((s, t) => s + t.scheduledHours, 0);
  const greeting = digest.userName ? `${digest.userName.split(" ")[0]}'s` : "Your";
  return `${greeting} study plan for today: ${fmtHours(total)}, ${digest.tasks.length} task${digest.tasks.length === 1 ? "" : "s"}`;
}

export function htmlFor(digest: ReminderDigest): string {
  const total = digest.tasks.reduce((s, t) => s + t.scheduledHours, 0);
  const rows = digest.tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef2f7;">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${t.courseColor};"></span>
            <div>
              <div style="font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(t.topicTitle)}${reviewBadge(t.isReview)}</div>
              <div style="font-size:12px;color:#64748b;">${escapeHtml(t.courseName)} · ${fmtHours(t.scheduledHours)} · ${statusLabel(t.status)}</div>
            </div>
          </div>
        </td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#6366f1;color:#ffffff;padding:16px 20px;">
        <div style="font-size:16px;font-weight:700;">Study Plan — today</div>
        <div style="font-size:12px;opacity:.9;">${escapeHtml(digest.day)} · ${fmtHours(total)} planned · ${digest.tasks.length} task${digest.tasks.length === 1 ? "" : "s"}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <div style="padding:14px 20px;font-size:12px;color:#94a3b8;">
        Open your plan to log sessions and mark tasks done.<br/>
        <a href="#" style="color:#6366f1;">View in Study Plan Platform</a>
      </div>
    </div>
  </div>`;
}

export function textFor(digest: ReminderDigest): string {
  const lines = digest.tasks.map(
    (t) => `- ${t.topicTitle} (${t.courseName}) ${fmtHours(t.scheduledHours)} [${statusLabel(t.status)}]`
  );
  const hi = digest.userName ? `Hi ${digest.userName.split(" ")[0]},` : "Hi,";
  return `${hi}\n\nHere's your study plan for ${digest.day}:\n\n${lines.join("\n")}\n\nOpen the app to log sessions.`;
}
