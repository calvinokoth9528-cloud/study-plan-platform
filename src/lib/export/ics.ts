export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  color?: string;
  isReview?: boolean;
}

function escape(str: string): string {
  return str.replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "T" + p(d.getUTCHours()) + p(d.getUTCMinutes()) + "00Z";
}

function formatNow(): string {
  return formatDateTime(new Date());
}

export function generateIcs(events: IcsEvent[]): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Study Plan Platform//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("X-WR-CALNAME:Study Plan");
  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + ev.uid);
    lines.push("DTSTAMP:" + formatNow());
    lines.push("DTSTART:" + formatDateTime(ev.start));
    lines.push("DTEND:" + formatDateTime(ev.end));
    lines.push("SUMMARY:" + escape(ev.summary));
    if (ev.description) lines.push("DESCRIPTION:" + escape(ev.description));
    lines.push("X-WR-TAG:" + (ev.isReview ? "review" : "study"));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
