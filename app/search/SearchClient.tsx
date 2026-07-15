"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Result = { slug: string; title: string; titleZh?: string; journal?: string; published?: string; score: number; matchReason: string };

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/papers/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = response.ok ? await response.json() : { papers: [] };
        setResults(data.papers ?? []);
      } catch { if (!controller.signal.aborted) setResults([]); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  return <div className="search-shell">
    <span className="section-kicker">TITLE SIMILARITY SEARCH</span>
    <h1>输入记得的几个词，<br />找回最接近的论文。</h1>
    <p>搜索会比较英文标题、中文标题和词序相似度；结果直接链接到本站论文详情页。</p>
    <label className="title-search-box"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：microring crossbar training" /><small>{loading ? "检索中…" : query.length >= 2 ? `${results.length} 个相近结果` : "至少输入 2 个字符"}</small></label>
    <div className="search-results">{results.map((paper, index) => <Link href={`/papers/${paper.slug}`} key={paper.slug}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{paper.matchReason} · 相似度 {Math.round(paper.score * 100)}%</small><h2>{paper.title}</h2>{paper.titleZh && <p>{paper.titleZh}</p>}<b>{paper.journal || "期刊待补充"} · {paper.published || "年月待补充"}</b></div><i>→</i></Link>)}</div>
    {query.length >= 2 && !loading && !results.length && <div className="empty-state"><strong>没有找到接近的标题</strong><span>尝试只输入标题中的核心名词。</span></div>}
  </div>;
}
