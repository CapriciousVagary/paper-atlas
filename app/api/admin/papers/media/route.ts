import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { ensureDatabase } from "../../../../../db/ensure";
import { paperEdits, papers } from "../../../../../db/schema";
import { papers as curatedPapers } from "../../../../data";

const MAX_FIGURE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAuthorized(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  return Boolean(expected && request.headers.get("x-admin-key") === expected);
}

function safeFilename(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return JSON.parse(value || "") as T; } catch { return fallback; }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const form = await request.formData();
  const slug = String(form.get("slug") ?? "").trim();
  const recordType = String(form.get("recordType") ?? "");
  const clear = String(form.get("clear") ?? "0") === "1";
  const caption = String(form.get("figureCaption") ?? "").trim().slice(0, 500);
  if (!slug || !["curated", "stored"].includes(recordType)) return Response.json({ error: "缺少论文或条目类型" }, { status: 400 });

  const files = form.getAll("figures").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 8);
  if (files.some((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FIGURE_BYTES)) return Response.json({ error: "图片仅支持 JPG、PNG、WebP，单张不超过 8 MB" }, { status: 400 });
  if (!clear && !files.length) return Response.json({ error: "没有需要更新的图片" }, { status: 400 });

  const storage = (env as unknown as { PAPERS: R2Bucket }).PAPERS;
  let previousKeys: string[] = [];
  if (recordType === "stored") {
    const [paper] = await getDb().select({ figureKeys: papers.figureKeys }).from(papers).where(eq(papers.slug, slug)).limit(1);
    if (!paper) return Response.json({ error: "条目不存在" }, { status: 404 });
    previousKeys = parseJson(paper.figureKeys, []);
  } else {
    if (!curatedPapers.some((paper) => paper.slug === slug)) return Response.json({ error: "条目不存在" }, { status: 404 });
    const [edit] = await getDb().select().from(paperEdits).where(eq(paperEdits.slug, slug)).limit(1);
    previousKeys = parseJson<{ _figureKeys?: string[] }>(edit?.data, {})._figureKeys ?? [];
  }

  const nextKeys: string[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const key = `papers/${slug}/figures/editor-${Date.now()}-${index + 1}-${safeFilename(file.name)}`;
    await storage.put(key, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { slug, order: String(index + 1), source: "editor" } });
    nextKeys.push(key);
  }
  const requested = Number.parseInt(String(form.get("keyFigureIndex") ?? "0"), 10);
  const keyIndex = Math.min(Math.max(Number.isFinite(requested) ? requested : 0, 0), Math.max(nextKeys.length - 1, 0));
  const keyFigureKey = nextKeys[keyIndex] ?? null;

  if (recordType === "stored") {
    await getDb().update(papers).set({ figureKeys: JSON.stringify(nextKeys), keyFigureKey, figureCaption: caption }).where(eq(papers.slug, slug));
  } else {
    const [edit] = await getDb().select().from(paperEdits).where(eq(paperEdits.slug, slug)).limit(1);
    const data = { ...parseJson<Record<string, unknown>>(edit?.data, {}), _figureKeys: nextKeys, _keyFigureKey: keyFigureKey, figureImageUrl: keyFigureKey ? `/api/papers/${encodeURIComponent(slug)}/figure` : "", figureCaption: caption };
    await getDb().insert(paperEdits).values({ slug, data: JSON.stringify(data) }).onConflictDoUpdate({ target: paperEdits.slug, set: { data: JSON.stringify(data), updatedAt: sql`CURRENT_TIMESTAMP` } });
  }

  if ((clear || files.length) && previousKeys.length) await Promise.all(previousKeys.filter((key) => !nextKeys.includes(key)).map((key) => storage.delete(key)));
  return Response.json({ ok: true, figureCount: nextKeys.length, figureImageUrl: keyFigureKey ? `/api/papers/${encodeURIComponent(slug)}/figure` : null });
}
