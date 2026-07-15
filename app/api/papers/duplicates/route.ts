import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { papers as storedPapers } from "../../../../db/schema";
import { papers as curatedPapers } from "../../../data";
import { rankMatches, type MatchablePaper } from "../../../lib/paper-match";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim() ?? "";
  const doi = url.searchParams.get("doi")?.trim() ?? "";
  if (title.length < 3 && !doi) return Response.json({ duplicates: [] });
  const items: MatchablePaper[] = curatedPapers.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl, status: "approved" }));
  try {
    const stored = await getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).limit(500);
    items.push(...stored.map((paper) => ({ slug: paper.slug, title: paper.title, journal: paper.journal, published: paper.published, sourceUrl: paper.sourceUrl, status: paper.status })));
  } catch {
    // Curated papers still provide duplicate detection during local preview.
  }
  return Response.json({ duplicates: rankMatches(items, title, doi, 0.72).slice(0, 5) });
}
