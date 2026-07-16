import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { ensureDatabase } from "../../../../../db/ensure";
import { paperEdits, papers } from "../../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureDatabase();
  const [paper] = await getDb().select({ keyFigureKey: papers.keyFigureKey, status: papers.status }).from(papers).where(eq(papers.slug, slug)).limit(1);
  let key = paper?.status === "approved" ? paper.keyFigureKey : null;
  if (!key && !paper) {
    const [edit] = await getDb().select({ data: paperEdits.data }).from(paperEdits).where(eq(paperEdits.slug, slug)).limit(1);
    try { key = (JSON.parse(edit?.data || "{}") as { _keyFigureKey?: string })._keyFigureKey ?? null; } catch { key = null; }
  }
  if (!key) return new Response("Not found", { status: 404 });
  const object = await (env as unknown as { PAPERS: R2Bucket }).PAPERS.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(object.body, { headers });
}
