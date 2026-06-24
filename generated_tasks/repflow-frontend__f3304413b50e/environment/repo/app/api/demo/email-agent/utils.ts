import crypto from "crypto";

export function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL || ""
  ).replace(/\/$/, '');
}

export function getServiceToken() {
  return (
    process.env.API_AUTH_TOKEN || ""
  );
}

export function getServiceHeaders(): Record<string, string> {
  const token = getServiceToken();
  console.log("token:", token?.length);
  if (!token) {
    throw new Error(
      "Service token not configured. Set API_AUTH_TOKEN."
    );
  }
  return {
    "Content-Type": "application/json",
    Authorization: `ServiceAccount ${token}`,
  };
}

function normalizeSubject(subject: string) {
  const trimmed = subject || "";
  const stripped = trimmed.replace(/^(re:|fwd:|fw:)\s*/i, "").trim();
  return stripped.replace(/\s+/g, " ");
}

export function generateThreadId(
  senderEmail: string,
  recipientEmail: string,
  subject: string
) {
  const sender = (senderEmail || "").toLowerCase().trim();
  const recipient = (recipientEmail || "").toLowerCase().trim();
  const normalizedSubject = normalizeSubject(subject);
  const emailsSorted = [sender, recipient].sort();
  const threadString = [...emailsSorted, normalizedSubject].join("|");
  const hash = crypto
    .createHash("sha256")
    .update(threadString, "utf8")
    .digest("hex")
    .slice(0, 16);
  const subjectPrefix = normalizedSubject
    .slice(0, 10)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  return subjectPrefix ? `${hash}-${subjectPrefix}` : hash;
}

export async function fetchBackend(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getBackendBaseUrl();
  if (!base) {
    throw new Error("API_BASE_URL not configured");
  }
  return fetch(`${base}${path}`, init);
}
