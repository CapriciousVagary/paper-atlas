import { env } from "cloudflare:workers";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { papers } from "../../../../db/schema";

function isAuthorized(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  const provided = request.headers.get("x-admin-key");
  return Boolean(expected && provided && expected === provided);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const rows = await getDb().select().from(papers).where(eq(papers.status, status)).orderBy(desc(papers.createdAt)).limit(200);
  return Response.json({ papers: rows.map((paper) => ({ ...paper, authors: JSON.parse(paper.authors || "[]"), institutions: JSON.parse(paper.institutions || "[]"), keywords: JSON.parse(paper.tags || "[]"), figureKeys: JSON.parse(paper.figureKeys || "[]") })) });
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  const payload = await request.json() as { id?: number; action?: "approve" | "reject" };
  if (!payload.id || !["approve", "reject"].includes(payload.action ?? "")) return Response.json({ error: "无效操作" }, { status: 400 });
  const status = payload.action === "approve" ? "approved" : "rejected";
  const [paper] = await getDb().update(papers).set({ status, reviewedAt: sql`CURRENT_TIMESTAMP` }).where(eq(papers.id, payload.id)).returning();
  if (!paper) return Response.json({ error: "投稿不存在" }, { status: 404 });
  return Response.json({ paper });
}
