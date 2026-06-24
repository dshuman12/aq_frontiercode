export interface NormalizedReceipt {
  transactionNumber: string;
  date: Date;
  amount: number;
  receiverAccount: string;
  receiverName: string;
  bankName?: string;
}

export type TelebirrReceipt = {
  transactionNumber: string;
  date: string;
  amount: string;
  senderAccount: string;
  receiverAccount: string;
  receiverName: string;
};

const pad = (n: number | string) => n.toString().padStart(2, '0');

export const safeParsDate = (raw: string | null | undefined): Date | null => {
  if (!raw?.trim()) return null;
  try {
    const d = parseDate(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export const parseDate = (raw: string): Date => {
  if (!raw?.trim()) throw new Error('Invalid date input: empty string');

  const cleaned = raw.trim();

  // ── eBirr: "2026-02-11 20:07:02 +0300 EAT" ──────────────────────────────
  // ISO date with space separator, numeric offset, and optional TZ abbreviation
  const ebirrMatch = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})/,
  );
  if (ebirrMatch) {
    const [, year, month, day, hour, minute, second, rawOffset] = ebirrMatch;
    const offset = rawOffset.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'); // +0300 → +03:00
    return new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`,
    );
  }

  // ── Telebirr: "18-03-2026 21:46:09" ─────────────────────────────────────
  const telebirrMatch = cleaned.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (telebirrMatch) {
    const [, day, month, year, hour, minute, second] = telebirrMatch;
    return new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`,
    );
  }

  // ── CBE: "3/11/2026, 6:15:00 PM" ────────────────────────────────────────
  const cbeMatch = cleaned.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (cbeMatch) {
    const [, month, day, year, rawHour, minute, second, meridiem] = cbeMatch;
    let h = parseInt(rawHour, 10);
    if (meridiem.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (meridiem.toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(
      `${year}-${pad(month)}-${pad(day)}T${pad(h)}:${minute}:${second}+03:00`,
    );
  }

  // ── BOA: "23/01/26 14:04" or "23/01/2026 14:04" ─────────────────────────
  const boaMatch = cleaned.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})$/,
  );
  if (boaMatch) {
    const [, day, month, shortYear, hour, minute] = boaMatch;
    const year = shortYear.length === 2 ? `20${shortYear}` : shortYear;
    return new Date(
      `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${minute}:00+03:00`,
    );
  }

  throw new Error(`Unsupported date format: "${raw}"`);
};
