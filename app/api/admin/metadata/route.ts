import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/ensure";
import { institutions, journals, paperEdits, papers as storedPapers, taxonomyItems } from "../../../../db/schema";
import { applyPaperOverrides, getClassifications, papers as curatedPapers, type Classification, type Paper } from "../../../data";
import { editorName, recordPaperAudit } from "../../../lib/audit";
import { normalizeInstitution } from "../../../lib/institutions";
import { loadMetadataCatalog } from "../../../lib/metadata-catalog";

type Kind = "category" | "subcategory" | "tag";
type Override = Partial<Paper> & { _figureKeys?: string[]; _keyFigureKey?: string | null };

function authorized(request: Request) {
  const expected = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  return Boolean(expected && request.headers.get("x-admin-key") === expected);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T { try { return JSON.parse(value || "") as T; } catch { return fallback; } }

async function adminPapers() {
  const [stored, edits] = await Promise.all([getDb().select().from(storedPapers).limit(1000), getDb().select().from(paperEdits).limit(1000)]);
  const overrides = Object.fromEntries(edits.map((item) => [item.slug, parseJson<Override>(item.data, {})]));
  const curated = applyPaperOverrides(curatedPapers, overrides).map((paper) => ({ slug: paper.slug, title: paper.title, recordType: "curated" as const, classifications: getClassifications(paper), keywords: paper.keywords ?? [] }));
  const uploaded = stored.map((paper) => ({ slug: paper.slug, title: paper.title, recordType: "stored" as const, classifications: parseJson<Classification[]>(paper.classifications, [{ category: paper.category, subcategory: paper.subcategory }]), keywords: parseJson<string[]>(paper.tags, []) }));
  return [...curated, ...uploaded];
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const [catalog, papers] = await Promise.all([loadMetadataCatalog(), adminPapers()]);
  return Response.json({ ...catalog, papers }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { type?: "taxonomy" | "journal" | "institution"; kind?: Kind; name?: string; parent?: string; abbreviation?: string; aliases?: string[] };
  const name = String(payload.name ?? "").trim().slice(0, 240);
  if (!name) return Response.json({ error: "名称不能为空" }, { status: 400 });
  if (payload.type === "journal") {
    const abbreviation = String(payload.abbreviation ?? "").trim().slice(0, 80);
    const aliases = [...new Set((payload.aliases ?? []).map((item) => String(item).trim()).filter(Boolean))].slice(0, 12);
    await getDb().insert(journals).values({ fullName: name, abbreviation, aliases: JSON.stringify(aliases) }).onConflictDoUpdate({ target: journals.fullName, set: { abbreviation, aliases: JSON.stringify(aliases) } });
  } else if (payload.type === "institution") {
    const aliases = [...new Set((payload.aliases ?? []).map((item) => String(item).trim()).filter(Boolean))].slice(0, 16);
    await getDb().insert(institutions).values({ fullName: name, normalizedName: normalizeInstitution(name), aliases: JSON.stringify(aliases) }).onConflictDoUpdate({ target: institutions.fullName, set: { normalizedName: normalizeInstitution(name), aliases: JSON.stringify(aliases) } });
  } else {
    const kind = payload.kind;
    const parent = String(payload.parent ?? "").trim().slice(0, 80);
    if (!kind || (kind === "subcategory" && !parent)) return Response.json({ error: "分类类型或所属大类不完整" }, { status: 400 });
    await getDb().insert(taxonomyItems).values({ kind, name: name.slice(0, 80), parent, active: true }).onConflictDoUpdate({ target: [taxonomyItems.kind, taxonomyItems.parent, taxonomyItems.name], set: { active: true } });
  }
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return Response.json({ error: "审批码无效" }, { status: 401 });
  await ensureDatabase();
  const payload = await request.json() as { kind?: Kind; name?: string; parent?: string; replacementCategory?: string; replacementSubcategory?: string; replacementTag?: string };
  const kind = payload.kind; const name = String(payload.name ?? "").trim(); const parent = String(payload.parent ?? "").trim();
  if (!kind || !name) return Response.json({ error: "缺少待删除选项" }, { status: 400 });
  const replacementCategory = String(payload.replacementCategory ?? "").trim();
  const replacementSubcategory = String(payload.replacementSubcategory ?? "").trim();
  const replacementTag = String(payload.replacementTag ?? "").trim();
  if ((kind === "category" || kind === "subcategory") && (!replacementCategory || !replacementSubcategory)) return Response.json({ error: "请先选择论文迁移后的大类和小类" }, { status: 400 });

  const [stored, edits] = await Promise.all([getDb().select().from(storedPapers).limit(1000), getDb().select().from(paperEdits).limit(1000)]);
  const editMap = new Map(edits.map((item) => [item.slug, parseJson<Override>(item.data, {})]));
  let changed = 0;
  const migrate = (classifications: Classification[], keywords: string[]) => {
    const affected = kind === "tag" ? keywords.includes(name) : classifications.some((item) => kind === "category" ? item.category === name : item.category === parent && item.subcategory === name);
    if (!affected) return null;
    const nextClassifications = classifications.map((item) => {
      if (kind === "category" && item.category === name) return { category: replacementCategory, subcategory: replacementSubcategory };
      if (kind === "subcategory" && item.category === parent && item.subcategory === name) return { category: replacementCategory, subcategory: replacementSubcategory };
      return item;
    });
    const deduped = [...new Map(nextClassifications.map((item) => [`${item.category}\u0000${item.subcategory}`, item])).values()];
    const nextKeywords = kind === "tag" ? [...new Set(keywords.flatMap((tag) => tag === name ? (replacementTag ? [replacementTag] : []) : [tag]))] : keywords;
    return { classifications: deduped, keywords: nextKeywords };
  };

  for (const base of curatedPapers) {
    const override = editMap.get(base.slug) ?? {}; const current = { ...base, ...override } as Paper;
    const next = migrate(getClassifications(current), current.keywords ?? []); if (!next) continue;
    const primary = next.classifications[0]; const merged = { ...override, ...next, category: primary.category, subcategory: primary.subcategory };
    await getDb().insert(paperEdits).values({ slug: base.slug, data: JSON.stringify(merged) }).onConflictDoUpdate({ target: paperEdits.slug, set: { data: JSON.stringify(merged), updatedAt: sql`CURRENT_TIMESTAMP` } });
    await recordPaperAudit(base.slug, editorName(request), "迁移分类或标签", [{ field: kind === "tag" ? "标签" : "分类", before: kind === "tag" ? name : (kind === "category" ? name : `${parent} / ${name}`), after: kind === "tag" ? (replacementTag || "已删除") : `${replacementCategory} / ${replacementSubcategory}` }]); changed += 1;
  }
  for (const paper of stored) {
    const parsedClassifications = parseJson<Classification[]>(paper.classifications, []);
    const classifications = parsedClassifications.length ? parsedClassifications : [{ category: paper.category, subcategory: paper.subcategory }];
    const next = migrate(classifications, parseJson<string[]>(paper.tags, [])); if (!next) continue;
    const primary = next.classifications[0]; await getDb().update(storedPapers).set({ category: primary.category, subcategory: primary.subcategory, classifications: JSON.stringify(next.classifications), tags: JSON.stringify(next.keywords) }).where(eq(storedPapers.id, paper.id));
    await recordPaperAudit(paper.slug, editorName(request), "迁移分类或标签", [{ field: kind === "tag" ? "标签" : "分类", before: kind === "tag" ? name : (kind === "category" ? name : `${parent} / ${name}`), after: kind === "tag" ? (replacementTag || "已删除") : `${replacementCategory} / ${replacementSubcategory}` }]); changed += 1;
  }
  await getDb().insert(taxonomyItems).values({ kind, name: name.slice(0, 80), parent: parent.slice(0, 80), active: false }).onConflictDoUpdate({ target: [taxonomyItems.kind, taxonomyItems.parent, taxonomyItems.name], set: { active: false } });
  return Response.json({ ok: true, changed });
}
