import Link from "next/link";
import { SiteHeader } from "../components/SiteHeader";
import { categories, papers } from "../data";

export default function IndexPage() {
  const authors = [...new Set(papers.flatMap((paper) => paper.authors))];
  const keywords = [...new Set(papers.flatMap((paper) => paper.keywords))];
  return (
    <main><SiteHeader active="index" /><div className="index-shell"><span className="section-kicker">KNOWLEDGE INDEX</span><h1>从不同路径，重新找到一篇论文。</h1><p className="index-lead">索引会随着文献库扩展自动更新。当前支持按研究方向、作者和内容关键词浏览。</p><div className="index-grid"><section><div className="index-heading"><span>01</span><h2>按研究方向</h2></div>{categories.map((category) => <article className="index-category" key={category.name}><b>{category.name}</b><span>{category.code}</span><p>{category.subcategories.join(" · ")}</p></article>)}</section><section><div className="index-heading"><span>02</span><h2>按作者</h2></div><div className="author-index">{authors.map((author, index) => <Link href={`/?q=${encodeURIComponent(author)}`} key={author}><span>{String(index + 1).padStart(2, "0")}</span><b>{author}</b><small>{papers.filter((paper) => paper.authors.includes(author)).length} 篇</small></Link>)}</div></section><section><div className="index-heading"><span>03</span><h2>按内容</h2></div><div className="keyword-index">{keywords.map((keyword) => <Link href={`/?q=${encodeURIComponent(keyword)}`} key={keyword}>{keyword}<small>{papers.filter((paper) => paper.keywords.includes(keyword)).length}</small></Link>)}</div></section></div></div></main>
  );
}
