import { readFile, writeFile, mkdir } from "node:fs/promises";

const sourcePath = process.argv[2];
const outputPath = process.argv[3] ?? "tmp/paper-metadata.json";
if (!sourcePath) throw new Error("Usage: node scripts/prepare-paper-import.mjs <markdown> [output]");

const source = await readFile(sourcePath, "utf8");
const mainSection = source.split("## 补充材料归属")[0];
const entries = [];
for (const line of mainSection.split(/\r?\n/)) {
  if (!/^\|\s*\d+\s*\|/.test(line)) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  const [, titleCell, type, doiCell] = cells;
  if (type === "学位论文") continue;
  const titleMatch = titleCell.match(/^\[([^\]]+)\]\(([^)]+)\)/);
  const doiMatch = doiCell.match(/10\.\d{4,9}\/[^\s\])；<]+/i);
  entries.push({
    number: Number(cells[0]),
    expectedTitle: titleMatch?.[1] ?? titleCell,
    link: titleMatch?.[2] ?? "",
    type,
    doi: doiMatch?.[0]?.replace(/[.,;]+$/, "") ?? "",
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanText = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&(?:nbsp|#160);/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

function reconstructAbstract(inverted) {
  if (!inverted) return "";
  const words = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const position of positions) words[position] = word;
  }
  return words.filter(Boolean).join(" ");
}

function normalized(value = "") {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
}

function titleSimilarity(a, b) {
  const left = new Set(normalized(a).split(" ").filter(Boolean));
  const right = new Set(normalized(b).split(" ").filter(Boolean));
  const intersection = [...left].filter((item) => right.has(item)).length;
  return left.size && right.size ? (2 * intersection) / (left.size + right.size) : 0;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "PaperAtlas/1.0 (citation verification)" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function resolveEntry(entry) {
  const result = { ...entry, status: "manual_needed", title: "", journal: "", published: "", authors: [], institutions: [], abstractEn: "", metadataSources: [], notes: [] };
  if (!entry.doi) return result;
  const encodedDoi = encodeURIComponent(entry.doi);
  try {
    const data = await fetchJson(`https://api.crossref.org/works/${encodedDoi}`);
    const work = data.message;
    result.title = cleanText(work.title?.[0] ?? "");
    result.journal = cleanText(work["container-title"]?.[0] ?? work.publisher ?? "");
    const parts = work.published?.["date-parts"]?.[0] ?? work.issued?.["date-parts"]?.[0] ?? [];
    result.published = parts.length ? `${parts[0]}${parts[1] ? `.${String(parts[1]).padStart(2, "0")}` : ""}` : "";
    result.authors = (work.author ?? []).map((author) => [author.given, author.family].filter(Boolean).join(" ")).filter(Boolean);
    result.institutions = [...new Set((work.author ?? []).flatMap((author) => (author.affiliation ?? []).map((item) => cleanText(item.name))).filter(Boolean))];
    result.abstractEn = cleanText(work.abstract ?? "");
    result.metadataSources.push("Crossref");
  } catch (error) {
    result.notes.push(`Crossref: ${error.message}`);
  }
  try {
    const work = await fetchJson(`https://api.openalex.org/works/https://doi.org/${encodedDoi}`);
    result.title ||= cleanText(work.title ?? work.display_name ?? "");
    result.journal ||= cleanText(work.primary_location?.source?.display_name ?? "");
    result.published ||= work.publication_date ? work.publication_date.slice(0, 7).replace("-", ".") : String(work.publication_year ?? "");
    result.authors = result.authors.length ? result.authors : (work.authorships ?? []).map((item) => cleanText(item.author?.display_name ?? "")).filter(Boolean);
    const institutions = (work.authorships ?? []).flatMap((item) => (item.institutions ?? []).map((institution) => cleanText(institution.display_name ?? ""))).filter(Boolean);
    if (institutions.length) result.institutions = [...new Set([...result.institutions, ...institutions])];
    result.abstractEn ||= reconstructAbstract(work.abstract_inverted_index);
    result.metadataSources.push("OpenAlex");
  } catch (error) {
    result.notes.push(`OpenAlex: ${error.message}`);
  }
  if (!result.abstractEn) {
    try {
      const paper = await fetchJson(`https://api.semanticscholar.org/graph/v1/paper/DOI:${encodedDoi}?fields=title,abstract,authors,venue,year,publicationDate`);
      result.title ||= cleanText(paper.title ?? "");
      result.journal ||= cleanText(paper.venue ?? "");
      result.published ||= paper.publicationDate ? paper.publicationDate.slice(0, 7).replace("-", ".") : String(paper.year ?? "");
      result.authors = result.authors.length ? result.authors : (paper.authors ?? []).map((author) => cleanText(author.name ?? "")).filter(Boolean);
      result.abstractEn = cleanText(paper.abstract ?? "");
      result.metadataSources.push("Semantic Scholar");
    } catch (error) {
      result.notes.push(`Semantic Scholar: ${error.message}`);
    }
  }
  const similarity = titleSimilarity(entry.expectedTitle, result.title);
  result.titleSimilarity = Number(similarity.toFixed(3));
  result.status = !result.title ? "not_found" : similarity >= 0.92 ? "verified" : similarity >= 0.72 ? "suspicious" : "mismatch";
  if (!result.abstractEn) result.notes.push("Abstract unavailable from metadata APIs");
  return result;
}

const resolved = [];
for (let index = 0; index < entries.length; index += 4) {
  const batch = entries.slice(index, index + 4);
  resolved.push(...await Promise.all(batch.map(resolveEntry)));
  await sleep(250);
  process.stdout.write(`Resolved ${Math.min(index + 4, entries.length)}/${entries.length}\r`);
}

await mkdir(new URL(".", `file:///${outputPath.replace(/\\/g, "/")}`).pathname, { recursive: true }).catch(() => undefined);
await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), count: resolved.length, papers: resolved }, null, 2)}\n`, "utf8");
const summary = Object.groupBy(resolved, (item) => item.status);
console.log(`\nWrote ${resolved.length} records to ${outputPath}`);
console.log(Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, value.length])));
