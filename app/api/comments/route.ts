import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { comments } from "../../../db/schema";
import { editorName, recordPaperAudit, type AuditChange } from "../../lib/audit";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const paperSlug = new URL(request.url).searchParams.get("paperSlug")?.trim();
    if (!paperSlug) return Response.json({ error: "paperSlug is required" }, { status: 400 });
    const rows = await getDb().select().from(comments).where(eq(comments.paperSlug, paperSlug)).orderBy(desc(comments.createdAt)).limit(100);
    return Response.json({ comments: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load comments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const payload = await request.json() as { paperSlug?: string; author?: string; content?: string };
    const paperSlug = payload.paperSlug?.trim() ?? "";
    const author = payload.author?.trim() ?? "";
    const content = payload.content?.trim() ?? "";
    if (!paperSlug || !author || !content) return Response.json({ error: "Missing required fields" }, { status: 400 });
    const [comment] = await getDb().insert(comments).values({ paperSlug, author: author.slice(0, 80), content: content.slice(0, 2000) }).returning();
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save comment" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await ensureDatabase();
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  if (!expected || request.headers.get("x-admin-key") !== expected) return Response.json({ error: "无权修改评论" }, { status: 401 });
  const payload = await request.json() as { id?: number; author?: string; content?: string };
  const id = Number(payload.id);
  const author = String(payload.author ?? "").trim().slice(0, 80);
  const content = String(payload.content ?? "").trim().slice(0, 2000);
  if (!Number.isInteger(id) || id < 1 || !author || !content) return Response.json({ error: "评论编号、姓名和内容不能为空" }, { status: 400 });
  const [before] = await getDb().select().from(comments).where(eq(comments.id, id)).limit(1);
  if (!before) return Response.json({ error: "评论不存在" }, { status: 404 });
  const [updated] = await getDb().update(comments).set({ author, content }).where(eq(comments.id, id)).returning();
  const changes: AuditChange[] = [];
  if (before.author !== author) changes.push({ field: "评论署名", before: before.author, after: author });
  if (before.content !== content) changes.push({ field: "评论内容", before: before.content.slice(0, 240), after: content.slice(0, 240) });
  if (changes.length) await recordPaperAudit(before.paperSlug, editorName(request), "修改评论", changes);
  return updated ? Response.json({ comment: updated }) : Response.json({ error: "评论不存在" }, { status: 404 });
}

export async function DELETE(request: Request) {
  await ensureDatabase();
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  if (!expected || request.headers.get("x-admin-key") !== expected) return Response.json({ error: "无权删除评论" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "评论编号无效" }, { status: 400 });
  const [deleted] = await getDb().delete(comments).where(eq(comments.id, id)).returning();
  if (deleted) await recordPaperAudit(deleted.paperSlug, editorName(request), "删除评论", [{ field: "评论", before: `${deleted.author}：${deleted.content.slice(0, 240)}`, after: "已删除" }]);
  return deleted ? Response.json({ deleted: true }) : Response.json({ error: "评论不存在" }, { status: 404 });
}
