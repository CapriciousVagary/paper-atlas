"use client";

import { FormEvent, useState } from "react";

export function KeywordEditor({ paperSlug, initialKeywords }: { paperSlug: string; initialKeywords: string[] }) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!tag.trim()) return;
    const response = await fetch(`/api/papers/${encodeURIComponent(paperSlug)}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setKeywords(data.tags ?? keywords); setTag(""); setStatus("已添加"); }
    else setStatus(data.error ?? "添加失败");
  }

  return <><div className="keyword-cloud">{keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><form className="tag-add-form" onSubmit={submit}><input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="补充一个标签" maxLength={30} /><button type="submit">＋</button></form><small className="tag-status">{status || "最多保留 12 个标签"}</small></>;
}
