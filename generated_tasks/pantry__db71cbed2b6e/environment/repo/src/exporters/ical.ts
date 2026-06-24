// Export the meal plan as iCalendar (.ics) so a phone can subscribe.

import type { PlanEntry } from "../core/menu.js";

const PRODID = "-//pantry//cooking plan//EN";

export function render(entries: PlanEntry[]): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:${PRODID}`);
  for (const e of entries) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid(e)}`);
    lines.push(`SUMMARY:${escape(e.recipeSlug)} (${escape(e.meal)})`);
    if (e.notes) lines.push(`DESCRIPTION:${escape(e.notes)}`);
    lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`);
    lines.push(`DTEND;VALUE=DATE:${e.date.replace(/-/g, "")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function uid(e: PlanEntry): string {
  return `${e.date}-${e.meal}-${e.recipeSlug}@pantry`;
}

function escape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}
