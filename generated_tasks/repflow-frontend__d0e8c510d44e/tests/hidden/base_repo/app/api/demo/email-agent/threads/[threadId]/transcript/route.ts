import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getServiceHeaders } from "../../../utils";

type SimpleMessage = {
  sender_email?: string;
  recipient_email?: string;
  subject?: string;
  content?: string;
  timestamp?: string;
  direction?: string;
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params;
    const headers = getServiceHeaders();
    const res = await fetchBackend(
      `/simple-messages/thread/${encodeURIComponent(threadId)}?limit=500`,
      { method: "GET", headers, cache: "no-store" }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${res.status} ${text}`);
    }
    const messages: SimpleMessage[] = await res.json();
    const lines: string[] = [];
    messages.forEach((msg, idx) => {
      lines.push(`--- Message ${idx + 1} (${msg.direction || "unknown"}) ---`);
      lines.push(`From: ${msg.sender_email || "?"}`);
      lines.push(`To: ${msg.recipient_email || "?"}`);
      if (msg.subject) lines.push(`Subject: ${msg.subject}`);
      if (msg.timestamp) lines.push(`Date: ${msg.timestamp}`);
      lines.push("");
      lines.push(msg.content || "");
      lines.push("");
    });
    const body = lines.join("\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="repflow-thread-${threadId}.txt"`,
      },
    });
  } catch (err) {
    console.error("Error generating transcript", err);
    return NextResponse.json(
      { error: "Failed to generate transcript" },
      { status: 500 }
    );
  }
}
