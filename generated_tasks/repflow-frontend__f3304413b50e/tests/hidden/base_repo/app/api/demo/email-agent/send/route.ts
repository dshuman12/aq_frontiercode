import { NextRequest, NextResponse } from "next/server";
import { fetchBackend, generateThreadId, getServiceHeaders } from "../utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromEmail, toEmail, subject, content, threadId, creatorThresholds } =
      body || {};

    if (!fromEmail || !toEmail || !subject || !content) {
      return NextResponse.json(
        { error: "fromEmail, toEmail, subject, and content are required" },
        { status: 400 }
      );
    }

    const thread =
      threadId ||
      generateThreadId(
        fromEmail as string,
        toEmail as string,
        subject as string
      );

    // Build preferences_override from creatorThresholds if provided
    const preferencesOverride = creatorThresholds
      ? {
          absoluteMinimumRate: creatorThresholds.absoluteMinimumRate,
          autoRejectCategories: creatorThresholds.autoRejectCategories,
          partnershipTypes: creatorThresholds.partnershipTypes,
        }
      : undefined;

    const payload = {
      from: fromEmail,
      to: toEmail,
      subject,
      body: content,
      thread_id: thread,
      preferences_override: preferencesOverride,
    };

    const headers = getServiceHeaders();
    const res = await fetchBackend("/fsm/simulate/email", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend error: ${res.status} ${text}`);
    }

    const result = await res.json();
    const snapshot =
      result?.snapshot || {
        thread_id: result?.thread_id ?? thread,
        message_id: result?.message_id,
        lead: result?.lead,
        lead_state: result?.lead_state ?? result?.leadState,
        fsm_result: result?.fsm_result ?? result?.result,
        state_history: result?.state_history ?? result?.stateHistory ?? [],
        conversation_history:
          result?.conversation_history ?? result?.conversationHistory ?? "",
        reply_message: result?.reply_message,
      };

    const replyMessage =
      snapshot?.reply_message ||
      (snapshot?.fsm_result?.response_to_send
        ? {
            content: snapshot.fsm_result.response_to_send,
            sender_email: payload.to,
            recipient_email: payload.from,
            subject: payload.subject,
            direction: "outbound",
            timestamp: new Date().toISOString(),
          }
        : null);

    const normalizedSnapshot = {
      threadId: snapshot?.thread_id ?? snapshot?.threadId ?? thread,
      messageId: snapshot?.message_id ?? snapshot?.messageId,
      lead: snapshot?.lead ?? null,
      leadState: snapshot?.lead_state ?? snapshot?.leadState ?? null,
      fsmResult: snapshot?.fsm_result ?? snapshot?.fsmResult ?? null,
      stateHistory:
        snapshot?.state_history ?? snapshot?.stateHistory ?? ([] as unknown[]),
      conversationHistory:
        snapshot?.conversation_history ??
        snapshot?.conversationHistory ??
        "",
      reply: replyMessage,
    };

    return NextResponse.json({
      threadId: normalizedSnapshot.threadId,
      messageId: normalizedSnapshot.messageId,
      reply: normalizedSnapshot.reply,
      lead: normalizedSnapshot.lead,
      leadState: normalizedSnapshot.leadState,
      fsmResult: normalizedSnapshot.fsmResult,
      stateHistory: normalizedSnapshot.stateHistory,
      conversationHistory: normalizedSnapshot.conversationHistory,
      snapshot: normalizedSnapshot,
      raw: result,
    });
  } catch (err) {
    console.error("Error sending demo email", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
