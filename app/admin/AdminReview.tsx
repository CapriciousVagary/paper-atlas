"use client";

import { FormEvent, useEffect, useState } from "react";
import { authorRoleLabels, getClassifications, type AuthorDetail, type AuthorRole, type Paper } from "../data";

type AdminPaper = Paper & {
  id?: number;
  recordType: "curated" | "stored";
  submitterName: string;
  submitterEmail: string;
  figureKeys: string[];
};

function authorLines(paper: AdminPaper) {
  return (paper.authorDetails ?? []).map((author) => [author.role, author.name, author.institution ?? "", (author.aliases ?? []).join(","), author.note ?? ""].join(" | ")).join("\n");
}

function classificationLines(paper: AdminPaper) {
  return getClassifications(paper).map((item) => `${item.category} | ${item.subcategory}`).join("\n");
}

function parseAuthors(value: string): AuthorDetail[] {
  return value.split(/\r?\n/).map((line) => {
    const [rawRole, name = "", institution = "", aliases = "", note = ""] = line.split("|").map((item) => item.trim());
    const role = Object.hasOwn(authorRoleLabels, rawRole) ? rawRole as AuthorRole : "other";
    return { role, name, institution: institution || undefined, aliases: aliases.split(/[,，]/).map((item) => item.trim()).filter(Boolean), note: note || undefined };
  }).filter((author) => author.name);
}

export default function AdminReview() {
  const [key, setKey] = useState("");
  const [papers, setPapers] = useState<AdminPaper[]>([]);
  const [status, setStatus] = useState("请输入管理员审批码。");
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [editing, setEditing] = useState<AdminPaper | null>(null);
  const [authorsText, setAuthorsText] = useState("");
  const [classificationsText, setClassificationsText] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("literature-admin-key");
    if (saved) { const restore = window.setTimeout(() => { setKey(saved); void load(saved, "pending"); }, 0); return () => window.clearTimeout(restore); }
  }, []);

  async function load(reviewKey = key, nextTab = tab) {
    setStatus(nextTab === "pending" ? "正在读取待审核投稿…" : "正在读取已收录论文…");
    const response = await fetch(`/api/admin/papers?status=${nextTab}`, { headers: { "x-admin-key": reviewKey } });
    if (!response.ok) { setAuthorized(false); setStatus("审批码无效，请重试。"); return; }
    const data = await response.json();
    sessionStorage.setItem("literature-admin-key", reviewKey);
    setAuthorized(true); setTab(nextTab); setPapers(data.papers ?? []); setEditing(null);
    setStatus(data.papers?.length ? `共有 ${data.papers.length} 篇${nextTab === "pending" ? "待审核投稿" : "已收录论文"}` : nextTab === "pending" ? "当前没有待审核投稿。" : "当前没有已收录论文。");
  }

  async function login(event: FormEvent) { event.preventDefault(); await load(); }

  async function review(id: number | undefined, action: "approve" | "reject") {
    if (!id) return;
    const response = await fetch("/api/admin/papers", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ id, action }) });
    if (response.ok) { setPapers((current) => current.filter((paper) => paper.id !== id)); setStatus(action === "approve" ? "已批准；论文和新单位现已进入公开文献库。" : "已退回该投稿。"); }
    else setStatus("操作失败，请刷新后重试。");
  }

  function beginEdit(paper: AdminPaper) { setEditing(structuredClone(paper)); setAuthorsText(authorLines(paper)); setClassificationsText(classificationLines(paper)); }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const classifications = classificationsText.split(/\r?\n/).map((line) => { const [category = "", subcategory = ""] = line.split("|").map((item) => item.trim()); return { category, subcategory }; }).filter((item) => item.category && item.subcategory);
    const primary = classifications[0] ?? { category: editing.category, subcategory: editing.subcategory };
    const paper = { ...editing, category: primary.category, subcategory: primary.subcategory, classifications, authorDetails: parseAuthors(authorsText), keywords: editing.keywords.map((item) => item.trim()).filter(Boolean).slice(0, 6) };
    setStatus("正在保存修订…");
    const response = await fetch("/api/admin/papers", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ slug: editing.slug, recordType: editing.recordType, paper }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(data.error ?? "保存失败，请重试。"); return; }
    setStatus("已保存修订，公开页面会使用最新信息。"); setEditing(null); await load(key, "approved");
  }

  if (!authorized) return <div className="admin-login"><span className="section-kicker">EDITOR ACCESS</span><h1>管理员审核台</h1><p>公开访客无需登录；只有审核投稿或修订条目时需要管理员审批码。</p><form onSubmit={login}><input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="输入审批码" autoComplete="current-password" /><button type="submit">进入审核台 →</button></form><small>{status}</small></div>;

  return <div className="admin-shell">
    <div className="admin-heading"><div><span className="section-kicker">EDITOR WORKSPACE</span><h1>{tab === "pending" ? "待审核投稿" : "已收录论文"}</h1><p>{status}</p></div><button onClick={() => load()}>刷新列表</button></div>
    <div className="admin-tabs"><button className={tab === "pending" ? "active" : ""} onClick={() => load(key, "pending")}>待审核投稿</button><button className={tab === "approved" ? "active" : ""} onClick={() => load(key, "approved")}>编辑已收录论文</button></div>
    {editing && <form className="paper-edit-form" onSubmit={saveEdit}><div className="paper-edit-heading"><div><span className="section-kicker">EDIT RECORD</span><h2>修订已收录论文</h2></div><button type="button" onClick={() => setEditing(null)}>关闭</button></div>
      <label>英文标题<input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required /></label>
      <label>中文标题<input value={editing.titleZh ?? ""} onChange={(event) => setEditing({ ...editing, titleZh: event.target.value })} /></label>
      <div className="edit-grid"><label>期刊<input value={editing.journal} onChange={(event) => setEditing({ ...editing, journal: event.target.value })} /></label><label>发表年月<input value={editing.published} onChange={(event) => setEditing({ ...editing, published: event.target.value })} /></label></div>
      <div className="edit-grid"><label>DOI<input value={editing.doi ?? ""} onChange={(event) => setEditing({ ...editing, doi: event.target.value })} /></label><label>来源链接<input value={editing.sourceUrl ?? ""} onChange={(event) => setEditing({ ...editing, sourceUrl: event.target.value })} /></label></div>
      <label>分类（每行“大类 | 小类”，第一行为主分类）<textarea rows={4} value={classificationsText} onChange={(event) => setClassificationsText(event.target.value)} required /></label>
      <label>作者（每行“角色代码 | 姓名 | 单位英文全称 | 中文名/英文名别名 | 说明”）<textarea rows={6} value={authorsText} onChange={(event) => setAuthorsText(event.target.value)} /><small>角色代码：first、first_corresponding、cofirst、corresponding、notable、other</small></label>
      <label>标签（最多 6 个，以逗号分隔）<input value={editing.keywords.join(", ")} onChange={(event) => setEditing({ ...editing, keywords: event.target.value.split(/[,，]/) })} /></label>
      <label>中文摘要<textarea rows={7} value={editing.abstractZh} onChange={(event) => setEditing({ ...editing, abstractZh: event.target.value })} /></label>
      <label>一句话要点（50 字以内）<textarea rows={2} maxLength={50} value={editing.insight} onChange={(event) => setEditing({ ...editing, insight: event.target.value })} /></label>
      <label>关键图说明<textarea rows={2} value={editing.figureCaption} onChange={(event) => setEditing({ ...editing, figureCaption: event.target.value })} /></label>
      <button className="save-edit" type="submit">保存修订 →</button>
    </form>}
    <div className="review-list">{papers.map((paper) => <article className="review-card" key={`${paper.recordType}-${paper.slug}`}>
      <div className="review-meta"><span>{paper.category}</span><i />{paper.subcategory}<i />{paper.journal} · {paper.published}</div><h2>{paper.title}</h2>
      <div className="review-author-details">{paper.authorDetails?.length ? paper.authorDetails.filter((author) => author.role !== "other").map((author) => <span key={`${author.role}-${author.name}`}><b>{authorRoleLabels[author.role]}</b>{author.name}{author.institution && <small>{author.institution}</small>}</span>) : <p className="review-authors">作者待补充</p>}</div>
      <div className="review-summary"><b>中文摘要</b><p>{paper.abstractZh || "未填写"}</p></div><div className="review-insight"><b>一句话要点</b><span>{paper.insight || "未填写"}</span></div><div className="review-tags">{paper.keywords.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="review-foot"><div><b>{paper.recordType === "curated" ? "批量导入条目" : `投稿人：${paper.submitterName}`}</b><small>{paper.submitterEmail || "未留邮箱"} · {paper.figureKeys.length} 张关键图</small></div><div>{tab === "pending" ? <><button className="reject" onClick={() => review(paper.id, "reject")}>退回</button><button className="approve" onClick={() => review(paper.id, "approve")}>批准公开</button></> : <button className="approve" onClick={() => beginEdit(paper)}>编辑信息</button>}</div></div>
    </article>)}</div>
    {!papers.length && <div className="empty-state"><strong>{tab === "pending" ? "审核队列已清空" : "暂无已收录条目"}</strong><span>{tab === "pending" ? "新的公开投稿会自动出现在这里。" : "批准投稿或导入论文后会出现在这里。"}</span></div>}
  </div>;
}
