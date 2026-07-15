import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { papers } from "../../../../../db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [paper] = await getDb().select({ keyFigureKey: papers.keyFigureKey, status: papers.status }).from(papers).where(eq(papers.slug, slug)).limit(1);
  if (!paper?.keyFigureKey || paper.status !== "approved") return new Response("Not found", { status: 404 });
  const object = await (env as unknown as { PAPERS: R2Bucket }).PAPERS.get(paper.keyFigureKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
}
