import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { papers as storedPapers } from "../../../db/schema";
import { Comments } from "../../components/Comments";
import { FigurePreview } from "../../components/FigurePreview";
import { KeywordEditor } from "../../components/KeywordEditor";
import { SiteHeader } from "../../components/SiteHeader";
import { findPaper, papers, type Paper } from "../../data";

export function generateStaticParams() {
  return papers.map((paper) => ({ slug: paper.slug }));
}

async function loadPaper(slug: string): Promise<Paper | undefined> {
  const sample = findPaper(slug);
  if (sample) return sample;

  try {
    const [stored] = await getDb().select().from(storedPapers).where(eq(storedPapers.slug, slug)).limit(1);
    if (!stored || stored.status !== "approved") return undefined;
    const figureType: Paper["figureType"] = stored.category === "光计算" ? "ring" : stored.category.includes("铌酸锂") ? "modulator" : "laser";
    return {
      slug: stored.slug,
      title: stored.title,
      titleZh: "中文标题待补充",
      category: stored.category,
      subcategory: stored.subcategory,
      journal: stored.journal,
      published: stored.published,
      authors: JSON.parse(stored.authors || "[]"),
      institutions: JSON.parse(stored.institutions || "[]"),
      abstractZh: stored.abstractZh || "中文摘要正在整理中。",
      insight: stored.insight || "创新点待组内成员确认。",
      keywords: JSON.parse(stored.tags || "[]"),
      figureCaption: stored.figureCaption || "关键图表待上传者补充图注。",
      figureType,
      accent: figureType === "ring" ? "#7458e8" : figureType === "modulator" ? "#14aeb6" : "#dc9130",
      figureImageUrl: stored.keyFigureKey ? `/api/papers/${encodeURIComponent(stored.slug)}/figure` : undefined,
      pdfUrl: stored.fileKey ? `/api/papers/${encodeURIComponent(stored.slug)}/pdf` : undefined,
      sourceUrl: stored.sourceUrl || undefined,
    };
  } catch {
    return undefined;
  }
}

export default async function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = await loadPaper(slug);
  if (!paper) notFound();

  return (
    <main>
      <SiteHeader />
      <div className="paper-detail-shell">
        <div className="breadcrumb"><Link href="/">文献库</Link><span>/</span><Link href={`/?category=${encodeURIComponent(paper.category)}`}>{paper.category}</Link><span>/</span><b>{paper.subcategory}</b></div>
        <section className="paper-detail-hero" style={{ "--paper-accent": paper.accent } as React.CSSProperties}>
          <div className="detail-copy">
            <div className="detail-badges"><span>{paper.category}</span><span>{paper.subcategory}</span>{paper.verificationStatus && <em>{paper.verificationStatus === "verified" ? "题名 / DOI 已核验" : "论文 PDF 人工核验"}</em>}</div>
            <h1>{paper.title}</h1><p className="detail-title-zh">{paper.titleZh}</p>
            <div className="citation-line"><strong>{paper.journal}</strong><span>{paper.published}</span></div>
            <div className="author-line"><b>{paper.authors.join(" · ")}</b><span>{paper.institutions.join("；")}</span></div>
            <div className="detail-actions"><button>保存到回顾清单</button><button className="ghost">复制引用</button></div>
          </div>
          <div className="detail-figure">{paper.figureImageUrl ? <img className="uploaded-key-figure" src={paper.figureImageUrl} alt={paper.figureCaption || `关键图：${paper.title}`} /> : <FigurePreview type={paper.figureType} />}<span>{paper.figureCaption}</span></div>
        </section>

        <div className="detail-grid">
          <article className="detail-content">
            <section><div className="content-heading"><span>01</span><h2>中文摘要</h2></div><p className="abstract-text">{paper.abstractZh}</p></section>
            <section className="key-insight"><div className="content-heading"><span>02</span><h2>50字创新点</h2></div><blockquote>{paper.insight}</blockquote><small>{paper.insight.length} / 50 字</small></section>
            <section><div className="content-heading"><span>03</span><h2>关键图表</h2></div><div className="large-figure">{paper.figureImageUrl ? <img className="uploaded-key-figure" src={paper.figureImageUrl} alt={paper.figureCaption || `关键图：${paper.title}`} /> : <FigurePreview type={paper.figureType} />}</div><p className="figure-caption"><b>主图 · </b>{paper.figureCaption}{paper.sample && " 示例条目将在导入真实论文后替换为上传者指定的原图。"}</p></section>
            <Comments paperSlug={paper.slug} />
          </article>
          <aside className="detail-sidebar">
            <section><span className="section-kicker">QUICK RECALL</span><h3>回顾卡</h3><dl><div><dt>研究问题</dt><dd>该工作试图解决什么瓶颈？</dd></div><div><dt>核心方法</dt><dd>{paper.subcategory} · {paper.keywords[0]}</dd></div><div><dt>验证方式</dt><dd>实验结果与模型分析分层记录</dd></div></dl></section>
            <section><span className="section-kicker">KEYWORDS</span>{paper.verificationStatus || paper.sample ? <><div className="keyword-cloud">{paper.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><small className="tag-status">如需调整这些初始标签，可在评论中注明或联系维护者批量修改。</small></> : <KeywordEditor paperSlug={paper.slug} initialKeywords={paper.keywords} />}</section>
            <section className="source-box"><span className="section-kicker">SOURCE</span><p>{paper.doi ? `DOI：${paper.doi}` : paper.pdfUrl || paper.sourceUrl ? "可从下方打开投稿者提供的论文来源。" : "暂未提供论文来源。"}</p>{paper.pdfUrl ? <a href={paper.pdfUrl} target="_blank" rel="noreferrer">打开上传 PDF ↗</a> : paper.sourceUrl ? <a href={paper.sourceUrl} target="_blank" rel="noreferrer">打开论文来源 ↗</a> : <button disabled>暂无原文</button>}</section>
          </aside>
        </div>
      </div>
    </main>
  );
}
