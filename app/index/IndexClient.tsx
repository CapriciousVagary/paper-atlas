"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applyPaperOverrides, categories, getAuthorDetails, getClassifications, hasClassification, papers, type Paper } from "../data";

export default function IndexClient() {
  const [uploaded, setUploaded] = useState<Paper[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Paper>>>({});
  useEffect(() => { fetch("/api/papers").then((response) => response.ok ? response.json() : { papers: [] }).then((data) => { setUploaded(data.papers ?? []); setOverrides(data.overrides ?? {}); }).catch(() => undefined); }, []);
  const allPapers = useMemo(() => [...applyPaperOverrides(papers, overrides), ...uploaded], [uploaded, overrides]);
  const authors = [...new Map(allPapers.flatMap((paper) => getAuthorDetails(paper)).map((author) => [`${author.name}|${author.institution ?? ""}`, author])).values()];
  const keywords = [...new Set(allPapers.flatMap((paper) => paper.keywords ?? []))];
  const categoryMap = new Map(categories.map((item) => [item.name, { name: item.name, code: item.code, subcategories: [...item.subcategories] }]));
  for (const paper of allPapers) for (const classification of getClassifications(paper)) {
    const item = categoryMap.get(classification.category) ?? { name: classification.category, code: "NEW", subcategories: [] as string[] };
    if (!item.subcategories.includes(classification.subcategory)) item.subcategories.push(classification.subcategory);
    categoryMap.set(classification.category, item);
  }
  const categoryItems = [...categoryMap.values()];

  return <div className="index-shell"><span className="section-kicker">KNOWLEDGE INDEX</span><h1>从不同路径，重新找到一篇论文。</h1><p className="index-lead">索引会随着已审核论文自动更新；同名作者按“姓名＋单位”区分，中英文名别名会指向同一作者条目。</p><div className="index-grid"><section><div className="index-heading"><span>01</span><h2>按研究方向</h2></div>{categoryItems.map((category) => <article className="index-category" key={category.name}><Link href={`/browse?category=${encodeURIComponent(category.name)}`}><b>{category.name}</b><span>{category.code} · {allPapers.filter((paper) => hasClassification(paper, category.name)).length} 篇</span><p>{category.subcategories.join(" · ")}</p></Link></article>)}</section><section><div className="index-heading"><span>02</span><h2>按作者</h2></div><div className="author-index">{authors.map((author, index) => { const params = new URLSearchParams({ author: author.name }); if (author.institution) params.set("institution", author.institution); const count = allPapers.filter((paper) => getAuthorDetails(paper).some((item) => (item.name === author.name || item.aliases?.includes(author.name)) && (!author.institution || item.institution === author.institution))).length; return <Link href={`/browse?${params}`} key={`${author.name}-${author.institution ?? ""}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{author.name}{author.aliases?.length ? <em>{author.aliases.join(" / ")}</em> : null}{author.institution && <em>{author.institution}</em>}</b><small>{count} 篇</small></Link>; })}</div></section><section><div className="index-heading"><span>03</span><h2>按标签内容</h2></div><div className="keyword-index">{keywords.map((keyword) => <Link href={`/browse?tag=${encodeURIComponent(keyword)}`} key={keyword}>{keyword}<small>{allPapers.filter((paper) => paper.keywords?.includes(keyword)).length}</small></Link>)}</div></section></div></div>;
}
