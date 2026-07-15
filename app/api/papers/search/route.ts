import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { paperEdits, papers as storedPapers } from "../../../../db/schema";
import { applyPaperOverrides, papers as curatedPapers, type Paper } from "../../../data";
import { rankMatches, type MatchablePaper } from "../../../lib/paper-match";

async function allApprovedPapers(): Promise<MatchablePaper[]> {
  try {
    const [stored, edits] = await Promise.all([getDb().select().from(storedPapers).where(eq(storedPapers.status, "approved")).limit(500), getDb().select().from(paperEdits).limit(500)]);
    const overrides = Object.fromEntries(edits.map((edit) => [edit.slug, JSON.parse(edit.data || "{}")]));
    const curated = applyPaperOverrides(curatedPapers, overrides).map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl, status: "approved" }));
    return [...curated, ...stored.map((paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl, status: paper.status }))];
  } catch {
    return curatedPapers.map((paper: Paper) => ({ slug: paper.slug, title: paper.title, titleZh: paper.titleZh, journal: paper.journal, published: paper.published, doi: paper.doi, sourceUrl: paper.sourceUrl, status: "approved" }));
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ papers: [] });
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 12), 30);
  const results = rankMatches(await allApprovedPapers(), query, "", 0.18).slice(0, limit);
  return Response.json({ papers: results });
}
