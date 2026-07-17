import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { ensureDatabase } from "../../../../../db/ensure";
import { paperEdits, papers } from "../../../../../db/schema";
import { papers as curatedPapers } from "../../../../data";
import { editorName, recordPaperAudit, type AuditChange } from "../../../../lib/audit";

function isAuthorized(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  return Boolean(expected && request.headers.get("x-admin-key") === expected);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return JSON.parse(value || "") as T; } catch { return fallback; }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { slug?: string; recordType?: "curated" | "stored"; figureKeys?: string[]; keyFigureIndex?: number; figureCaption?: string; clear?: boolean };
  const slug = String(payload.slug ?? "").trim();
  const recordType = payload.recordType;
  const caption = String(payload.figureCaption ?? "").trim().slice(0, 500);
  if (!slug || !recordType) return Response.json({ error: "缺少论文或条目类型" }, { status: 400 });
  const prefix = `papers/${slug}/figures/editor-`;
  const nextKeys = payload.clear ? [] : (Array.isArray(payload.figureKeys) ? payload.figureKeys : []).filter((key) => typeof key === "string" && key.startsWith(prefix)).slice(0, 8);
  const requested = Number(payload.keyFigureIndex) || 0;
  const keyIndex = Math.min(Math.max(requested, 0), Math.max(nextKeys.length - 1, 0));
  const keyFigureKey = nextKeys[keyIndex] ?? null;
  const storage = (env as unknown as { PAPERS: R2Bucket }).PAPERS;
  for (const key of nextKeys) if (!(await storage.head(key))) return Response.json({ error: "找不到已上传的图片，请重新选择" }, { status: 409 });

  let previousKeys: string[] = [];
  let previousCaption = "";
  if (recordType === "stored") {
    const [paper] = await getDb().select({ figureKeys: papers.figureKeys, figureCaption: papers.figureCaption }).from(papers).where(eq(papers.slug, slug)).limit(1);
    if (!paper) return Response.json({ error: "条目不存在" }, { status: 404 });
    previousKeys = parseJson(paper.figureKeys, []);
    previousCaption = paper.figureCaption;
    await getDb().update(papers).set({ figureKeys: JSON.stringify(nextKeys), keyFigureKey, figureCaption: caption }).where(eq(papers.slug, slug));
  } else {
    if (!curatedPapers.some((paper) => paper.slug === slug)) return Response.json({ error: "条目不存在" }, { status: 404 });
    const [edit] = await getDb().select().from(paperEdits).where(eq(paperEdits.slug, slug)).limit(1);
    const existing = parseJson<Record<string, unknown> & { _figureKeys?: string[] }>(edit?.data, {});
    previousKeys = existing._figureKeys ?? [];
    previousCaption = String(existing.figureCaption ?? curatedPapers.find((paper) => paper.slug === slug)?.figureCaption ?? "");
    const data = { ...existing, _figureKeys: nextKeys, _keyFigureKey: keyFigureKey, figureImageUrl: keyFigureKey ? `/api/papers/${encodeURIComponent(slug)}/figure` : "", figureCaption: caption };
    await getDb().insert(paperEdits).values({ slug, data: JSON.stringify(data) }).onConflictDoUpdate({ target: paperEdits.slug, set: { data: JSON.stringify(data), updatedAt: sql`CURRENT_TIMESTAMP` } });
  }

  await Promise.all(previousKeys.filter((key) => !nextKeys.includes(key)).map((key) => storage.delete(key)));
  const changes: AuditChange[] = [];
  if (JSON.stringify(previousKeys) !== JSON.stringify(nextKeys)) changes.push({ field: "关键图", before: previousKeys.length ? `${previousKeys.length} 张` : "默认示意图", after: nextKeys.length ? `${nextKeys.length} 张（已更新）` : "默认示意图" });
  if (previousCaption !== caption) changes.push({ field: "关键图说明", before: previousCaption || "未填写", after: caption || "未填写" });
  if (changes.length) await recordPaperAudit(slug, editorName(request), payload.clear ? "清除关键图" : "修改关键图", changes);
  return Response.json({ ok: true, figureCount: nextKeys.length, figureImageUrl: keyFigureKey ? `/api/papers/${encodeURIComponent(slug)}/figure` : null });
}
