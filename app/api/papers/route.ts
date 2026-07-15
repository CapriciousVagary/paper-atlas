import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { papers as storedPapers } from "../../../db/schema";
import { papers as curatedPapers } from "../../data";
import type { AuthorDetail, AuthorRole } from "../../data";
import { canonicalizeInstitution } from "../../lib/institutions";
import { rankMatches, type MatchablePaper } from "../../lib/paper-match";

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_FIGURE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FIGURE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function slugify(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 64);
  return `${base || "paper"}-${Date.now().toString(36)}`;
}

function parseJournal(value: string) {
  const [journal = "待补充", published = "待补充"] = value.split("·").map((part) => part.trim());
  return { journal: journal || "待补充", published: published || "待补充" };
}

function parseTags(value: string) {
  return [...new Set(value.split(/[，,、#\n]/).map((item) => item.trim()).filter(Boolean).map((item) => item.slice(0, 30)))].slice(0, 6);
}

const authorRoles = new Set<AuthorRole>(["first", "cofirst", "corresponding", "notable", "other"]);

function parseAuthorDetails(value: FormDataEntryValue | null): AuthorDetail[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]")) as Array<Partial<AuthorDetail>>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      name: String(item.name ?? "").trim().slice(0, 120),
      role: authorRoles.has(item.role as AuthorRole) ? item.role as AuthorRole : "other",
      institution: canonicalizeInstitution(String(item.institution ?? "")).slice(0, 240) || undefined,
      note: String(item.note ?? "").trim().slice(0, 160) || undefined,
    })).filter((item) => item.name);
  } catch {
    return [];
  }
}

function safeFilename(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function GET() {
  try {
    await ensureDatabase();
    const rows = await getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).orderBy(desc(storedPapers.createdAt)).limit(200);
    return Response.json({
      papers: rows.map((paper) => ({
        ...paper,
        authors: JSON.parse(paper.authors || "[]"),
        institutions: JSON.parse(paper.institutions || "[]"),
        authorDetails: JSON.parse(paper.authorDetails || "[]"),
        keywords: JSON.parse(paper.tags || "[]"),
        figureImageUrl: paper.keyFigureKey ? `/api/papers/${encodeURIComponent(paper.slug)}/figure` : undefined,
      })),
    });
  } catch {
    return Response.json({ papers: [] });
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
    if (String(form.get("confirmDuplicate") ?? "0") !== "1") {
      const candidates: MatchablePaper[] = curatedPapers.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl }));
      try {
        const existing = await getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).limit(500);
        candidates.push(...existing.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: undefined, journal: paper.journal, published: paper.published, doi: undefined, sourceUrl: paper.sourceUrl })));
      } catch {
        // Curated records still protect against duplicates in local preview.
      }
      const duplicates = rankMatches(candidates, title, sourceUrl, 0.72).slice(0, 5);
      if (duplicates.length) return Response.json({ error: "检测到可能重复的论文，请预览后确认是否继续投稿。", duplicates }, { status: 409 });
    }

    const slug = slugify(title);
    const { journal, published } = parseJournal(String(form.get("journal") ?? ""));
    const authorDetails = parseAuthorDetails(form.get("authorDetails"));
    const authors = authorDetails.map((author) => author.name);
    const institutions = [...new Set(authorDetails.map((author) => author.institution).filter((item): item is string => Boolean(item)))];
    const tags = parseTags(String(form.get("tags") ?? ""));
    const storage = (env as unknown as { PAPERS: R2Bucket }).PAPERS;
    const file = form.get("file");
    let fileKey: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf" || file.size > MAX_PDF_BYTES) {
        return Response.json({ error: "PDF 需小于 50 MB" }, { status: 400 });
      }
      fileKey = `papers/${slug}/paper-${safeFilename(file.name)}`;
      await storage.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { title } });
    }

    const figures = form.getAll("figures").filter((item): item is File => item instanceof File && item.size > 0).slice(0, 8);
    if (figures.some((figure) => !ALLOWED_FIGURE_TYPES.has(figure.type) || figure.size > MAX_FIGURE_BYTES)) {
      return Response.json({ error: "关键图仅支持 JPG、PNG、WebP，单张不超过 8 MB" }, { status: 400 });
    }
    const figureKeys: string[] = [];
    for (let index = 0; index < figures.length; index += 1) {
      const figure = figures[index];
      const key = `papers/${slug}/figures/${index + 1}-${safeFilename(figure.name)}`;
      await storage.put(key, figure.stream(), { httpMetadata: { contentType: figure.type }, customMetadata: { title, order: String(index + 1) } });
      figureKeys.push(key);
    }
    const requestedKeyIndex = Number.parseInt(String(form.get("keyFigureIndex") ?? "0"), 10);
    const keyFigureKey = figureKeys[Math.min(Math.max(Number.isFinite(requestedKeyIndex) ? requestedKeyIndex : 0, 0), Math.max(figureKeys.length - 1, 0))] ?? null;

    const [paper] = await getDb().insert(storedPapers).values({
      slug,
      title: title.slice(0, 500),
      category,
      subcategory,
      journal,
      published,
      authors: JSON.stringify(authors),
      institutions: JSON.stringify(institutions),
      authorDetails: JSON.stringify(authorDetails),
      abstractZh: String(form.get("abstractZh") ?? "").trim(),
      insight: String(form.get("insight") ?? "").trim().slice(0, 50),
      tags: JSON.stringify(tags),
      sourceUrl,
      fileKey,
      figureKeys: JSON.stringify(figureKeys),
      keyFigureKey,
      figureCaption: String(form.get("figureCaption") ?? "").trim().slice(0, 500),
      submitterName,
      submitterEmail: String(form.get("submitterEmail") ?? "").trim().slice(0, 200),
      status: "pending",
    }).returning();

    return Response.json({ paper, message: "投稿已提交，管理员审核通过后将公开显示。" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create paper" }, { status: 500 });
  }
}
