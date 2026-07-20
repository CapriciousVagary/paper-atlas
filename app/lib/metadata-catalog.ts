import { getDb } from "../../db";
import { institutions, journals, paperEdits, papers as storedPapers, taxonomyItems } from "../../db/schema";
import { applyPaperOverrides, categories as defaultCategories, getAuthorDetails, getClassifications, papers as curatedPapers, type Paper } from "../data";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return JSON.parse(value || "") as T; } catch { return fallback; }
}

export async function loadMetadataCatalog() {
  const [stored, taxonomy, journalRows, institutionRows, edits] = await Promise.all([
    getDb().select().from(storedPapers).limit(1000),
    getDb().select().from(taxonomyItems).limit(1000),
    getDb().select().from(journals).limit(500),
    getDb().select().from(institutions).limit(1000),
    getDb().select().from(paperEdits).limit(1000),
  ]);
  const overrides = Object.fromEntries(edits.map((edit) => [edit.slug, parseJson<Partial<Paper>>(edit.data, {})]));
  const curated = applyPaperOverrides(curatedPapers, overrides);
  const hidden = new Set(taxonomy.filter((item) => !item.active).map((item) => `${item.kind}\u0000${item.parent}\u0000${item.name}`));
  const categoryMap = new Map<string, Set<string>>();
  const addClassification = (category: string, subcategory: string) => {
    if (!category || hidden.has(`category\u0000\u0000${category}`)) return;
    if (!categoryMap.has(category)) categoryMap.set(category, new Set());
    if (subcategory && !hidden.has(`subcategory\u0000${category}\u0000${subcategory}`)) categoryMap.get(category)?.add(subcategory);
  };
  defaultCategories.forEach((item) => item.subcategories.forEach((subcategory) => addClassification(item.name, subcategory)));
  curated.forEach((paper) => getClassifications(paper).forEach((item) => addClassification(item.category, item.subcategory)));
  stored.forEach((paper) => parseJson<Array<{ category: string; subcategory: string }>>(paper.classifications, [{ category: paper.category, subcategory: paper.subcategory }]).forEach((item) => addClassification(item.category, item.subcategory)));
  taxonomy.filter((item) => item.active).forEach((item) => item.kind === "category" ? addClassification(item.name, "") : item.kind === "subcategory" ? addClassification(item.parent, item.name) : undefined);

  const tagSet = new Set<string>();
  curated.forEach((paper) => (paper.keywords ?? []).forEach((tag) => tagSet.add(tag)));
  stored.forEach((paper) => parseJson<string[]>(paper.tags, []).forEach((tag) => tagSet.add(tag)));
  taxonomy.filter((item) => item.kind === "tag" && item.active).forEach((item) => tagSet.add(item.name));
  for (const key of hidden) if (key.startsWith("tag\u0000\u0000")) tagSet.delete(key.split("\u0000")[2]);

  const journalMap = new Map<string, { fullName: string; abbreviation: string; aliases: string[] }>();
  const addJournal = (fullName: string, abbreviation = "", aliases: string[] = []) => {
    const name = fullName.trim(); if (!name || name === "待补充") return;
    journalMap.set(name.toLowerCase(), { fullName: name, abbreviation: abbreviation.trim(), aliases });
  };
  curated.forEach((paper) => addJournal(paper.journal));
  stored.forEach((paper) => addJournal(paper.journal));
  journalRows.forEach((row) => addJournal(row.fullName, row.abbreviation, parseJson(row.aliases, [])));

  const institutionMap = new Map<string, { fullName: string; aliases: string[] }>();
  const addInstitution = (fullName: string, aliases: string[] = []) => { const name = fullName.trim(); if (name) institutionMap.set(name.toLowerCase(), { fullName: name, aliases }); };
  curated.forEach((paper) => getAuthorDetails(paper).forEach((author) => author.institution && addInstitution(author.institution)));
  institutionRows.forEach((row) => addInstitution(row.fullName, parseJson(row.aliases, [])));

  return {
    categories: [...categoryMap].map(([name, subcategories]) => ({ name, subcategories: [...subcategories].sort((a, b) => a.localeCompare(b, "zh-CN")) })),
    tags: [...tagSet].sort((a, b) => a.localeCompare(b, "zh-CN")),
    journals: [...journalMap.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "en")),
    institutions: [...institutionMap.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "en")),
  };
}
