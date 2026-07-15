"use client";

import { FormEvent, useEffect, useState } from "react";

type Comment = { id: number | string; author: string; content: string; createdAt: string };

export function Comments({ paperSlug }: { paperSlug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState<"comment" | "note">("comment");

  useEffect(() => {
    fetch(`/api/comments?paperSlug=${encodeURIComponent(paperSlug)}`)
      .then((response) => (response.ok ? response.json() : { comments: [] }))
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setStatus("暂时无法读取讨论，请稍后重试。"));
  }, [paperSlug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!author.trim() || !content.trim()) return;
    setStatus("正在发布…");
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperSlug, author, content: kind === "note" ? `【注释】${content}` : content }),
    });
    if (response.ok) {
      const data = await response.json();
      setComments((current) => [data.comment, ...current]);
      setContent("");
      setStatus("已发布");
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error ?? "发布失败，请稍后重试。");
    }
  }

  return (
    <section className="comments-panel">
      <div className="comments-title"><div><span className="section-kicker">GROUP DISCUSSION</span><h2>组内讨论</h2></div><span>{comments.length} 条</span></div>
      <form onSubmit={submit} className="comment-form">
        <div className="avatar">Q</div>
        <div className="comment-fields">
          <div className="comment-kind"><button type="button" className={kind === "comment" ? "active" : ""} onClick={() => setKind("comment")}>评论</button><button type="button" className={kind === "note" ? "active" : ""} onClick={() => setKind("note")}>补充注释</button></div>
          <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="你的姓名" aria-label="姓名" />
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={kind === "note" ? "补充参数、图表解读、复现细节或更正…" : "记录疑问、讨论观点或关联论文…"} aria-label="评论内容" rows={3} />
          <div><small>{status}</small><button type="submit">发布评论</button></div>
        </div>
      </form>
      <div className="comment-list">
        {comments.map((comment) => { const isNote = comment.content.startsWith("【注释】"); return <article className={isNote ? "note" : ""} key={comment.id}><div className="avatar muted">{comment.author.slice(0, 1)}</div><div><b>{comment.author}</b>{isNote && <em>补充注释</em>}<time>{comment.createdAt}</time><p>{isNote ? comment.content.slice(4) : comment.content}</p></div></article>; })}
        {!comments.length && <div className="comments-empty">还没有讨论或注释，欢迎留下第一条。</div>}
      </div>
    </section>
  );
}
