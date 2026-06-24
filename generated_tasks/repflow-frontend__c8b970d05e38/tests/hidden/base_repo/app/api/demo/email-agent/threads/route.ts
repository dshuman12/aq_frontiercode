import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getServiceHeaders } from "../utils";

type SimpleMessage = {
  thread_id: string;
  subject?: string;
  content?: string;
  sender_email?: string;
  recipient_email?: string;
  timestamp?: string;
};

export async function GET(_req: NextRequest) {
  try {
    const headers = getServiceHeaders();
    const res = await fetchBackend(`/simple-messages/?limit=200`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${res.status} ${text}`);
    }
    const messages: SimpleMessage[] = await res.json();

    const grouped = new Map<
      string,
      {
        subject?: string;
        lastMessage?: string;
        lastTimestamp?: string;
        fromEmail?: string;
        toEmail?: string;
        messageCount: number;
      }
    >();

    messages.forEach((msg) => {
      if (!msg.thread_id) return;
      const existing = grouped.get(msg.thread_id) || {
        messageCount: 0,
      };
      const ts = msg.timestamp;
      if (!existing.lastTimestamp || (ts && ts > existing.lastTimestamp)) {
        existing.lastTimestamp = ts;
        existing.subject = msg.subject || existing.subject;
        existing.lastMessage = msg.content || existing.lastMessage;
        existing.fromEmail = msg.sender_email || existing.fromEmail;
        existing.toEmail = msg.recipient_email || existing.toEmail;
      }
      existing.messageCount += 1;
      grouped.set(msg.thread_id, existing);
    });

    const threads = Array.from(grouped.entries())
      .map(([threadId, data]) => ({
        threadId,
        ...data,
      }))
      .sort((a, b) => {
        const ta = a.lastTimestamp || "";
        const tb = b.lastTimestamp || "";
        return ta < tb ? 1 : ta > tb ? -1 : 0;
      });

    return NextResponse.json({ threads });
  } catch (err) {
    console.error("Error listing threads", err);
    const message =
      err instanceof Error ? err.message : "Failed to list threads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
