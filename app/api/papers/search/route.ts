import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { papers as storedPapers } from "../../../../db/schema";
import { papers as curatedPapers } from "../../../data";
import { rankMatches, type MatchablePaper } from "../../../lib/paper-match";

async function allApprovedPapers(): Promise<MatchablePaper[]> {
  const curated: MatchablePaper[] = curatedPapers.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl, status: "approved" }));
  try {
    const stored = await getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).limit(500);
    return [...curated, ...stored.map((paper) => ({ slug: paper.slug, title: paper.title, journal: paper.journal, published: paper.published, sourceUrl: paper.sourceUrl, status: paper.status }))];
  } catch {
    return curated;
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ papers: [] });
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 12), 30);
  const results = rankMatches(await allApprovedPapers(), query, "", 0.18).slice(0, limit);
  return Response.json({ papers: results });
}
