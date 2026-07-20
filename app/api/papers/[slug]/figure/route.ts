import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { ensureDatabase } from "../../../../../db/ensure";
import { paperEdits, papers } from "../../../../../db/schema";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await ensureDatabase();
  const indexValue = new URL(request.url).searchParams.get("index");
  const requestedIndex = indexValue === null ? null : Math.max(0, Number.parseInt(indexValue, 10) || 0);
  const [paper] = await getDb().select({ keyFigureKey: papers.keyFigureKey, figureKeys: papers.figureKeys, status: papers.status }).from(papers).where(eq(papers.slug, slug)).limit(1);
  let key = paper?.status === "approved" ? (requestedIndex === null ? paper.keyFigureKey : (() => { try { return (JSON.parse(paper.figureKeys) as string[])[requestedIndex] ?? null; } catch { return null; } })()) : null;
  if (!key && !paper) {
    const [edit] = await getDb().select({ data: paperEdits.data }).from(paperEdits).where(eq(paperEdits.slug, slug)).limit(1);
    try { const data = JSON.parse(edit?.data || "{}") as { _keyFigureKey?: string; _figureKeys?: string[] }; key = requestedIndex === null ? data._keyFigureKey ?? null : data._figureKeys?.[requestedIndex] ?? null; } catch { key = null; }
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
