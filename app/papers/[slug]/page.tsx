import Link from "next/link";
import { notFound } from "next/navigation";
import { Comments } from "../../components/Comments";
import { FigurePreview } from "../../components/FigurePreview";
import { SiteHeader } from "../../components/SiteHeader";
import { findPaper, papers } from "../../data";

export function generateStaticParams() {
  return papers.map((paper) => ({ slug: paper.slug }));
}

export default async function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = findPaper(slug);
  if (!paper) notFound();

  return (
    <main>
      <SiteHeader />
      <div className="paper-detail-shell">
        <div className="breadcrumb"><Link href="/">文献库</Link><span>/</span><Link href={`/?category=${encodeURIComponent(paper.category)}`}>{paper.category}</Link><span>/</span><b>{paper.subcategory}</b></div>
        <section className="paper-detail-hero" style={{ "--paper-accent": paper.accent } as React.CSSProperties}>
          <div className="detail-copy">
            <div className="detail-badges"><span>{paper.category}</span><span>{paper.subcategory}</span>{paper.sample && <em>示例条目</em>}</div>
            <h1>{paper.title}</h1><p className="detail-title-zh">{paper.titleZh}</p>
            <div className="citation-line"><strong>{paper.journal}</strong><span>{paper.published}</span></div>
            <div className="author-line"><b>{paper.authors.join(" · ")}</b><span>{paper.institutions.join("；")}</span></div>
            <div className="detail-actions"><button>保存到回顾清单</button><button className="ghost">复制引用</button></div>
          </div>
          <div className="detail-figure"><FigurePreview type={paper.figureType} /><span>{paper.figureCaption}</span></div>
        </section>

        <div className="detail-grid">
          <article className="detail-content">
            <section><div className="content-heading"><span>01</span><h2>中文摘要</h2></div><p className="abstract-text">{paper.abstractZh}</p></section>
            <section className="key-insight"><div className="content-heading"><span>02</span><h2>50字创新点</h2></div><blockquote>{paper.insight}</blockquote><small>{paper.insight.length} / 50 字</small></section>
            <section><div className="content-heading"><span>03</span><h2>关键图表</h2></div><div className="large-figure"><FigurePreview type={paper.figureType} /></div><p className="figure-caption"><b>图 1 · </b>{paper.figureCaption} 正式条目将替换为论文原图，并补充图号、图注与版权信息。</p></section>
            <Comments paperSlug={paper.slug} />
          </article>
          <aside className="detail-sidebar">
            <section><span className="section-kicker">QUICK RECALL</span><h3>回顾卡</h3><dl><div><dt>研究问题</dt><dd>该工作试图解决什么瓶颈？</dd></div><div><dt>核心方法</dt><dd>{paper.subcategory} · {paper.keywords[0]}</dd></div><div><dt>验证方式</dt><dd>实验结果与模型分析分层记录</dd></div></dl></section>
            <section><span className="section-kicker">KEYWORDS</span><div className="keyword-cloud">{paper.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></section>
            <section className="source-box"><span className="section-kicker">SOURCE</span><p>PDF、DOI 与补充材料将在上传真实论文后显示。</p><button>打开论文原文 ↗</button></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
