import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { papers } from "../../../../../db/schema";

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, "").slice(0, 30);
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await request.json() as { tag?: string };
  const tag = normalizeTag(payload.tag ?? "");
  if (!tag) return Response.json({ error: "请输入标签" }, { status: 400 });
  const db = getDb();
  const [paper] = await db.select().from(papers).where(eq(papers.slug, slug)).limit(1);
  if (!paper || paper.status !== "approved") return Response.json({ error: "论文不存在" }, { status: 404 });
  const current = JSON.parse(paper.tags || "[]") as string[];
  const tags = [...new Set([...current, tag])].slice(0, 12);
  await db.update(papers).set({ tags: JSON.stringify(tags) }).where(eq(papers.id, paper.id));
  return Response.json({ tags });
}
