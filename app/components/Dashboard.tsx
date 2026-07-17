"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { applyPaperOverrides, categories, getClassifications, hasClassification, paperAddedAt, papers, type Paper } from "../data";
import { FigurePreview } from "./FigurePreview";
import { SiteHeader } from "./SiteHeader";

type UploadedPaper = Pick<Paper, "slug" | "title" | "category" | "subcategory" | "journal" | "published"> & Partial<Paper>;

export default function Dashboard({ initialQuery = "", initialCategory = "全部方向" }: { initialQuery?: string; initialCategory?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [uploaded, setUploaded] = useState<UploadedPaper[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Paper>>>({});
  const [currentTime] = useState(() => Date.now());
  const latestSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const loadPapers = () => fetch(`/api/papers?refresh=${Date.now()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { papers: [] }))
      .then((data) => { setUploaded(data.papers ?? []); setOverrides(data.overrides ?? {}); })
      .catch(() => undefined);
    void loadPapers();
    const refresh = () => { if (document.visibilityState === "visible") void loadPapers(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    if (initialCategory !== "全部方向") window.setTimeout(() => latestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [initialCategory]);

  const allPapers = useMemo(() => [...applyPaperOverrides(papers, overrides), ...uploaded] as Paper[], [uploaded, overrides]);
  const displayCategories = useMemo(() => {
    const items = categories.map((item) => ({ ...item, subcategories: [...item.subcategories] }));
    for (const paper of allPapers) for (const classification of getClassifications(paper)) {
      let category = items.find((item) => item.name === classification.category);
      if (!category) { category = { name: classification.category, code: "NEW", description: "由联合课题组投稿者新增的研究方向", subcategories: [], tone: "violet" }; items.push(category); }
      if (!category.subcategories.includes(classification.subcategory)) category.subcategories.push(classification.subcategory);
    }
    return items;
  }, [allPapers]);
  const visiblePapers = allPapers.filter((paper) => {
    const inCategory = activeCategory === "全部方向" || hasClassification(paper, activeCategory);
    const haystack = [paper.title, paper.titleZh, paper.journal, ...getClassifications(paper).flatMap((item) => [item.category, item.subcategory]), ...(paper.authors ?? []), ...(paper.keywords ?? [])]
      .filter(Boolean).join(" ").toLowerCase();
    return inCategory && haystack.includes(query.trim().toLowerCase());
  }).sort((a, b) => new Date(paperAddedAt(b)).getTime() - new Date(paperAddedAt(a)).getTime()).slice(0, 3);

  function chooseCategory(category: string) {
    setActiveCategory(category);
    window.requestAnimationFrame(() => latestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function isNewPaper(paper: Paper) {
    const added = new Date(paperAddedAt(paper)).getTime();
    return Number.isFinite(added) && currentTime - added <= 3 * 24 * 60 * 60 * 1000;
  }

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
            <button className={`category-card ${category.tone} ${activeCategory === category.name ? "selected" : ""}`} key={category.name} onClick={() => chooseCategory(category.name)}>
              <div className="category-top"><span className="category-number">0{index + 1}</span><span className="category-code">{category.code}</span></div>
              <h3>{category.name}</h3><p>{category.description}</p>
              <div className="subcategory-list">{category.subcategories.map((sub) => <span key={sub}>{sub}</span>)}</div>
              <div className="category-foot"><span>{allPapers.filter((paper) => hasClassification(paper, category.name)).length} 篇收录</span><b>↗</b></div>
            </button>
          ))}
        </div>
      </section>

      <section className="latest-section" ref={latestSectionRef}>
        <div className="section-heading">
          <div><span className="section-kicker">LATEST NOTES</span><h2>{activeCategory === "全部方向" ? "最近上传" : `${activeCategory} · 最近上传`}</h2></div>
          <div className="section-actions">{activeCategory !== "全部方向" && <Link className="category-all-link" href={`/browse?category=${encodeURIComponent(activeCategory)}`}>查看该大类全部</Link>}<Link className="text-button" href="/browse">查看全部论文 <span>→</span></Link></div>
        </div>
        <div className="paper-list">
          {visiblePapers.length ? visiblePapers.map((paper, index) => (
            <article className="paper-card" key={paper.slug}>
              <div className="paper-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="paper-main">
                <div className="paper-meta"><span>{paper.category}</span><i />{paper.subcategory}<i />{paper.journal} · {paper.published}{isNewPaper(paper) && <em className="new-paper-badge">新上传</em>}</div>
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
