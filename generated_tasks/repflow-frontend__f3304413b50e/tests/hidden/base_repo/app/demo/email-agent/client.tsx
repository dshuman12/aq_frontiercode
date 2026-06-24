"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Briefcase,
    Building2,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Copy,
    Ghost,
    Globe,
    History as HistoryIcon,
    LayoutDashboard,
    Loader2,
    LogOut,
    Mail,
    Plus,
    RefreshCw,
    Send,
    Settings2,
    Sparkles,
    User,
    X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const generateFromEmail = () =>
  `lead+${crypto.randomUUID().slice(0, 8)}@example.com`;

const DEFAULT_TO = "daniel@reeflabs.io";
const DEFAULT_SUBJECT = "Demo: Sponsorship inquiry";
const DEFAULT_BODY =
  "Hi Repflow,\n\nWe'd like to explore a paid collaboration. Could you share next steps?";

type ConversationMessage = {
  id: string;
  threadId?: string;
  direction: "inbound" | "outbound";
  sender?: string;
  recipient?: string;
  subject?: string;
  content: string;
  timestamp: string;
};

type FsmResult = {
  success?: boolean;
  new_state?: string;
  trigger?: string;
  response_to_send?: string;
  should_send_email?: boolean;
  should_route_to_creator?: boolean;
  metadata?: Record<string, unknown> | null;
  error?: string | null;
};

type StateHistoryEntry = {
  from?: string;
  to?: string;
  trigger?: string;
  event?: string;
  timestamp?: string;
  metadata?: Record<string, unknown> | null;
};

type LeadSnapshot = {
  email?: string;
  thread_id?: string;
  status?: string;
  processing_state?: string;
  state_metadata?: Record<string, unknown> | null;
  deal_id?: string | null;
  follow_up_count?: number;
  negotiation_round?: number;
  retry_count?: number;
  last_state_change?: string;
  created_at?: string;
  updated_at?: string;
  brand_name?: string | null;
  brand_category?: string | null;
  brand_website?: string | null;
  budget?: string | null;
  deadline?: string | null;
  deal_type?: string | null;
  contact_type?: string | null;
};

type ThreadSnapshot = {
  threadId?: string;
  messageId?: string;
  lead?: LeadSnapshot | null;
  leadState?: string | null;
  fsmResult?: FsmResult | null;
  stateHistory?: StateHistoryEntry[];
  conversationHistory?: string;
  reply?: SendResponse["reply"];
};

type SendResponse = {
  threadId?: string;
  messageId?: string;
  reply?: {
    content?: string;
    sender_email?: string;
    recipient_email?: string;
    subject?: string;
    timestamp?: string;
    direction?: string;
    message_id?: string;
  } | null;
  lead?: LeadSnapshot | null;
  leadState?: string | null;
  fsmResult?: FsmResult | null;
  stateHistory?: StateHistoryEntry[];
  conversationHistory?: string;
  raw?: unknown;
  snapshot?: ThreadSnapshot | null;
};

// Creator thresholds configuration
type PartnershipTypes = {
  flatRate: boolean;
  affiliate: boolean;
  performanceHybrid: boolean;
  custom: boolean;
};

type CreatorThresholds = {
  absoluteMinimumRate: number;
  autoRejectCategories: string[];
  partnershipTypes: PartnershipTypes;
};

// Default thresholds matching production defaults from database/models/user.py
const DEFAULT_THRESHOLDS: CreatorThresholds = {
  absoluteMinimumRate: 1000,
  autoRejectCategories: [
    "Nutritional Supplements",
    "Crypto/Blockchain/NFTs",
    "Video Games",
  ],
  partnershipTypes: {
    flatRate: true,
    affiliate: true,
    performanceHybrid: false,
    custom: false,
  },
};

function nowIso() {
  return new Date().toISOString();
}



function deriveMissingFields(snapshot: ThreadSnapshot | null): string[] {
  if (!snapshot) return [];
  const fromMetadata = snapshot.fsmResult?.metadata as
    | { missing_fields?: unknown }
    | undefined;
  const fromLeadMeta = snapshot.lead?.state_metadata as
    | { missing_fields?: unknown }
    | undefined;
  const missing =
    (Array.isArray(fromMetadata?.missing_fields)
      ? fromMetadata?.missing_fields
      : Array.isArray(fromLeadMeta?.missing_fields)
        ? fromLeadMeta?.missing_fields
        : []) || [];
  return missing.filter((item): item is string => typeof item === "string");
}

function normalizeStateHistory(
  entries: unknown
): StateHistoryEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => ({
    from: (entry as any)?.from,
    to: (entry as any)?.to,
    trigger: (entry as any)?.trigger,
    event: (entry as any)?.event,
    timestamp: (entry as any)?.timestamp,
    metadata: (entry as any)?.metadata ?? null,
  }));
}

function normalizeThreadSnapshot(
  data: SendResponse,
  defaults: { threadId?: string; fromEmail: string; toEmail: string; subject: string }
): ThreadSnapshot {
  const raw = (data.raw as any) || {};
  const base = data.snapshot || {};
  const fsmResult =
    data.fsmResult ??
    (base as any)?.fsmResult ??
    (base as any)?.fsm_result ??
    raw?.fsm_result ??
    raw?.result ??
    null;

  const reply =
    data.reply ??
    (base as any)?.reply ??
    raw?.reply_message ??
    (fsmResult?.response_to_send
      ? {
          content: fsmResult.response_to_send as string,
          sender_email: defaults.toEmail,
          recipient_email: defaults.fromEmail,
          subject: defaults.subject,
          direction: "outbound",
          timestamp: new Date().toISOString(),
          message_id: raw?.message_id,
        }
      : null);

  return {
    threadId:
      data.threadId ||
      (base as any)?.threadId ||
      (base as any)?.thread_id ||
      raw?.thread_id ||
      defaults.threadId ||
      "",
    messageId:
      data.messageId ||
      (base as any)?.messageId ||
      (base as any)?.message_id ||
      raw?.message_id,
    lead: data.lead ?? (base as any)?.lead ?? raw?.lead ?? null,
    leadState:
      data.leadState ??
      (base as any)?.leadState ??
      (base as any)?.lead_state ??
      raw?.lead_state ??
      raw?.leadState ??
      null,
    fsmResult: fsmResult ?? undefined,
    stateHistory: normalizeStateHistory(
      data.stateHistory ??
        (base as any)?.stateHistory ??
        (base as any)?.state_history ??
        raw?.state_history ??
        []
    ),
    conversationHistory:
      data.conversationHistory ??
      (base as any)?.conversationHistory ??
      (base as any)?.conversation_history ??
      raw?.conversation_history ??
      "",
    reply: reply ?? undefined,
  };
}

export default function EmailAgentClient({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [fromEmail, setFromEmail] = useState(() => generateFromEmail());
  const [toEmail, setToEmail] = useState(DEFAULT_TO);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [threadId, setThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [threadSnapshot, setThreadSnapshot] = useState<ThreadSnapshot | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Creator thresholds state
  const [thresholds, setThresholds] = useState<CreatorThresholds>(
    () => structuredClone(DEFAULT_THRESHOLDS)
  );
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages]);

  const canSend = useMemo(
    () => !!fromEmail && !!toEmail && !!subject && !!body && !sending,
    [body, fromEmail, sending, subject, toEmail]
  );

  const missingFields = useMemo(
    () => deriveMissingFields(threadSnapshot),
    [threadSnapshot]
  );

  const appendMessage = (message: ConversationMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const resetConversation = () => {
    setMessages([]);
    setThreadId("");
    setFromEmail(generateFromEmail());
    setSubject(DEFAULT_SUBJECT);
    setBody(DEFAULT_BODY);
    setThreadSnapshot(null);
  };

  // Threshold management helpers
  const addRejectCategory = useCallback(() => {
    const trimmed = newCategory.trim();
    if (trimmed && !thresholds.autoRejectCategories.includes(trimmed)) {
      setThresholds((prev) => ({
        ...prev,
        autoRejectCategories: [...prev.autoRejectCategories, trimmed],
      }));
      setNewCategory("");
    }
  }, [newCategory, thresholds.autoRejectCategories]);

  const removeRejectCategory = useCallback((category: string) => {
    setThresholds((prev) => ({
      ...prev,
      autoRejectCategories: prev.autoRejectCategories.filter(
        (c) => c !== category
      ),
    }));
  }, []);

  const updatePartnershipType = useCallback(
    (key: keyof PartnershipTypes, value: boolean) => {
      setThresholds((prev) => ({
        ...prev,
        partnershipTypes: {
          ...prev.partnershipTypes,
          [key]: value,
        },
      }));
    },
    []
  );

  const resetThresholds = useCallback(() => {
    setThresholds(structuredClone(DEFAULT_THRESHOLDS));
    toast({
      title: "Thresholds reset",
      description: "Creator thresholds have been reset to defaults.",
    });
  }, [toast]);

  const handleSend = async () => {
    if (!fromEmail || !toEmail || !subject || !body) {
      toast({
        title: "Missing fields",
        description: "From, To, Subject, and Body are required.",
        variant: "destructive",
      });
      return;
    }

    const outboundMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      direction: "inbound",
      sender: fromEmail,
      recipient: toEmail,
      subject,
      content: body,
      timestamp: nowIso(),
      threadId: threadId || undefined,
    };

    appendMessage(outboundMessage);
    setSending(true);

    try {
      const res = await fetch("/api/demo/email-agent/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail,
          toEmail,
          subject,
          content: body,
          threadId: threadId || undefined,
          creatorThresholds: thresholds,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send message");
      }

      const data: SendResponse = await res.json();
      const snapshot = normalizeThreadSnapshot(data, {
        threadId,
        fromEmail,
        toEmail,
        subject,
      });

      const newThreadId = snapshot.threadId || threadId;
      if (newThreadId) {
        setThreadId(newThreadId);
      }

      const replyMessage = snapshot.reply;
      if (replyMessage?.content) {
        appendMessage({
          id: replyMessage.message_id || crypto.randomUUID(),
          direction:
            (replyMessage.direction as "inbound" | "outbound") || "outbound",
          sender: replyMessage.sender_email || "Repflow AI",
          recipient: replyMessage.recipient_email || fromEmail,
          subject: replyMessage.subject || subject,
          content: replyMessage.content,
          timestamp: replyMessage.timestamp || nowIso(),
          threadId: newThreadId,
        });
      }

      setThreadSnapshot(snapshot);

      toast({
        title: "Simulated",
        description: newThreadId
          ? `Thread ${newThreadId} updated`
          : "Message sent to AI simulator",
      });
      setBody("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Send failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const copyDebugInfo = () => {
    if (!threadSnapshot) return;
    
    // Construct a debug object that explicitly includes the AI's reply
    // alongside the context window that was sent to the FSM.
    const debugData = {
      timestamp: new Date().toISOString(),
      threadId: threadSnapshot.threadId,
      leadState: threadSnapshot.leadState,
      lead: threadSnapshot.lead,
      fsmResult: threadSnapshot.fsmResult,
      // The conversation history sent TO the FSM (usually ends with user message)
      contextWindow: threadSnapshot.conversationHistory,
      // The reply generated BY the FSM (the new response)
      latestAiReply: threadSnapshot.reply,
      fullStateHistory: threadSnapshot.stateHistory
    };

    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    toast({
      title: "Debug Info Copied",
      description: "Thread state and AI response copied to clipboard.",
    });
  };

  const renderMessage = (message: ConversationMessage) => {
    const isAi = message.direction === "outbound";
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isAi ? "" : "flex-row-reverse"}`}
      >
        <div
          className={`rounded-2xl border px-4 py-3 max-w-3xl ${
            isAi
              ? "bg-white border-gray-200"
              : "bg-figma-green-primary text-black border-figma-green-primary"
          }`}
        >
          <div className="flex items-center justify-between gap-3 text-xs mb-1">
            <span className="font-medium">
              {isAi ? "Repflow AI" : message.sender || "Lead"}
            </span>
            <span className={isAi ? "text-gray-500" : "text-black/80"}>
              {new Date(message.timestamp).toLocaleString()}
            </span>
          </div>
          <div className="whitespace-pre-line text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">
              Email Agent Demo
            </h1>
            <Badge variant="secondary">Sandbox only</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetConversation}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <form action={onSignOut}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-1" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversation</CardTitle>
            <p className="text-xs text-gray-500">
              Mssages stay local, but the backend still records lead/deal
              updates.
            </p>
          </CardHeader>
          <CardContent>
            <div
              ref={scrollRef}
              className="h-[320px] border rounded-lg bg-white overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-12">
                    No messages yet. Compose below to start the simulation.
                  </div>
                ) : (
                  messages.map(renderMessage)
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compose as the lead</CardTitle>
            <p className="text-xs text-gray-500">
              Posts to the simulator endpoint and surfaces the AI reply inline.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {!threadId && (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">From</label>
                    <Input
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="lead@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">
                      To (Repflow)
                    </label>
                    <Input
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder="creator@repflow.me"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Sponsorship inquiry"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">
                    Thread ID (keep to continue same scenario)
                  </label>
                  <Input
                    value={threadId}
                    onChange={(e) => setThreadId(e.target.value)}
                    placeholder="Leave blank to start a new thread"
                  />
                </div>
              </>
            )}
            {threadId ? (
              <Badge variant="outline" className="text-xs">
                Replying in thread {threadId}
              </Badge>
            ) : null}
            <div className="space-y-1">
              <label className="text-xs text-gray-600">Message</label>
              <Textarea
                className="min-h-[180px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSend}
                disabled={!canSend}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to AI simulator
              </Button>
              <Badge variant="outline" className="text-xs">
                {threadId ? `Thread ${threadId}` : "New thread"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-2 border-slate-100 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <LayoutDashboard className="h-5 w-5 text-slate-500" />
                    Thread Status & Decisions
                  </CardTitle>
                   {threadSnapshot && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-slate-600" 
                      onClick={copyDebugInfo}
                      title="Copy Debug Info"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                   )}
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Real-time persistence and FSM decision engine analysis
                </p>
              </div>
              {threadSnapshot && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-white">
                    {threadSnapshot.threadId
                      ? `Thread ${threadSnapshot.threadId.slice(0, 8)}...`
                      : "Pending"}
                  </Badge>
                  {threadSnapshot.leadState && (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 shadow-none">
                      {threadSnapshot.leadState}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-white">
                    {threadSnapshot.lead?.follow_up_count ?? 0} Follow-ups
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {threadSnapshot ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                {/* Main Content: Lead Info */}
                <div className="lg:col-span-2 p-6 space-y-8">
                  {/* Top Row: Core Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1: Contact & Brand */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
                        <User className="h-4 w-4 text-slate-500" />
                        Contact Profile
                      </h4>
                      
                      <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-2 text-sm">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-slate-900 break-all text-right md:text-left">
                          {threadSnapshot.lead?.email || "—"}
                        </span>
                        
                        <span className="text-slate-500">Brand Name</span>
                        <span className="font-medium text-slate-900 text-right md:text-left">
                          {threadSnapshot.lead?.brand_name || "—"}
                        </span>

                        <span className="text-slate-500">Contact Type</span>
                        <div className="flex justify-end md:justify-start">
                           {threadSnapshot.lead?.contact_type ? (
                              <Badge 
                                variant="secondary"
                                className={
                                  threadSnapshot.lead.contact_type === "Agency" 
                                    ? "bg-purple-100 text-purple-700 hover:bg-purple-100 border-transparent text-[11px] h-5 px-2" 
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-100 border-transparent text-[11px] h-5 px-2"
                                }
                              >
                                {threadSnapshot.lead.contact_type}
                              </Badge>
                           ) : (
                             <span className="text-slate-400">—</span>
                           )}
                        </div>

                        <span className="text-slate-500">Website</span>
                        <div className="flex justify-end md:justify-start">
                          {threadSnapshot.lead?.brand_website ? (
                             <a href={threadSnapshot.lead.brand_website.startsWith('http') ? threadSnapshot.lead.brand_website : `https://${threadSnapshot.lead.brand_website}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {threadSnapshot.lead.brand_website}
                             </a>
                          ) : (
                            <span className="font-medium text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Deal & Logistics */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
                        <Briefcase className="h-4 w-4 text-slate-500" />
                        Deal Parameters
                      </h4>
                      
                       <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-2 text-sm">
                        <span className="text-slate-500">Status</span>
                        <div className="flex justify-end md:justify-start">
                           <Badge variant="outline" className="font-normal text-slate-600 bg-slate-50">
                             {threadSnapshot.lead?.status || "—"}
                           </Badge>
                        </div>
                        
                        <span className="text-slate-500">Processing</span>
                        <span className="font-medium text-slate-900 text-right md:text-left">
                             {threadSnapshot.lead?.processing_state || "—"}
                        </span>
                        
                        <span className="text-slate-500 self-start mt-0.5">Budget</span>
                        <span className="font-medium text-slate-900 text-right md:text-left leading-snug">
                             {threadSnapshot.lead?.budget || "—"}
                        </span>

                        <span className="text-slate-500 self-start mt-0.5">Deadline</span>
                        <span className="font-medium text-slate-900 text-right md:text-left leading-snug">
                             {threadSnapshot.lead?.deadline || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Intelligence Section */}
                  {(threadSnapshot.lead?.state_metadata as any)?.brand_research && (
                    <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-4">
                       <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-indigo-100 rounded-md">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                             </div>
                             <div>
                                <h4 className="text-sm font-semibold text-indigo-900">AI Intelligence Applied</h4>
                                <p className="text-xs text-indigo-700 opacity-80">
                                   Confidence Score: {((threadSnapshot.lead?.state_metadata as any)?.brand_research?.confidence * 100).toFixed(0)}%
                                </p>
                             </div>
                          </div>
                       </div>
                       
                       <p className="text-sm text-slate-700 leading-relaxed mb-4 pl-1">
                          {(threadSnapshot.lead?.state_metadata as any)?.brand_research?.description}
                       </p>

                        {(threadSnapshot.lead?.state_metadata as any)?.brand_research?.is_agency_email && (
                            <div className="flex items-start gap-3 bg-white/60 rounded-md border border-indigo-100 p-3">
                               <Building2 className="h-4 w-4 text-indigo-500 mt-0.5" />
                               <div className="space-y-1">
                                  <p className="text-xs font-semibold text-indigo-900">Agency Detected: {(threadSnapshot.lead?.state_metadata as any)?.brand_research?.agency_name}</p>
                                  {(threadSnapshot.lead?.state_metadata as any)?.brand_research?.extracted_brands?.length > 0 && (
                                     <p className="text-xs text-slate-600">
                                        Representing: <span className="font-medium">{(threadSnapshot.lead?.state_metadata as any)?.brand_research?.extracted_brands?.join(", ")}</span>
                                     </p>
                                  )}
                               </div>
                            </div>
                        )}
                    </div>
                  )}
                  
                  {/* Conversation History (Raw) */}
                   <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                         Context Window
                      </h4>
                      <Badge variant="outline" className="text-[10px] h-5 font-normal text-slate-500">
                         Last sent to FSM
                      </Badge>
                    </div>
                    {threadSnapshot.conversationHistory ? (
                      <div className="rounded-md bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600 p-3 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {threadSnapshot.conversationHistory}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No context available.</p>
                    )}
                  </div>

                </div>

                {/* Right Sidebar: Decisions & Timeline */}
                <div className="bg-slate-50/40 p-6 space-y-6">
                  {/* FSM Decision Block */}
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      FSM Decision
                    </h4>
                    
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-medium">New State</span>
                          <span className="text-xs font-bold text-slate-800">{threadSnapshot.fsmResult?.new_state || "NO_CHANGE"}</span>
                       </div>
                       <div className="p-3 space-y-3">
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Trigger</span>
                             <code className="bg-slate-100 px-1 rounded text-slate-700">{threadSnapshot.fsmResult?.trigger || "none"}</code>
                          </div>
                           <div className="flex justify-between text-xs items-center">
                             <span className="text-slate-500">Auto-Reply</span>
                             {threadSnapshot.fsmResult?.should_send_email ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px] h-5">Yes</Badge>
                             ) : (
                                <Badge variant="secondary" className="text-slate-500 text-[10px] h-5">No</Badge>
                             )}
                          </div>
                          <div className="flex justify-between text-xs items-center">
                             <span className="text-slate-500">Route to Creator</span>
                             <span className={threadSnapshot.fsmResult?.should_route_to_creator ? "text-green-600 font-bold" : "text-slate-400"}>
                                {threadSnapshot.fsmResult?.should_route_to_creator ? "Yes" : "No"}
                             </span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Missing Fields */}
                  <div className="space-y-2">
                     <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                        Missing Data
                        {missingFields.length > 0 && <span className="text-red-500 text-[10px]">{missingFields.length} items</span>}
                     </h4>
                     
                     {missingFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                           {missingFields.map(f => (
                              <Badge key={f} variant="outline" className="border-red-100 bg-red-50 text-red-700 hover:bg-red-50">
                                 {f}
                              </Badge>
                           ))}
                        </div>
                     ) : (
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-1.5 rounded-md">
                           <CheckCircle2 className="h-3 w-3" />
                           Data complete
                        </div>
                     )}
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3 pt-2">
                     <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <HistoryIcon className="h-4 w-4 text-slate-400" />
                        Transition Log
                     </h4>
                     
                     <div className="relative pl-3 space-y-4 before:absolute before:left-[5px] before:top-1 before:bottom-0 before:w-px before:bg-slate-200">
                        {threadSnapshot.stateHistory && threadSnapshot.stateHistory.length > 0 ? (
                           threadSnapshot.stateHistory.map((entry, idx) => (
                              <div key={`${entry.timestamp}-${idx}`} className="relative pl-4">
                                 <div className="absolute left-[-2px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                                 <div className="text-xs font-medium text-slate-800">
                                    {entry.from === "None" ? "Start" : entry.from} → {entry.to}
                                 </div>
                                 <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                                    <span>{new Date(entry.timestamp || "").toLocaleTimeString()}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-mono text-slate-600">{entry.trigger}</span>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="text-xs text-slate-400 pl-4 py-2 italic">
                              No transitions recorded.
                           </div>
                        )}
                     </div>
                  </div>

                </div>
              </div>
            ) : (
               <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/30">
                  <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                     <Ghost className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="max-w-xs px-4">
                     <p className="text-slate-900 font-medium">Awaiting Simulation</p>
                     <p className="text-xs text-slate-500 mt-1">
                        Send a message above to initialize the lead state machine and see decision logic here.
                     </p>
                  </div>
               </div>
            )}
          </CardContent>
        </Card>

        {/* Creator Thresholds Configuration */}
        <Collapsible open={thresholdsOpen} onOpenChange={setThresholdsOpen}>
          <Card>
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-gray-600" />
                    <CardTitle className="text-base">
                      Creator Thresholds
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      ${thresholds.absoluteMinimumRate.toLocaleString()} min
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {thresholdsOpen ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <p className="text-xs text-gray-500 mt-1">
                Configure qualifying thresholds the AI uses to evaluate leads
              </p>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                {/* Minimum Rate */}
                <div className="space-y-2">
                  <Label htmlFor="minRate" className="text-sm font-medium">
                    Absolute Minimum Rate ($)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="minRate"
                      type="number"
                      min={0}
                      step={100}
                      value={thresholds.absoluteMinimumRate}
                      onChange={(e) =>
                        setThresholds((prev) => ({
                          ...prev,
                          absoluteMinimumRate:
                            parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-xs text-gray-500">
                      Leads below 70% of this may be negotiated; below that are
                      rejected
                    </span>
                  </div>
                </div>

                {/* Auto-Reject Categories */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Auto-Reject Categories
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {thresholds.autoRejectCategories.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="pl-2 pr-1 py-1 flex items-center gap-1"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => removeRejectCategory(category)}
                          className="ml-1 hover:bg-gray-300 rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add category..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRejectCategory();
                        }
                      }}
                      className="flex-1 max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRejectCategory}
                      disabled={!newCategory.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Partnership Types */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Accepted Partnership Types
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(
                      [
                        { key: "flatRate", label: "Flat Rate" },
                        { key: "affiliate", label: "Affiliate" },
                        { key: "performanceHybrid", label: "Performance/Hybrid" },
                        { key: "custom", label: "Custom" },
                      ] as const
                    ).map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between space-x-2 rounded-md border p-2"
                      >
                        <Label
                          htmlFor={`pt-${key}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                        <Switch
                          id={`pt-${key}`}
                          checked={thresholds.partnershipTypes[key]}
                          onCheckedChange={(checked) =>
                            updatePartnershipType(key, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reset Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetThresholds}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset to defaults
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
