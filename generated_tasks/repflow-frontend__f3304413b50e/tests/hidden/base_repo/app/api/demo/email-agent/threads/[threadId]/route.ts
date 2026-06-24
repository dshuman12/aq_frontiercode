import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, getServiceHeaders } from "../../utils";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await context.params;
    const headers = getServiceHeaders();
    const res = await fetchBackend(
      `/simple-messages/thread/${encodeURIComponent(threadId)}?limit=200`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${res.status} ${text}`);
    }
    const messages = await res.json();
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Error fetching thread messages", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
