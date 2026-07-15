"use client";

import { FormEvent, useEffect, useState } from "react";

type PendingPaper = {
  id: number;
  slug: string;
  title: string;
  category: string;
  subcategory: string;
  journal: string;
  published: string;
  authors: string[];
  keywords: string[];
  abstractZh: string;
  insight: string;
  submitterName: string;
  submitterEmail: string;
  createdAt: string;
  figureKeys: string[];
};

export default function AdminReview() {
  const [key, setKey] = useState("");
  const [papers, setPapers] = useState<PendingPaper[]>([]);
  const [status, setStatus] = useState("请输入管理员审批码。");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("literature-admin-key");
    if (saved) { setKey(saved); void load(saved); }
  }, []);

  async function load(reviewKey = key) {
    setStatus("正在读取待审核投稿…");
    const response = await fetch("/api/admin/papers?status=pending", { headers: { "x-admin-key": reviewKey } });
    if (!response.ok) { setAuthorized(false); setStatus("审批码无效，请重试。"); return; }
    const data = await response.json();
    sessionStorage.setItem("literature-admin-key", reviewKey);
    setAuthorized(true);
    setPapers(data.papers ?? []);
    setStatus(data.papers?.length ? `共有 ${data.papers.length} 篇待审核` : "当前没有待审核投稿。 ");
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    await load();
  }

  async function review(id: number, action: "approve" | "reject") {
    const response = await fetch("/api/admin/papers", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ id, action }) });
    if (response.ok) {
      setPapers((current) => current.filter((paper) => paper.id !== id));
      setStatus(action === "approve" ? "已批准，论文现在会显示在公开文献库。" : "已退回该投稿。");
    } else {
      setStatus("操作失败，请刷新后重试。");
    }
  }

  if (!authorized) {
    return <div className="admin-login"><span className="section-kicker">EDITOR ACCESS</span><h1>管理员审核台</h1><p>公开访客无需登录；只有审核投稿时需要管理员审批码。</p><form onSubmit={login}><input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="输入审批码" autoComplete="current-password" /><button type="submit">进入审核台 →</button></form><small>{status}</small></div>;
  }

  return (
    <div className="admin-shell">
      <div className="admin-heading"><div><span className="section-kicker">EDITOR QUEUE</span><h1>待审核投稿</h1><p>{status}</p></div><button onClick={() => load()}>刷新列表</button></div>
      <div className="review-list">{papers.map((paper) => <article className="review-card" key={paper.id}><div className="review-meta"><span>{paper.category}</span><i />{paper.subcategory}<i />{paper.journal} · {paper.published}</div><h2>{paper.title}</h2><p className="review-authors">{paper.authors.join(" · ") || "作者待补充"}</p><div className="review-summary"><b>中文摘要</b><p>{paper.abstractZh || "未填写"}</p></div><div className="review-insight"><b>50字创新点</b><span>{paper.insight || "未填写"}</span></div><div className="review-tags">{paper.keywords.map((tag) => <span key={tag}>#{tag}</span>)}</div><div className="review-foot"><div><b>投稿人：{paper.submitterName}</b><small>{paper.submitterEmail || "未留邮箱"} · {paper.figureKeys.length} 张关键图</small></div><div><button className="reject" onClick={() => review(paper.id, "reject")}>退回</button><button className="approve" onClick={() => review(paper.id, "approve")}>批准公开</button></div></div></article>)}</div>
      {!papers.length && <div className="empty-state"><strong>审核队列已清空</strong><span>新的公开投稿会自动出现在这里。</span></div>}
    </div>
  );
}
