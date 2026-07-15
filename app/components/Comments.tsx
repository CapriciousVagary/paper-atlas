"use client";

import { FormEvent, useEffect, useState } from "react";

type Comment = { id: number | string; author: string; content: string; createdAt: string };

const starterComments: Comment[] = [
  { id: "sample-1", author: "组内讨论示例", content: "建议后续补充器件标定流程，并把实验值与理论上限分开记录。", createdAt: "示例内容" },
];

export function Comments({ paperSlug }: { paperSlug: string }) {
  const [comments, setComments] = useState<Comment[]>(starterComments);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(`/api/comments?paperSlug=${encodeURIComponent(paperSlug)}`)
      .then((response) => (response.ok ? response.json() : { comments: [] }))
      .then((data) => data.comments?.length && setComments(data.comments))
      .catch(() => undefined);
  }, [paperSlug]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!author.trim() || !content.trim()) return;
    setStatus("正在发布…");
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperSlug, author, content }),
    });
    if (response.ok) {
      const data = await response.json();
      setComments((current) => [data.comment, ...current.filter((item) => !String(item.id).startsWith("sample"))]);
      setContent("");
      setStatus("已发布");
    } else {
      setStatus("本地预览尚未初始化数据库，部署后即可保存评论。");
    }
  }

  return (
    <section className="comments-panel">
      <div className="comments-title"><div><span className="section-kicker">GROUP DISCUSSION</span><h2>组内讨论</h2></div><span>{comments.length} 条</span></div>
      <form onSubmit={submit} className="comment-form">
        <div className="avatar">Q</div>
        <div className="comment-fields">
          <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="你的姓名" aria-label="姓名" />
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="记录疑问、复现实验或关联论文…" aria-label="评论内容" rows={3} />
          <div><small>{status}</small><button type="submit">发布评论</button></div>
        </div>
      </form>
      <div className="comment-list">
        {comments.map((comment) => <article key={comment.id}><div className="avatar muted">{comment.author.slice(0, 1)}</div><div><b>{comment.author}</b><time>{comment.createdAt}</time><p>{comment.content}</p></div></article>)}
      </div>
    </section>
  );
}
