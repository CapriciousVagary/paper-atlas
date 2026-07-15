import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { paperEdits, papers as storedPapers } from "../../../db/schema";
import { Comments } from "../../components/Comments";
import { FigurePreview } from "../../components/FigurePreview";
import { KeywordEditor } from "../../components/KeywordEditor";
import { SiteHeader } from "../../components/SiteHeader";
import { authorRoleLabels, findPaper, getAuthorDetails, getClassifications, papers, type Paper } from "../../data";

export function generateStaticParams() {
  return papers.map((paper) => ({ slug: paper.slug }));
}

async function loadPaper(slug: string): Promise<Paper | undefined> {
  const curated = findPaper(slug);
  if (curated) {
    try {
      const [edit] = await getDb().select().from(paperEdits).where(eq(paperEdits.slug, slug)).limit(1);
      return edit ? { ...curated, ...JSON.parse(edit.data), slug: curated.slug } : curated;
    } catch { return curated; }
  }
  try {
    const [stored] = await getDb().select().from(storedPapers).where(eq(storedPapers.slug, slug)).limit(1);
    if (!stored || stored.status !== "approved") return undefined;
    const figureType: Paper["figureType"] = stored.category === "光计算" ? "ring" : stored.category.includes("铌酸锂") ? "modulator" : "laser";
    return {
      slug: stored.slug,
      title: stored.title,
      titleZh: stored.titleZh || "中文标题待补充",
      doi: stored.doi || undefined,
      category: stored.category,
      subcategory: stored.subcategory,
      classifications: JSON.parse(stored.classifications || "[]"),
      journal: stored.journal,
      published: stored.published,
      authors: JSON.parse(stored.authors || "[]"),
      institutions: JSON.parse(stored.institutions || "[]"),
      authorDetails: JSON.parse(stored.authorDetails || "[]"),
      abstractZh: stored.abstractZh || "中文摘要正在整理中。",
      insight: stored.insight || "创新点待组内成员确认。",
      keywords: JSON.parse(stored.tags || "[]"),
      figureCaption: stored.figureCaption || "关键图表待上传者补充图注。",
      figureType,
      accent: figureType === "ring" ? "#7458e8" : figureType === "modulator" ? "#14aeb6" : "#dc9130",
      figureImageUrl: stored.keyFigureKey ? `/api/papers/${encodeURIComponent(stored.slug)}/figure` : undefined,
      pdfUrl: stored.fileKey ? `/api/papers/${encodeURIComponent(stored.slug)}/pdf` : undefined,
      sourceUrl: stored.sourceUrl || undefined,
      createdAt: stored.createdAt,
    };
  } catch {
    return undefined;
  }
}

function authorHref(name: string, institution?: string) {
  const params = new URLSearchParams({ author: name });
  if (institution) params.set("institution", institution);
  return `/browse?${params}`;
}

export default async function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = await loadPaper(slug);
  if (!paper) notFound();
  const allAuthors = getAuthorDetails(paper);
  const classifications = getClassifications(paper);
  const keyAuthors = allAuthors.filter((author) => author.role !== "other");
  const defaultAuthors = keyAuthors.length ? keyAuthors : allAuthors.slice(0, 1);

  return <main>
    <SiteHeader />
    <div className="paper-detail-shell">
      <div className="breadcrumb"><Link href="/">文献库</Link><span>/</span><Link href={`/browse?category=${encodeURIComponent(paper.category)}`}>{paper.category}</Link><span>/</span><Link href={`/browse?category=${encodeURIComponent(paper.category)}&subcategory=${encodeURIComponent(paper.subcategory)}`}>{paper.subcategory}</Link></div>
      <section className="paper-detail-hero" style={{ "--paper-accent": paper.accent } as React.CSSProperties}>
        <div className="detail-copy">
          <div className="detail-badges">{classifications.map((item) => <Link href={`/browse?category=${encodeURIComponent(item.category)}&subcategory=${encodeURIComponent(item.subcategory)}`} key={`${item.category}-${item.subcategory}`}><span>{item.category} · {item.subcategory}</span></Link>)}{paper.verificationStatus && <em>{paper.verificationStatus === "verified" ? "题名 / DOI 已核验" : "论文 PDF 人工核验"}</em>}</div>
          <h1>{paper.title}</h1>{paper.titleZh && <p className="detail-title-zh">{paper.titleZh}</p>}
          <div className="citation-line"><strong>{paper.journal}</strong><span>{paper.published}</span></div>
          <div className="key-author-list">{defaultAuthors.length ? defaultAuthors.map((author) => <div key={`${author.role}-${author.name}-${author.institution ?? ""}`}><span>{authorRoleLabels[author.role]}</span><p><Link href={authorHref(author.name, author.institution)}>{author.name}</Link>{author.institution && <> · <Link href={`/browse?institution=${encodeURIComponent(author.institution)}`}>{author.institution}</Link></>}{author.note && <small>{author.note}</small>}</p></div>) : <p className="authors-missing">作者与单位待补充</p>}</div>
          {allAuthors.length > defaultAuthors.length && <details className="all-authors"><summary>查看全部 {allAuthors.length} 位作者</summary><div>{allAuthors.map((author) => <Link href={authorHref(author.name, author.institution)} key={`${author.name}-${author.institution ?? ""}`}>{author.name}{author.institution && <small>{author.institution}</small>}</Link>)}</div></details>}
        </div>
        <div className="detail-figure">{paper.figureImageUrl ? <img className="uploaded-key-figure" src={paper.figureImageUrl} alt={paper.figureCaption || `关键图：${paper.title}`} /> : <FigurePreview type={paper.figureType} />}<span>{paper.figureCaption}</span></div>
      </section>

      <div className="detail-grid">
        <article className="detail-content">
          <section><div className="content-heading"><span>01</span><h2>中文摘要</h2></div><p className="abstract-text">{paper.abstractZh}</p></section>
          <section className="key-insight"><div className="content-heading"><span>02</span><h2>50字创新点</h2></div><blockquote>{paper.insight}</blockquote><small>{paper.insight.length} / 50 字</small></section>
          <section><div className="content-heading"><span>03</span><h2>关键图表</h2></div><div className="large-figure">{paper.figureImageUrl ? <img className="uploaded-key-figure" src={paper.figureImageUrl} alt={paper.figureCaption || `关键图：${paper.title}`} /> : <FigurePreview type={paper.figureType} />}</div><p className="figure-caption"><b>主图 · </b>{paper.figureCaption}</p></section>
          <Comments paperSlug={paper.slug} />
        </article>
        <aside className="detail-sidebar">
          <section><span className="section-kicker">QUICK RECALL</span><h3>回顾卡</h3><dl><div><dt>研究方向</dt><dd>{classifications.map((item) => `${item.category} · ${item.subcategory}`).join("；")}</dd></div><div><dt>核心方法</dt><dd>{paper.keywords.slice(0, 3).join(" · ") || "待补充"}</dd></div><div><dt>作者信息</dt><dd>{defaultAuthors.map((author) => `${authorRoleLabels[author.role]}：${author.name}`).join("；") || "待补充"}</dd></div></dl></section>
          <section><span className="section-kicker">KEYWORDS</span>{paper.verificationStatus || paper.sample ? <><div className="keyword-cloud">{paper.keywords.slice(0, 6).map((keyword) => <Link href={`/browse?tag=${encodeURIComponent(keyword)}`} key={keyword}>{keyword}</Link>)}</div><small className="tag-status">当前仅显示最核心的 6 个标签；如需调整可在评论中注明。</small></> : <KeywordEditor paperSlug={paper.slug} initialKeywords={paper.keywords.slice(0, 6)} />}</section>
          <section className="source-box"><span className="section-kicker">SOURCE</span><p>{paper.doi ? `DOI：${paper.doi}` : paper.pdfUrl || paper.sourceUrl ? "可从下方打开投稿者提供的论文来源。" : "暂未提供论文来源。"}</p>{paper.pdfUrl ? <a href={paper.pdfUrl} target="_blank" rel="noreferrer">打开上传 PDF →</a> : paper.sourceUrl ? <a href={paper.sourceUrl} target="_blank" rel="noreferrer">打开论文来源 →</a> : <button disabled>暂无原文</button>}</section>
        </aside>
      </div>
    </div>
  </main>;
}
