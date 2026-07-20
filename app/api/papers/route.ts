import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { paperEdits, papers as storedPapers } from "../../../db/schema";
import { papers as curatedPapers } from "../../data";
import type { AuthorDetail, AuthorRole, Classification } from "../../data";
import { canonicalizeInstitution } from "../../lib/institutions";
import { rankMatches, type MatchablePaper } from "../../lib/paper-match";

function slugify(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 64);
  return `${base || "paper"}-${Date.now().toString(36)}`;
}

function parseJournal(journalValue: string, publishedValue: string) {
  const journal = journalValue.trim().slice(0, 200) || "待补充";
  const published = publishedValue.trim().replace(/^(\d{4})-(\d{2})$/, "$1.$2").slice(0, 40) || "待补充";
  return { journal, published };
}

function parseTags(value: string) {
  return [...new Set(value.split(/[，,、#\n]/).map((item) => item.trim()).filter(Boolean).map((item) => item.slice(0, 30)))].slice(0, 12);
}

const authorRoles = new Set<AuthorRole>(["first", "first_corresponding", "cofirst", "corresponding", "notable", "other"]);

function parseAuthorDetails(value: FormDataEntryValue | null): AuthorDetail[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]")) as Array<Partial<AuthorDetail>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: String(item.name ?? "").trim().slice(0, 120),
      role: authorRoles.has(item.role as AuthorRole) ? item.role as AuthorRole : "other",
      institution: canonicalizeInstitution(String(item.institution ?? "")).slice(0, 240) || undefined,
      aliases: Array.isArray(item.aliases) ? [...new Set(item.aliases.map((alias) => String(alias).trim()).filter(Boolean))].slice(0, 8) : undefined,
      note: String(item.note ?? "").trim().slice(0, 160) || undefined,
    })).filter((item) => item.name);
  } catch {
    return [];
  }
}

function parseClassifications(value: FormDataEntryValue | null, category: string, subcategory: string): Classification[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]")) as Array<Partial<Classification>>;
    const items = [{ category, subcategory }, ...(Array.isArray(parsed) ? parsed : [])].map((item) => ({
      category: String(item.category ?? "").trim().slice(0, 80),
      subcategory: String(item.subcategory ?? "").trim().slice(0, 80),
    })).filter((item) => item.category && item.subcategory);
    return [...new Map(items.map((item) => [`${item.category}\u0000${item.subcategory}`, item])).values()];
  } catch {
    return [{ category, subcategory }];
  }
}

export async function GET() {
  try {
    await ensureDatabase();
    const [rows, edits] = await Promise.all([
      getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).orderBy(desc(storedPapers.createdAt)).limit(500),
      getDb().select().from(paperEdits).limit(500),
    ]);
    return Response.json({
      papers: rows.map((paper) => ({
        slug: paper.slug,
        title: paper.title,
        titleZh: paper.titleZh,
        doi: paper.doi || undefined,
        category: paper.category,
        subcategory: paper.subcategory,
        journal: paper.journal,
        published: paper.published,
        authors: JSON.parse(paper.authors || "[]"),
        institutions: JSON.parse(paper.institutions || "[]"),
        authorDetails: JSON.parse(paper.authorDetails || "[]"),
        classifications: JSON.parse(paper.classifications || "[]"),
        abstractZh: paper.abstractZh,
        insight: paper.insight,
        keywords: JSON.parse(paper.tags || "[]"),
        figureCaption: paper.figureCaption,
        figureCaptions: JSON.parse(paper.figureCaptions || "[]"),
        sourceUrl: paper.sourceUrl || undefined,
        createdAt: paper.createdAt,
        addedAt: paper.reviewedAt || paper.createdAt,
        figureImageUrl: paper.keyFigureKey ? `/api/papers/${encodeURIComponent(paper.slug)}/figure` : undefined,
        figureImageUrls: JSON.parse(paper.figureKeys || "[]").map((_: string, index: number) => `/api/papers/${encodeURIComponent(paper.slug)}/figure?index=${index}`),
        pdfUrl: paper.fileKey ? `/api/papers/${encodeURIComponent(paper.slug)}/pdf` : undefined,
      })),
      overrides: Object.fromEntries(edits.map((edit) => {
        const { _figureKeys: _ignoredKeys, _keyFigureKey: _ignoredKey, ...publicData } = JSON.parse(edit.data || "{}") as Record<string, unknown>;
        void _ignoredKeys; void _ignoredKey;
        return [edit.slug, publicData];
      })),
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  } catch {
    return Response.json({ papers: [] }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "").trim().slice(0, 80);
    const subcategory = String(form.get("subcategory") ?? "").trim().slice(0, 80);
    const submitterName = String(form.get("submitterName") ?? "").trim().slice(0, 80);
    if (!title || !category || !subcategory || !submitterName) {
      return Response.json({ error: "标题、分类和投稿人姓名为必填项" }, { status: 400 });
    }

    const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
    const doi = String(form.get("doi") ?? sourceUrl.match(/10\.\d{4,9}\/\S+/i)?.[0] ?? "").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
    if (String(form.get("confirmDuplicate") ?? "0") !== "1") {
      const candidates: MatchablePaper[] = curatedPapers.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl }));
      try {
        const existing = await getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).limit(500);
        candidates.push(...existing.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl })));
      } catch {
        // Curated records still protect against duplicates in local preview.
      }
      const duplicates = rankMatches(candidates, title, sourceUrl, 0.72).slice(0, 5);
      if (duplicates.length) return Response.json({ error: "检测到可能重复的论文，请预览后确认是否继续投稿。", duplicates }, { status: 409 });
    }

    const slug = slugify(title);
    const { journal, published } = parseJournal(String(form.get("journal") ?? ""), String(form.get("published") ?? ""));
    const authorDetails = parseAuthorDetails(form.get("authorDetails"));
    const authors = authorDetails.map((author) => author.name);
    const institutions = [...new Set(authorDetails.map((author) => author.institution).filter((item): item is string => Boolean(item)))];
    const tags = parseTags(String(form.get("tags") ?? ""));
    const classifications = parseClassifications(form.get("classifications"), category, subcategory);
    const uploadToken = crypto.randomUUID();

    const [paper] = await getDb().insert(storedPapers).values({
      slug,
      title: title.slice(0, 500),
      titleZh: String(form.get("titleZh") ?? "").trim().slice(0, 500),
      doi: doi.slice(0, 200),
      category,
      subcategory,
      classifications: JSON.stringify(classifications),
      journal,
      published,
      authors: JSON.stringify(authors),
      institutions: JSON.stringify(institutions),
      authorDetails: JSON.stringify(authorDetails),
      abstractZh: String(form.get("abstractZh") ?? "").trim(),
      insight: String(form.get("insight") ?? "").trim().slice(0, 2000),
      tags: JSON.stringify(tags),
      sourceUrl,
      fileKey: null,
      figureKeys: "[]",
      figureCaptions: "[]",
      keyFigureKey: null,
      figureCaption: String(form.get("figureCaption") ?? "").trim().slice(0, 500),
      submitterName,
      submitterEmail: String(form.get("submitterEmail") ?? "").trim().slice(0, 200),
      uploadToken,
      status: "pending",
    }).returning();

    return Response.json({ paper: { id: paper.id, slug: paper.slug, title: paper.title }, uploadToken, message: "论文信息已提交，正在上传附件。" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create paper" }, { status: 500 });
  }
}
