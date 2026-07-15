"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authorRoleLabels, categories, getAuthorDetails, paperAddedAt, papers, type Paper } from "../data";

type Query = { category?: string; subcategory?: string; tag?: string; author?: string; institution?: string; sort?: string; page?: string };
const PAGE_SIZE = 10;

function publishedScore(value: string) {
  const parts = value.match(/\d+/g)?.map(Number) ?? [];
  return (parts[0] ?? 0) * 100 + (parts[1] ?? 0);
}

export default function BrowseClient({ initialQuery }: { initialQuery: Query }) {
  const [uploaded, setUploaded] = useState<Paper[]>([]);
  const [currentTime] = useState(() => Date.now());
  useEffect(() => { fetch("/api/papers").then((response) => response.ok ? response.json() : { papers: [] }).then((data) => setUploaded(data.papers ?? [])).catch(() => undefined); }, []);
  const allPapers = useMemo(() => [...papers, ...uploaded], [uploaded]);
  const category = initialQuery.category ?? "";
  const subcategory = initialQuery.subcategory ?? "";
  const tag = initialQuery.tag ?? "";
  const author = initialQuery.author ?? "";
  const institution = initialQuery.institution ?? "";
  const sort = initialQuery.sort === "published" ? "published" : "added";
  const page = Math.max(1, Number.parseInt(initialQuery.page ?? "1", 10) || 1);

  const categoryNames = [...new Set([...categories.map((item) => item.name), ...allPapers.map((paper) => paper.category)])];
  const categoryPapers = category ? allPapers.filter((paper) => paper.category === category) : allPapers;
  const subcategories = [...new Set(categoryPapers.map((paper) => paper.subcategory))];
  const subcategoryPapers = subcategory ? categoryPapers.filter((paper) => paper.subcategory === subcategory) : categoryPapers;
  const tagCounts = new Map<string, number>();
  for (const paper of subcategoryPapers) for (const keyword of paper.keywords ?? []) tagCounts.set(keyword, (tagCounts.get(keyword) ?? 0) + 1);
  const availableTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN")).slice(0, 24);

  const filtered = subcategoryPapers.filter((paper) => {
    if (tag && !paper.keywords?.includes(tag)) return false;
    if (institution && !author) {
      const hasInstitution = paper.institutions?.includes(institution) || getAuthorDetails(paper).some((item) => item.institution === institution);
      if (!hasInstitution) return false;
    }
    if (author) {
      const matches = getAuthorDetails(paper).some((item) => item.name === author && (!institution || item.institution === institution));
      if (!matches) return false;
    }
    return true;
  }).sort((a, b) => sort === "published"
    ? publishedScore(b.published) - publishedScore(a.published)
    : new Date(paperAddedAt(b)).getTime() - new Date(paperAddedAt(a)).getTime());

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function href(patch: Query) {
    const params = new URLSearchParams();
    const next = { category, subcategory, tag, author, institution, sort, ...patch };
    for (const [key, value] of Object.entries(next)) if (value && !(key === "sort" && value === "added")) params.set(key, value);
    return `/browse${params.size ? `?${params}` : ""}`;
  }

  return <div className="browse-shell">
    <header className="browse-heading"><span className="section-kicker">CURATED COLLECTION</span><h1>{author ? `${author} 的已收录论文` : institution || category || "全部论文"}</h1><p>{author && institution && <b>{institution} · </b>}共 {filtered.length} 篇；可继续按小类和精简标签筛选。</p></header>
    <div className="browse-layout">
      <aside className="filter-panel">
        <section><b>大类</b><Link className={!category ? "active" : ""} href={href({ category: "", subcategory: "", tag: "", page: "1" })}>全部方向 <span>{allPapers.length}</span></Link>{categoryNames.map((name) => <Link className={category === name ? "active" : ""} href={href({ category: name, subcategory: "", tag: "", page: "1" })} key={name}>{name}<span>{allPapers.filter((paper) => paper.category === name).length}</span></Link>)}</section>
        {category && <section><b>小类</b><Link className={!subcategory ? "active" : ""} href={href({ subcategory: "", tag: "", page: "1" })}>全部小类</Link>{subcategories.map((name) => <Link className={subcategory === name ? "active" : ""} href={href({ subcategory: name, tag: "", page: "1" })} key={name}>{name}</Link>)}</section>}
        {!!availableTags.length && <section><b>标签</b><div className="filter-tags"><Link className={!tag ? "active" : ""} href={href({ tag: "", page: "1" })}>全部</Link>{availableTags.map(([name, count]) => <Link className={tag === name ? "active" : ""} href={href({ tag: name, page: "1" })} key={name}>{name}<small>{count}</small></Link>)}</div></section>}
      </aside>
      <section className="browse-results">
        <div className="browse-toolbar"><div><b>{category || "全部方向"}</b>{subcategory && <span> / {subcategory}</span>}{tag && <span> / #{tag}</span>}</div><div className="sort-switch"><span>排序</span><Link className={sort === "added" ? "active" : ""} href={href({ sort: "added", page: "1" })}>最近上传</Link><Link className={sort === "published" ? "active" : ""} href={href({ sort: "published", page: "1" })}>发表年月</Link></div></div>
        <div className="browse-paper-list">{visible.map((paper) => {
          const keyAuthors = getAuthorDetails(paper).filter((item) => item.role !== "other");
          const addedRecently = currentTime - new Date(paperAddedAt(paper)).getTime() <= 3 * 24 * 60 * 60 * 1000;
          return <article key={paper.slug}><div className="browse-paper-meta"><span>{paper.category}</span><i>{paper.subcategory}</i><b>{paper.journal} · {paper.published}</b>{addedRecently && <em>新上传</em>}</div><h2><Link href={`/papers/${paper.slug}`}>{paper.title}</Link></h2>{paper.titleZh && <p>{paper.titleZh}</p>}<div className="browse-authors">{keyAuthors.length ? keyAuthors.map((item) => <span key={`${item.role}-${item.name}`}><b>{authorRoleLabels[item.role]}</b>{item.name}</span>) : <span>作者待补充</span>}</div><div className="browse-tags">{(paper.keywords ?? []).slice(0, 6).map((keyword) => <Link href={href({ tag: keyword, page: "1" })} key={keyword}>#{keyword}</Link>)}</div></article>;
        })}</div>
        {!visible.length && <div className="empty-state"><strong>当前筛选下暂无论文</strong><span>可以移除一个小类、标签或作者筛选条件。</span></div>}
        {pageCount > 1 && <nav className="pagination" aria-label="论文分页">{currentPage > 1 && <Link href={href({ page: String(currentPage - 1) })}>← 上一页</Link>}{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <Link className={number === currentPage ? "active" : ""} href={href({ page: String(number) })} key={number}>{number}</Link>)}{currentPage < pageCount && <Link href={href({ page: String(currentPage + 1) })}>下一页 →</Link>}</nav>}
      </section>
    </div>
  </div>;
}
