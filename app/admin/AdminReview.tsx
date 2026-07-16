"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { authorRoleLabels, getClassifications, type AuthorDetail, type AuthorRole, type Paper } from "../data";

type AdminPaper = Paper & {
  id?: number;
  recordType: "curated" | "stored";
  submitterName: string;
  submitterEmail: string;
  figureKeys: string[];
};
type AdminComment = { id: number; author: string; content: string; createdAt: string };
type MediaDraft = { file: File; url: string };

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
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminPaper | null>(null);
  const [authorsText, setAuthorsText] = useState("");
  const [classificationsText, setClassificationsText] = useState("");
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [commentStatus, setCommentStatus] = useState("");
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const mediaRef = useRef<MediaDraft[]>([]);
  const [keyMediaIndex, setKeyMediaIndex] = useState(0);
  const [clearExistingImage, setClearExistingImage] = useState(false);
  const [draggingMedia, setDraggingMedia] = useState(false);

  const addMediaFiles = useCallback((incoming: File[]) => {
    setMedia((current) => {
      const allowed = incoming.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
      current.forEach((item) => URL.revokeObjectURL(item.url));
      const files = [...current.map((item) => item.file), ...allowed].slice(0, 8);
      return files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    });
    setClearExistingImage(false);
  }, []);

  useEffect(() => { mediaRef.current = media; }, [media]);
  useEffect(() => () => mediaRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  useEffect(() => {
    const saved = sessionStorage.getItem("literature-admin-key");
    if (saved) { const restore = window.setTimeout(() => { setKey(saved); void load(saved, "pending"); }, 0); return () => window.clearTimeout(restore); }
    // `load` intentionally uses the latest state after the one-time session restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing) return;
    function pasteImages(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.items ?? []).filter((item) => item.kind === "file" && item.type.startsWith("image/")).map((item, index) => {
        const source = item.getAsFile(); if (!source) return null;
        const extension = source.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        return new File([source], `editor-paste-${Date.now()}-${index + 1}.${extension}`, { type: source.type });
      }).filter((file): file is File => Boolean(file));
      if (files.length) { event.preventDefault(); addMediaFiles(files); setStatus(`已从剪贴板加入 ${files.length} 张替换图片。`); }
    }
    window.addEventListener("paste", pasteImages);
    return () => window.removeEventListener("paste", pasteImages);
  }, [editing, addMediaFiles]);

  async function load(reviewKey = key, nextTab = tab) {
    setStatus(nextTab === "pending" ? "正在读取待审核投稿…" : "正在读取已收录论文…");
    const response = await fetch(`/api/admin/papers?status=${nextTab}`, { headers: { "x-admin-key": reviewKey } });
    if (!response.ok) { setAuthorized(false); setStatus("审批码无效，请重试。"); return; }
    const data = await response.json();
    sessionStorage.setItem("literature-admin-key", reviewKey);
    setAuthorized(true); setTab(nextTab); setPapers(data.papers ?? []); closeEditor();
    setStatus(data.papers?.length ? `共有 ${data.papers.length} 篇${nextTab === "pending" ? "待审核投稿" : "已收录论文"}` : nextTab === "pending" ? "当前没有待审核投稿。" : "当前没有已收录论文。");
  }

  function closeEditor() {
    media.forEach((item) => URL.revokeObjectURL(item.url));
    setEditing(null); setMedia([]); setComments([]); setCommentStatus(""); setClearExistingImage(false); setKeyMediaIndex(0);
  }

  async function login(event: FormEvent) { event.preventDefault(); await load(); }

  async function review(id: number | undefined, action: "approve" | "reject") {
    if (!id) return;
    const response = await fetch("/api/admin/papers", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ id, action }) });
    if (response.ok) { setPapers((current) => current.filter((paper) => paper.id !== id)); setStatus(action === "approve" ? "已批准；论文和新单位现已进入公开文献库。" : "已退回该投稿。"); }
    else setStatus("操作失败，请刷新后重试。");
  }

  async function beginEdit(paper: AdminPaper) {
    setEditing(structuredClone(paper)); setAuthorsText(authorLines(paper)); setClassificationsText(classificationLines(paper)); setMedia([]); setClearExistingImage(false); setKeyMediaIndex(0); setCommentStatus("正在读取评论…");
    const response = await fetch(`/api/comments?paperSlug=${encodeURIComponent(paper.slug)}`);
    const data = response.ok ? await response.json() : { comments: [] };
    setComments(data.comments ?? []); setCommentStatus(data.comments?.length ? `共 ${data.comments.length} 条评论或注释` : "暂无评论或注释");
    window.setTimeout(() => document.querySelector(".paper-edit-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const classifications = classificationsText.split(/\r?\n/).map((line) => { const [category = "", subcategory = ""] = line.split("|").map((item) => item.trim()); return { category, subcategory }; }).filter((item) => item.category && item.subcategory);
    const primary = classifications[0] ?? { category: editing.category, subcategory: editing.subcategory };
    const paper = { ...editing, category: primary.category, subcategory: primary.subcategory, classifications, authorDetails: parseAuthors(authorsText), keywords: editing.keywords.map((item) => item.trim()).filter(Boolean).slice(0, 6) };
    setStatus("正在保存论文信息…");
    const response = await fetch("/api/admin/papers", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify({ slug: editing.slug, recordType: editing.recordType, paper }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(data.error ?? "保存失败，请重试。"); return; }
    if (media.length || clearExistingImage) {
      setStatus("论文信息已保存，正在更新关键图…");
      const form = new FormData(); form.set("slug", editing.slug); form.set("recordType", editing.recordType); form.set("clear", clearExistingImage ? "1" : "0"); form.set("keyFigureIndex", String(keyMediaIndex)); form.set("figureCaption", editing.figureCaption); media.forEach((item) => form.append("figures", item.file));
      const mediaResponse = await fetch("/api/admin/papers/media", { method: "POST", headers: { "x-admin-key": key }, body: form });
      const mediaData = await mediaResponse.json().catch(() => ({}));
      if (!mediaResponse.ok) { setStatus(`论文文字已保存，但图片更新失败：${mediaData.error ?? "请重试"}`); return; }
    }
    setStatus("已保存修订，公开页面会使用最新信息。"); await load(key, tab);
  }

  async function saveComment(comment: AdminComment) {
    setCommentStatus("正在保存评论…");
    const response = await fetch("/api/comments", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: JSON.stringify(comment) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setCommentStatus(data.error ?? "评论保存失败"); return; }
    setComments((current) => current.map((item) => item.id === comment.id ? data.comment : item)); setCommentStatus("评论已更新");
  }

  async function deleteComment(comment: AdminComment) {
    if (!window.confirm(`确认删除 ${comment.author} 的这条评论？`)) return;
    const response = await fetch(`/api/comments?id=${comment.id}`, { method: "DELETE", headers: { "x-admin-key": key } });
    if (response.ok) { setComments((current) => current.filter((item) => item.id !== comment.id)); setCommentStatus("评论已删除"); }
    else setCommentStatus("评论删除失败");
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visiblePapers = papers.filter((paper) => !normalizedQuery || [paper.title, paper.titleZh, paper.doi, paper.journal, paper.category, paper.subcategory, ...(paper.authors ?? []), ...(paper.keywords ?? [])].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery));

  if (!authorized) return <div className="admin-login"><span className="section-kicker">EDITOR ACCESS</span><h1>管理员审核台</h1><p>公开访客无需登录；只有审核投稿或修订条目时需要管理员审批码。</p><form onSubmit={login}><input type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="输入审批码" autoComplete="current-password" /><button type="submit">进入审核台 →</button></form><small>{status}</small></div>;

  return <div className="admin-shell">
    <div className="admin-heading"><div><span className="section-kicker">EDITOR WORKSPACE</span><h1>{tab === "pending" ? "待审核投稿" : "已收录论文"}</h1><p>{status}</p></div><button onClick={() => load()}>刷新列表</button></div>
    <div className="admin-tabs"><button className={tab === "pending" ? "active" : ""} onClick={() => load(key, "pending")}>待审核投稿</button><button className={tab === "approved" ? "active" : ""} onClick={() => load(key, "approved")}>编辑已收录论文</button></div>
    <div className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、DOI、期刊、作者、分类或标签" /><b>{visiblePapers.length} / {papers.length}</b></div>

    {editing && <form className="paper-edit-form" onSubmit={saveEdit}><div className="paper-edit-heading"><div><span className="section-kicker">EDIT RECORD · {editing.recordType === "curated" ? "批量导入" : "公开投稿"}</span><h2>修订论文与讨论</h2><p>{editing.slug}</p></div><button type="button" onClick={closeEditor}>关闭</button></div>
      <div className="editor-summary"><div><span>当前分类</span><b>{getClassifications(editing).map((item) => `${item.category} / ${item.subcategory}`).join("；")}</b></div><div><span>图片</span><b>{editing.figureKeys.length ? `${editing.figureKeys.length} 张` : "默认示意图"}</b></div><div><span>讨论</span><b>{comments.length} 条</b></div></div>
      <label>英文标题<input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required /></label>
      <label>中文标题<input value={editing.titleZh ?? ""} onChange={(event) => setEditing({ ...editing, titleZh: event.target.value })} /></label>
      <div className="edit-grid"><label>期刊<input value={editing.journal} onChange={(event) => setEditing({ ...editing, journal: event.target.value })} /></label><label>发表年月<input value={editing.published} onChange={(event) => setEditing({ ...editing, published: event.target.value })} /></label></div>
      <div className="edit-grid"><label>DOI<input value={editing.doi ?? ""} onChange={(event) => setEditing({ ...editing, doi: event.target.value })} /></label><label>来源链接<input value={editing.sourceUrl ?? ""} onChange={(event) => setEditing({ ...editing, sourceUrl: event.target.value })} /></label></div>
      <label>分类（每行“大类 | 小类”，第一行为主分类）<textarea rows={4} value={classificationsText} onChange={(event) => setClassificationsText(event.target.value)} required /></label>
      <label>作者（每行“角色代码 | 姓名 | 单位英文全称 | 中文名/英文名别名 | 说明”）<textarea rows={6} value={authorsText} onChange={(event) => setAuthorsText(event.target.value)} /><small>角色：first、first_corresponding、cofirst、corresponding、notable、other</small></label>
      <label>标签（最多 6 个，以逗号分隔）<input value={editing.keywords.join(", ")} onChange={(event) => setEditing({ ...editing, keywords: event.target.value.split(/[,，]/) })} /></label>
      <label>中文摘要<textarea rows={7} value={editing.abstractZh} onChange={(event) => setEditing({ ...editing, abstractZh: event.target.value })} /></label>
      <label>一句话要点（50 字以内）<textarea rows={2} maxLength={50} value={editing.insight} onChange={(event) => setEditing({ ...editing, insight: event.target.value })} /></label>

      <section className="editor-media"><div className="editor-section-heading"><div><span>KEY FIGURES</span><h3>关键图管理</h3></div><small>新上传会替换已有图片；可拖拽或 Ctrl+V 粘贴</small></div>{editing.figureImageUrl && !clearExistingImage && !media.length && <img className="editor-current-image" src={editing.figureImageUrl} alt="当前关键图" />}
        <label className={`editor-media-drop ${draggingMedia ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDraggingMedia(true); }} onDragOver={(event) => { event.preventDefault(); setDraggingMedia(true); }} onDragLeave={() => setDraggingMedia(false)} onDrop={(event) => { event.preventDefault(); setDraggingMedia(false); addMediaFiles(Array.from(event.dataTransfer.files)); }}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addMediaFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} /><b>点击、拖拽或 Ctrl+V 添加替换图片</b><small>最多 8 张，单张不超过 8 MB</small></label>
        {!!media.length && <div className="editor-media-grid">{media.map((item, index) => <label className={keyMediaIndex === index ? "selected" : ""} key={`${item.file.name}-${index}`}><input type="radio" checked={keyMediaIndex === index} onChange={() => setKeyMediaIndex(index)} /><img src={item.url} alt={`替换图 ${index + 1}`} /><span>{item.file.name}</span></label>)}</div>}
        <label className="clear-image"><input type="checkbox" checked={clearExistingImage} onChange={(event) => { setClearExistingImage(event.target.checked); if (event.target.checked) { media.forEach((item) => URL.revokeObjectURL(item.url)); setMedia([]); } }} />清除已有图片，恢复默认示意图</label>
        <label>关键图说明<textarea rows={2} value={editing.figureCaption} onChange={(event) => setEditing({ ...editing, figureCaption: event.target.value })} /></label>
      </section>

      <section className="editor-comments"><div className="editor-section-heading"><div><span>DISCUSSION</span><h3>评论与注释管理</h3></div><small>{commentStatus}</small></div>{comments.map((comment) => <article key={comment.id}><div><input value={comment.author} onChange={(event) => setComments((current) => current.map((item) => item.id === comment.id ? { ...item, author: event.target.value } : item))} /><time>{comment.createdAt}</time></div><textarea rows={3} value={comment.content} onChange={(event) => setComments((current) => current.map((item) => item.id === comment.id ? { ...item, content: event.target.value } : item))} /><div className="comment-admin-actions"><button type="button" className="danger" onClick={() => deleteComment(comment)}>删除</button><button type="button" onClick={() => saveComment(comment)}>保存评论</button></div></article>)}{!comments.length && <p className="editor-empty">该论文暂时没有评论或补充注释。</p>}</section>
      <button className="save-edit" type="submit">保存论文与图片修订 →</button>
    </form>}

    <div className="review-list">{visiblePapers.map((paper) => <article className="review-card detailed" key={`${paper.recordType}-${paper.slug}`}>
      <div className="review-meta"><span>{paper.category}</span><i />{paper.subcategory}<i />{paper.journal} · {paper.published}<em>{paper.recordType === "curated" ? "批量导入" : paper.submitterName}</em></div><h2>{paper.title}</h2>{paper.titleZh && <p className="review-title-zh">{paper.titleZh}</p>}
      <div className="review-record-grid"><div><span>DOI / 来源</span><b>{paper.doi || "无 DOI"}</b>{paper.sourceUrl && <a href={paper.sourceUrl} target="_blank" rel="noreferrer">打开来源 ↗</a>}</div><div><span>所属分类</span><b>{getClassifications(paper).map((item) => `${item.category} / ${item.subcategory}`).join("；")}</b></div><div><span>图片</span><b>{paper.figureKeys.length ? `${paper.figureKeys.length} 张已上传` : "默认示意图"}</b></div></div>
      <div className="review-author-details">{paper.authorDetails?.length ? paper.authorDetails.filter((author) => author.role !== "other").map((author) => <span key={`${author.role}-${author.name}`}><b>{authorRoleLabels[author.role]}</b>{author.name}{author.institution && <small>{author.institution}</small>}</span>) : <p className="review-authors">作者待补充</p>}</div>
      <div className="review-summary"><b>中文摘要</b><p>{paper.abstractZh || "未填写"}</p></div><div className="review-insight"><b>一句话要点</b><span>{paper.insight || "未填写"}</span></div><div className="review-tags">{paper.keywords.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      <div className="review-foot"><div><b>{paper.recordType === "curated" ? "批量导入条目" : `投稿人：${paper.submitterName}`}</b><small>{paper.submitterEmail || "未留邮箱"} · {paper.createdAt || paper.addedAt || "收录时间待补充"}</small></div><div>{tab === "pending" && <><button className="reject" onClick={() => review(paper.id, "reject")}>退回</button><button className="approve" onClick={() => review(paper.id, "approve")}>批准公开</button></>}<button className="edit-record" onClick={() => beginEdit(paper)}>{tab === "pending" ? "审核前编辑" : "编辑论文、图片与评论"}</button></div></div>
    </article>)}</div>
    {!visiblePapers.length && <div className="empty-state"><strong>{query ? "没有找到匹配论文" : tab === "pending" ? "审核队列已清空" : "暂无已收录条目"}</strong><span>{query ? "可尝试标题片段、DOI、作者或标签。" : "新的投稿或已收录论文会显示在这里。"}</span></div>}
  </div>;
}
