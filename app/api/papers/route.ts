import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { papers } from "../../../db/schema";

function slugify(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 64);
  return `${base || "paper"}-${Date.now().toString(36)}`;
}

function parseJournal(value: string) {
  const [journal = "待补充", published = "待补充"] = value.split("·").map((part) => part.trim());
  return { journal, published };
}

export async function GET() {
  try {
    const rows = await getDb().select().from(papers).orderBy(desc(papers.createdAt)).limit(100);
    return Response.json({ papers: rows.map((paper) => ({ ...paper, authors: JSON.parse(paper.authors || "[]"), institutions: JSON.parse(paper.institutions || "[]") })) });
  } catch {
    return Response.json({ papers: [] });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const subcategory = String(form.get("subcategory") ?? "").trim();
    if (!title || !category || !subcategory) return Response.json({ error: "Missing required fields" }, { status: 400 });
    const slug = slugify(title);
    const { journal, published } = parseJournal(String(form.get("journal") ?? ""));
    const authorLines = String(form.get("authors") ?? "").split(/\r?\n/);
    const authors = authorLines[0]?.split(/[，,]/).map((item) => item.trim()).filter(Boolean) ?? [];
    const institutions = authorLines.slice(1).map((item) => item.trim()).filter(Boolean);
    const file = form.get("file");
    let fileKey: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf" || file.size > 50 * 1024 * 1024) return Response.json({ error: "PDF must be smaller than 50 MB" }, { status: 400 });
      fileKey = `papers/${slug}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storage = (env as unknown as { PAPERS: R2Bucket }).PAPERS;
      await storage.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { title } });
    }

    const [paper] = await getDb().insert(papers).values({
      slug, title, category, subcategory, journal, published,
      authors: JSON.stringify(authors), institutions: JSON.stringify(institutions),
      abstractZh: String(form.get("abstractZh") ?? "").trim(), insight: String(form.get("insight") ?? "").trim().slice(0, 50),
      sourceUrl: String(form.get("sourceUrl") ?? "").trim(), fileKey,
      status: "draft",
    }).returning();
    return Response.json({ paper }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create paper" }, { status: 500 });
  }
}
