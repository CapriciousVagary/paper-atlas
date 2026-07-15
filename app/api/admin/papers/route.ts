import { env } from "cloudflare:workers";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/ensure";
import { institutions, paperEdits, papers as storedPapers } from "../../../../db/schema";
import { applyPaperOverrides, getClassifications, papers as curatedPapers, type AuthorDetail, type AuthorRole, type Classification, type Paper } from "../../../data";
import { normalizeInstitution } from "../../../lib/institutions";

function isAuthorized(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  const provided = request.headers.get("x-admin-key");
  return Boolean(expected && provided && expected === provided);
}

const authorRoles = new Set<AuthorRole>(["first", "first_corresponding", "cofirst", "corresponding", "notable", "other"]);

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return JSON.parse(value || "") as T; } catch { return fallback; }
}

function storedToPaper(paper: typeof storedPapers.$inferSelect): Paper & { id: number; recordType: "stored"; submitterName: string; submitterEmail: string; figureKeys: string[] } {
  const figureType: Paper["figureType"] = paper.category === "光计算" ? "ring" : paper.category.includes("铌酸锂") ? "modulator" : "laser";
  return {
    id: paper.id,
    recordType: "stored",
    slug: paper.slug,
    title: paper.title,
    titleZh: paper.titleZh,
    doi: paper.doi || undefined,
    category: paper.category,
    subcategory: paper.subcategory,
    classifications: parseJson(paper.classifications, []),
    journal: paper.journal,
    published: paper.published,
    authors: parseJson(paper.authors, []),
    institutions: parseJson(paper.institutions, []),
    authorDetails: parseJson(paper.authorDetails, []),
    abstractZh: paper.abstractZh,
    insight: paper.insight,
    keywords: parseJson(paper.tags, []),
    figureCaption: paper.figureCaption,
    figureType,
    accent: figureType === "ring" ? "#7458e8" : figureType === "modulator" ? "#14aeb6" : "#dc9130",
    sourceUrl: paper.sourceUrl,
    createdAt: paper.createdAt,
    submitterName: paper.submitterName,
    submitterEmail: paper.submitterEmail,
    figureKeys: parseJson(paper.figureKeys, []),
  };
}

function cleanAuthorDetails(value: unknown): AuthorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const author = item as Partial<AuthorDetail>;
    return {
      name: String(author.name ?? "").trim().slice(0, 120),
      role: authorRoles.has(author.role as AuthorRole) ? author.role as AuthorRole : "other",
      institution: String(author.institution ?? "").trim().slice(0, 240) || undefined,
      aliases: Array.isArray(author.aliases) ? [...new Set(author.aliases.map((alias) => String(alias).trim()).filter(Boolean))].slice(0, 8) : undefined,
      note: String(author.note ?? "").trim().slice(0, 160) || undefined,
    };
  }).filter((author) => author.name);
}

function cleanClassifications(value: unknown, category: string, subcategory: string): Classification[] {
  const source = Array.isArray(value) ? value : [];
  const items = [{ category, subcategory }, ...source.map((item) => ({ category: String((item as Partial<Classification>).category ?? "").trim(), subcategory: String((item as Partial<Classification>).subcategory ?? "").trim() }))]
    .filter((item) => item.category && item.subcategory)
    .map((item) => ({ category: item.category.slice(0, 80), subcategory: item.subcategory.slice(0, 80) }));
  return [...new Map(items.map((item) => [`${item.category}\u0000${item.subcategory}`, item])).values()];
}

function cleanUpdate(value: unknown): Partial<Paper> {
  const payload = (value && typeof value === "object" ? value : {}) as Partial<Paper>;
  const category = String(payload.category ?? "").trim().slice(0, 80);
  const subcategory = String(payload.subcategory ?? "").trim().slice(0, 80);
  const authorDetails = cleanAuthorDetails(payload.authorDetails);
  return {
    title: String(payload.title ?? "").trim().slice(0, 500),
    titleZh: String(payload.titleZh ?? "").trim().slice(0, 500),
    doi: String(payload.doi ?? "").trim().slice(0, 200) || undefined,
    sourceUrl: String(payload.sourceUrl ?? "").trim().slice(0, 500) || undefined,
    category,
    subcategory,
    classifications: cleanClassifications(payload.classifications, category, subcategory),
    journal: String(payload.journal ?? "").trim().slice(0, 200),
    published: String(payload.published ?? "").trim().slice(0, 40),
    authorDetails,
    authors: authorDetails.map((author) => author.name),
    institutions: [...new Set(authorDetails.map((author) => author.institution).filter((item): item is string => Boolean(item)))],
    abstractZh: String(payload.abstractZh ?? "").trim().slice(0, 12000),
    insight: String(payload.insight ?? "").trim().slice(0, 50),
    keywords: [...new Set((Array.isArray(payload.keywords) ? payload.keywords : []).map((item) => String(item).trim()).filter(Boolean))].slice(0, 6),
    figureCaption: String(payload.figureCaption ?? "").trim().slice(0, 500),
  };
}

async function registerInstitutions(authorDetails: AuthorDetail[]) {
  const names = [...new Set(authorDetails.map((author) => author.institution?.trim()).filter((name): name is string => Boolean(name)))];
  for (const fullName of names) {
    await getDb().insert(institutions).values({ fullName, normalizedName: normalizeInstitution(fullName), aliases: "[]" }).onConflictDoNothing();
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (status !== "approved") {
    const rows = await getDb().select().from(storedPapers).where(eq(storedPapers.status, status)).orderBy(desc(storedPapers.createdAt)).limit(200);
    return Response.json({ papers: rows.map(storedToPaper) });
  }
  const [stored, edits] = await Promise.all([
    getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).orderBy(desc(storedPapers.createdAt)).limit(500),
    getDb().select().from(paperEdits).limit(500),
  ]);
  const overrides = Object.fromEntries(edits.map((edit) => [edit.slug, parseJson<Partial<Paper>>(edit.data, {})]));
  const curated = applyPaperOverrides(curatedPapers, overrides).map((paper) => ({ ...paper, recordType: "curated" as const, classifications: getClassifications(paper), figureKeys: [], submitterName: "批量导入", submitterEmail: "" }));
  return Response.json({ papers: [...curated, ...stored.map(storedToPaper)] });
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { id?: number; action?: "approve" | "reject" };
  if (!payload.id || !["approve", "reject"].includes(payload.action ?? "")) return Response.json({ error: "无效操作" }, { status: 400 });
  const status = payload.action === "approve" ? "approved" : "rejected";
  const [paper] = await getDb().update(storedPapers).set({ status, reviewedAt: sql`CURRENT_TIMESTAMP` }).where(eq(storedPapers.id, payload.id)).returning();
  if (!paper) return Response.json({ error: "投稿不存在" }, { status: 404 });
  if (status === "approved") await registerInstitutions(parseJson<AuthorDetail[]>(paper.authorDetails, []));
  return Response.json({ paper });
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { slug?: string; recordType?: "curated" | "stored"; paper?: Partial<Paper> };
  if (!payload.slug || !payload.recordType) return Response.json({ error: "缺少条目标识" }, { status: 400 });
  const update = cleanUpdate(payload.paper);
  if (!update.title || !update.category || !update.subcategory) return Response.json({ error: "标题、大类和小类不能为空" }, { status: 400 });
  if (payload.recordType === "curated") {
    if (!curatedPapers.some((paper) => paper.slug === payload.slug)) return Response.json({ error: "条目不存在" }, { status: 404 });
    await getDb().insert(paperEdits).values({ slug: payload.slug, data: JSON.stringify(update) }).onConflictDoUpdate({ target: paperEdits.slug, set: { data: JSON.stringify(update), updatedAt: sql`CURRENT_TIMESTAMP` } });
  } else {
    const [updated] = await getDb().update(storedPapers).set({
      title: update.title,
      titleZh: update.titleZh ?? "",
      doi: update.doi ?? "",
      sourceUrl: update.sourceUrl ?? "",
      category: update.category,
      subcategory: update.subcategory,
      classifications: JSON.stringify(update.classifications ?? []),
      journal: update.journal ?? "待补充",
      published: update.published ?? "待补充",
      authors: JSON.stringify(update.authors ?? []),
      institutions: JSON.stringify(update.institutions ?? []),
      authorDetails: JSON.stringify(update.authorDetails ?? []),
      abstractZh: update.abstractZh ?? "",
      insight: update.insight ?? "",
      tags: JSON.stringify(update.keywords ?? []),
      figureCaption: update.figureCaption ?? "",
    }).where(eq(storedPapers.slug, payload.slug)).returning();
    if (!updated) return Response.json({ error: "条目不存在" }, { status: 404 });
  }
  await registerInstitutions(update.authorDetails ?? []);
  return Response.json({ ok: true, paper: update });
}
