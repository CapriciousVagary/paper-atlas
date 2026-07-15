"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { categories, papers, type Paper } from "../data";
import { FigurePreview } from "./FigurePreview";
import { SiteHeader } from "./SiteHeader";

type UploadedPaper = Pick<Paper, "slug" | "title" | "category" | "subcategory" | "journal" | "published"> & Partial<Paper>;

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部方向");
  const [uploaded, setUploaded] = useState<UploadedPaper[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setActiveCategory(params.get("category") ?? "全部方向");
    fetch("/api/papers")
      .then((response) => (response.ok ? response.json() : { papers: [] }))
      .then((data) => setUploaded(data.papers ?? []))
      .catch(() => undefined);
  }, []);

  const allPapers = useMemo(() => [...papers, ...uploaded] as Paper[], [uploaded]);
  const displayCategories = useMemo(() => {
    const items = categories.map((item) => ({ ...item, subcategories: [...item.subcategories] }));
    for (const paper of uploaded) {
      let category = items.find((item) => item.name === paper.category);
      if (!category) {
        category = { name: paper.category, code: "NEW", description: "由联合课题组投稿者新增的研究方向", subcategories: [], tone: "violet" };
        items.push(category);
      }
      if (!category.subcategories.includes(paper.subcategory)) category.subcategories.push(paper.subcategory);
    }
    return items;
  }, [uploaded]);
  const visiblePapers = allPapers.filter((paper) => {
    const inCategory = activeCategory === "全部方向" || paper.category === activeCategory;
    const haystack = [paper.title, paper.titleZh, paper.journal, paper.category, paper.subcategory, ...(paper.authors ?? []), ...(paper.keywords ?? [])]
      .filter(Boolean).join(" ").toLowerCase();
    return inCategory && haystack.includes(query.trim().toLowerCase());
  });

  return (
    <main>
      <SiteHeader />
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">PHOTONICSX × RIQT SHARED RESEARCH MEMORY</span>
          <h1>把读过的论文，变成<br /><em>可检索的集体知识。</em></h1>
          <p>复旦大学 PhotonicsX 与香港理工大学 RIQT 联合维护，沉淀中文摘要、关键图表、标签与一眼可回忆的创新点。</p>
          <div className="search-box">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、作者、单位、关键词…" aria-label="搜索论文" />
            <kbd>⌘ K</kbd>
          </div>
          <div className="hero-stats">
            <span><strong>{allPapers.length}</strong> 篇论文</span>
            <span><strong>{displayCategories.reduce((sum, item) => sum + item.subcategories.length, 0)}</strong> 个专题</span>
            <span><strong>{displayCategories.length}</strong> 个主方向</span>
          </div>
        </div>
        <div className="knowledge-map" aria-label="研究方向知识图谱">
          <div className="map-grid" />
          <div className="map-center"><span>JOINT ATLAS</span><strong>PX × RIQT</strong></div>
          <div className="map-orbit orbit-one" />
          <div className="map-orbit orbit-two" />
          <div className="map-node node-oc"><b>OC</b><small>光计算</small></div>
          <div className="map-node node-ln"><b>LN</b><small>薄膜铌酸锂</small></div>
          <div className="map-node node-laser"><b>ECL</b><small>集成激光器</small></div>
          <span className="map-label label-one">MZI</span><span className="map-label label-two">PPLN</span><span className="map-label label-three">MRR</span>
        </div>
      </section>

      <section className="library-section">
        <div className="section-heading">
          <div><span className="section-kicker">RESEARCH COLLECTIONS</span><h2>研究方向</h2></div>
          <p>先选领域，再进入更细的技术路线</p>
        </div>
        <div className="category-grid">
          {displayCategories.map((category, index) => (
            <button className={`category-card ${category.tone} ${activeCategory === category.name ? "selected" : ""}`} key={category.name} onClick={() => setActiveCategory(activeCategory === category.name ? "全部方向" : category.name)}>
              <div className="category-top"><span className="category-number">0{index + 1}</span><span className="category-code">{category.code}</span></div>
              <h3>{category.name}</h3><p>{category.description}</p>
              <div className="subcategory-list">{category.subcategories.map((sub) => <span key={sub}>{sub}</span>)}</div>
              <div className="category-foot"><span>{allPapers.filter((p) => p.category === category.name).length} 篇收录</span><b>↗</b></div>
            </button>
          ))}
        </div>
      </section>

      <section className="latest-section">
        <div className="section-heading">
          <div><span className="section-kicker">LATEST NOTES</span><h2>{activeCategory === "全部方向" ? "最近整理" : activeCategory}</h2></div>
          <button className="text-button" onClick={() => { setActiveCategory("全部方向"); setQuery(""); }}>查看全部 <span>→</span></button>
        </div>
        <div className="paper-list">
          {visiblePapers.length ? visiblePapers.map((paper, index) => (
            <article className="paper-card" key={paper.slug}>
              <div className="paper-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="paper-main">
                <div className="paper-meta"><span>{paper.category}</span><i />{paper.subcategory}<i />{paper.journal} · {paper.published}</div>
                <h3><Link href={`/papers/${paper.slug}`}>{paper.title}</Link></h3>
                {paper.titleZh && <p className="paper-title-zh">{paper.titleZh}</p>}
                <div className="paper-authors">{(paper.authors ?? ["待补充作者"]).join(" · ")}</div>
                {paper.insight && <div className="insight-strip"><b>一句话创新</b><span>{paper.insight}</span></div>}
              </div>
              {paper.figureImageUrl ? <div className="paper-visual"><img className="uploaded-key-figure" src={paper.figureImageUrl} alt={`关键图：${paper.title}`} /><Link href={`/papers/${paper.slug}`} aria-label={`查看 ${paper.title}`}>阅读笔记 ↗</Link></div> : paper.figureType ? <div className="paper-visual"><FigurePreview type={paper.figureType} /><Link href={`/papers/${paper.slug}`} aria-label={`查看 ${paper.title}`}>阅读笔记 ↗</Link></div> : <Link className="paper-open" href={`/papers/${paper.slug}`}>打开条目 →</Link>}
            </article>
          )) : <div className="empty-state"><strong>没有找到匹配论文</strong><span>换一个关键词或研究方向试试。</span></div>}
        </div>
      </section>

      <section className="contribute-banner">
        <div><span className="section-kicker">CONTRIBUTE TO THE ATLAS</span><h2>读完一篇，留下一个可复用的入口。</h2><p>任何人都可上传 PDF、填写分类标签并指定关键图；审核通过后公开显示。</p></div>
        <Link href="/upload">上传并创建条目 <span>↗</span></Link>
      </section>
      <footer><span>Fudan PhotonicsX × PolyU RIQT Literature Atlas</span><span>Research memory, shared.</span></footer>
    </main>
  );
}
