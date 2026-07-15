import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { comments } from "../../../db/schema";

export async function GET(request: Request) {
  try {
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
