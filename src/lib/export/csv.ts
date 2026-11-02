export interface CsvTaskRow {
  id: string;
  topicId: string;
  topicTitle: string;
  courseName: string;
  scheduledDate: string;
  scheduledHours: number;
  isReview: boolean;
  reviewDueDate?: string;
  status: string;
  actualHours?: number;
  confidence?: number;
  locked: boolean;
}

export interface CsvSessionRow {
  id: string;
  topicTitle: string;
  courseName: string;
  startedAt: string;
  endedAt?: string;
  actualHours?: number;
  confidence?: number;
  note?: string;
}

function esc(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function tasksToCsv(rows: CsvTaskRow[]): string {
  const header = [
    "Task ID","Topic ID","Topic","Course","Scheduled Date","Scheduled Hours","Review","Review Due","Status","Actual Hours","Confidence","Locked",
  ].join(",");
  const lines = rows.map((r) =>
    [
      esc(r.id), esc(r.topicId), esc(r.topicTitle), esc(r.courseName), esc(r.scheduledDate),
      esc(r.scheduledHours.toFixed(2)), esc(r.isReview ? "Yes" : "No"), esc(r.reviewDueDate ?? ""),
      esc(r.status), esc(r.actualHours != null ? r.actualHours.toFixed(2) : ""), esc(r.confidence ?? ""),
      esc(r.locked ? "Yes" : "No"),
    ].join(",")
  );
  return [header, ...lines].join("\r\n");
}

export function sessionsToCsv(rows: CsvSessionRow[]): string {
  const header = ["Session ID","Topic","Course","Started At","Ended At","Actual Hours","Confidence","Note"].join(",");
  const lines = rows.map((r) =>
    [
      esc(r.id), esc(r.topicTitle), esc(r.courseName), esc(r.startedAt), esc(r.endedAt ?? ""),
      esc(r.actualHours != null ? r.actualHours.toFixed(2) : ""), esc(r.confidence ?? ""), esc(r.note ?? ""),
    ].join(",")
  );
  return [header, ...lines].join("\r\n");
}
