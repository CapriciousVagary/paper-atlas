import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { institutions as storedInstitutions } from "../../../db/schema";
import { papers } from "../../data";
import { mergeInstitutionOptions, normalizeInstitution } from "../../lib/institutions";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const curated = papers.flatMap((paper) => paper.institutions ?? []);
  let stored: Array<{ fullName: string; aliases: string[] }> = [];
  try {
    await ensureDatabase();
    const rows = await getDb().select().from(storedInstitutions).limit(500);
    stored = rows.map((row) => ({ fullName: row.fullName, aliases: JSON.parse(row.aliases || "[]") }));
  } catch {
    // Static suggestions remain available when D1 is unavailable in preview.
  }
  const needle = normalizeInstitution(query);
  const institutions = mergeInstitutionOptions(curated, stored)
    .filter((item) => !needle || [item.fullName, ...item.aliases].some((value) => normalizeInstitution(value).includes(needle)))
    .slice(0, 20);
  return Response.json({ institutions });
}
