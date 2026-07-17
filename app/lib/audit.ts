import { getDb } from "../../db";
import { paperAuditLogs } from "../../db/schema";

export type AuditChange = { field: string; before?: string; after?: string };

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "未填写";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 237)}…` : text;
}

function stableValue(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "");
}

export function editorName(request: Request) {
  return (request.headers.get("x-editor-name") ?? "").trim().slice(0, 80);
}

export function auditDiff(before: Record<string, unknown>, after: Record<string, unknown>, labels: Record<string, string>): AuditChange[] {
  return Object.entries(labels).flatMap(([key, label]) => stableValue(before[key]) === stableValue(after[key]) ? [] : [{ field: label, before: displayValue(before[key]), after: displayValue(after[key]) }]);
}

export async function recordPaperAudit(paperSlug: string, actor: string, action: string, changes: AuditChange[]) {
  await getDb().insert(paperAuditLogs).values({ paperSlug, actor: actor.trim().slice(0, 80), action: action.slice(0, 80), changes: JSON.stringify(changes.slice(0, 30)) });
}
