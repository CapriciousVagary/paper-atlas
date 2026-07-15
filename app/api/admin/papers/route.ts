import { env } from "cloudflare:workers";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/ensure";
import { institutions, papers } from "../../../../db/schema";
import { normalizeInstitution } from "../../../lib/institutions";

function isAuthorized(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  const provided = request.headers.get("x-admin-key");
  return Boolean(expected && provided && expected === provided);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const rows = await getDb().select().from(papers).where(eq(papers.status, status)).orderBy(desc(papers.createdAt)).limit(200);
  return Response.json({ papers: rows.map((paper) => ({ ...paper, authors: JSON.parse(paper.authors || "[]"), institutions: JSON.parse(paper.institutions || "[]"), authorDetails: JSON.parse(paper.authorDetails || "[]"), keywords: JSON.parse(paper.tags || "[]"), figureKeys: JSON.parse(paper.figureKeys || "[]") })) });
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { id?: number; action?: "approve" | "reject" };
  if (!payload.id || !["approve", "reject"].includes(payload.action ?? "")) return Response.json({ error: "无效操作" }, { status: 400 });
  const status = payload.action === "approve" ? "approved" : "rejected";
  const [paper] = await getDb().update(papers).set({ status, reviewedAt: sql`CURRENT_TIMESTAMP` }).where(eq(papers.id, payload.id)).returning();
  if (!paper) return Response.json({ error: "投稿不存在" }, { status: 404 });
  if (status === "approved") {
    const authorDetails = JSON.parse(paper.authorDetails || "[]") as Array<{ institution?: string }>;
    const names = [...new Set(authorDetails.map((author) => author.institution?.trim()).filter((name): name is string => Boolean(name)))];
    for (const fullName of names) {
      await getDb().insert(institutions).values({ fullName, normalizedName: normalizeInstitution(fullName), aliases: "[]" }).onConflictDoNothing();
    }
  }
  return Response.json({ paper });
}
