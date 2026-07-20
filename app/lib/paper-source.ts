const DOI_PATTERN = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;

export function extractDoi(value?: string) {
  const match = value?.trim().match(DOI_PATTERN)?.[0];
  return match?.replace(/[.,;]+$/, "");
}

export function paperSourceHref(sourceUrl?: string, doi?: string) {
  const source = sourceUrl?.trim() ?? "";
  if (/^https?:\/\//i.test(source)) return source;
  if (/^\/\//.test(source)) return `https:${source}`;
  if (/^(?:www\.|doi\.org\/)/i.test(source)) return `https://${source}`;

  const sourceDoi = extractDoi(source);
  const resolvedDoi = sourceDoi || extractDoi(doi);
  if (resolvedDoi) return `https://doi.org/${resolvedDoi}`;

  const arxiv = source.match(/^(?:arxiv:\s*)?(\d{4}\.\d{4,5})(?:v\d+)?$/i)?.[1];
  if (arxiv) return `https://arxiv.org/abs/${arxiv}`;

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#:]|$)/i.test(source)) return `https://${source}`;
  return undefined;
}
