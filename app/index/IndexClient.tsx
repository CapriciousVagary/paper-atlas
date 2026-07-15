"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { categories, getAuthorDetails, papers, type Paper } from "../data";

export default function IndexClient() {
  const [uploaded, setUploaded] = useState<Paper[]>([]);
  useEffect(() => { fetch("/api/papers").then((response) => response.ok ? response.json() : { papers: [] }).then((data) => setUploaded(data.papers ?? [])).catch(() => undefined); }, []);
  const allPapers = useMemo(() => [...papers, ...uploaded], [uploaded]);
  const authors = [...new Map(allPapers.flatMap((paper) => getAuthorDetails(paper)).map((author) => [`${author.name}|${author.institution ?? ""}`, author])).values()];
  const keywords = [...new Set(allPapers.flatMap((paper) => paper.keywords ?? []))];
  const categoryItems = useMemo(() => {
    const map = new Map(categories.map((item) => [item.name, { name: item.name, code: item.code, subcategories: [...item.subcategories] }]));
    for (const paper of uploaded) {
      const item = map.get(paper.category) ?? { name: paper.category, code: "NEW", subcategories: [] as string[] };
      if (!item.subcategories.includes(paper.subcategory)) item.subcategories.push(paper.subcategory);
      map.set(paper.category, item);
    }
    return [...map.values()];
  }, [uploaded]);

  return <div className="index-shell"><span className="section-kicker">KNOWLEDGE INDEX</span><h1>从不同路径，重新找到一篇论文。</h1><p className="index-lead">索引会随着已审核论文自动更新；同名作者在有单位信息时按“姓名＋单位”区分。</p><div className="index-grid"><section><div className="index-heading"><span>01</span><h2>按研究方向</h2></div>{categoryItems.map((category) => <article className="index-category" key={category.name}><Link href={`/browse?category=${encodeURIComponent(category.name)}`}><b>{category.name}</b><span>{category.code}</span><p>{category.subcategories.join(" · ")}</p></Link></article>)}</section><section><div className="index-heading"><span>02</span><h2>按作者</h2></div><div className="author-index">{authors.map((author, index) => { const params = new URLSearchParams({ author: author.name }); if (author.institution) params.set("institution", author.institution); const count = allPapers.filter((paper) => getAuthorDetails(paper).some((item) => item.name === author.name && (!author.institution || item.institution === author.institution))).length; return <Link href={`/browse?${params}`} key={`${author.name}-${author.institution ?? ""}`}><span>{String(index + 1).padStart(2, "0")}</span><b>{author.name}{author.institution && <em>{author.institution}</em>}</b><small>{count} 篇</small></Link>; })}</div></section><section><div className="index-heading"><span>03</span><h2>按标签内容</h2></div><div className="keyword-index">{keywords.map((keyword) => <Link href={`/browse?tag=${encodeURIComponent(keyword)}`} key={keyword}>{keyword}<small>{allPapers.filter((paper) => paper.keywords?.includes(keyword)).length}</small></Link>)}</div></section></div></div>;
}
