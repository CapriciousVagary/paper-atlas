export type MatchablePaper = {
  slug: string;
  title: string;
  titleZh?: string;
  journal?: string;
  published?: string;
  doi?: string;
  sourceUrl?: string;
  status?: string;
};

export function extractDoi(value = "") {
  return value.match(/10\.\d{4,9}\/[^\s?#]+/i)?.[0]?.replace(/[.,;:]+$/, "").toLowerCase() ?? "";
}

export function normalizeTitle(value = "") {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function bigrams(value: string) {
  const compact = normalizeTitle(value).replace(/\s+/g, "");
  if (compact.length < 2) return new Set(compact ? [compact] : []);
  return new Set(Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2)));
}

function dice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach((item) => { if (right.has(item)) overlap += 1; });
  return (2 * overlap) / (left.size + right.size);
}

export function titleSimilarity(left: string, right: string) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const tokenScore = dice(aTokens, bTokens);
  const charScore = dice(bigrams(a), bigrams(b));
  const containsBonus = a.includes(b) || b.includes(a) ? 0.08 : 0;
  return Math.min(1, tokenScore * 0.55 + charScore * 0.45 + containsBonus);
}

export function rankMatches(items: MatchablePaper[], title: string, doi = "", threshold = 0.42) {
  const normalizedDoi = extractDoi(doi);
  return items.map((paper) => {
    const paperDoi = extractDoi(paper.doi || paper.sourceUrl || "");
    const doiMatch = Boolean(normalizedDoi && paperDoi && normalizedDoi === paperDoi);
    const titleScore = Math.max(titleSimilarity(title, paper.title), titleSimilarity(title, paper.titleZh ?? ""));
    return { ...paper, score: doiMatch ? 1 : titleScore, matchReason: doiMatch ? "DOI 完全一致" : titleScore >= 0.98 ? "标题完全一致" : "标题相近" };
  }).filter((paper) => paper.score >= threshold).sort((a, b) => b.score - a.score);
}
