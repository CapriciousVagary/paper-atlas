import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/ensure";
import { paperAuditLogs } from "../../../../db/schema";
import type { AuditChange } from "../../../lib/audit";

export async function GET(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  if (!expected || request.headers.get("x-admin-key") !== expected) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) return Response.json({ error: "缺少论文条目标识" }, { status: 400 });
  const rows = await getDb().select().from(paperAuditLogs).where(eq(paperAuditLogs.paperSlug, slug)).orderBy(desc(paperAuditLogs.createdAt), desc(paperAuditLogs.id)).limit(50);
  return Response.json({ logs: rows.map((row) => ({ ...row, changes: (() => { try { return JSON.parse(row.changes) as AuditChange[]; } catch { return []; } })() })) }, { headers: { "Cache-Control": "no-store" } });
}
