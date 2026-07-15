"use client";

import { FormEvent, useState } from "react";
import { categories } from "../data";

export default function UploadForm() {
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [category, setCategory] = useState(categories[0].name);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("正在创建条目…");
    const response = await fetch("/api/papers", { method: "POST", body: new FormData(event.currentTarget) });
    setStatus(response.ok ? "条目已创建，可返回文献库查看。" : "本地数据库尚未初始化；表单结构已就绪，部署后即可保存。 ");
  }

  return (
    <div className="upload-workspace">
      <div className="upload-intro"><span className="section-kicker">CONTRIBUTE A PAPER</span><h1>上传一篇论文，<br />留下一张清晰的回顾卡。</h1><p>先上传 PDF 或输入 DOI，再选择自动生成初稿或按模板手动填写。所有自动内容都应由组员确认后发布。</p><div className="workflow-steps"><span className="done"><b>1</b>来源</span><i /><span><b>2</b>解析</span><i /><span><b>3</b>确认</span><i /><span><b>4</b>发布</span></div></div>
      <form className="upload-form" onSubmit={submit}>
        <div className="mode-switch"><button type="button" className={mode === "auto" ? "active" : ""} onClick={() => setMode("auto")}><b>自动生成初稿</b><small>PDF / DOI 自动提取信息</small></button><button type="button" className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}><b>按模板填写</b><small>完全掌控每个字段</small></button></div>
        <label className="drop-zone"><input type="file" name="file" accept="application/pdf" /><span className="upload-icon">↑</span><b>拖入论文 PDF，或点击选择文件</b><small>单个 PDF，建议不超过 50 MB</small></label>
        <div className="or-divider"><span>或</span></div>
        <label className="field-label">DOI / arXiv / 论文链接<input name="sourceUrl" placeholder="例如：10.1038/s41566-..." /></label>
        <div className="form-grid"><label className="field-label">论文标题<input name="title" required placeholder="粘贴英文原始标题" /></label><label className="field-label">期刊与年月<input name="journal" placeholder="Nature Photonics · 2026.03" /></label></div>
        <div className="form-grid"><label className="field-label">大类<select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="field-label">小类<select name="subcategory">{categories.find((item) => item.name === category)?.subcategories.map((item) => <option key={item}>{item}</option>)}</select></label></div>
        {mode === "manual" && <><label className="field-label">作者与单位<textarea name="authors" rows={2} placeholder="作者用逗号分隔；单位可另起一行" /></label><label className="field-label">中文摘要<textarea name="abstractZh" rows={5} placeholder="建议忠实保留研究目的、方法、主要结果与结论" /></label><label className="field-label">50字以内创新点<textarea name="insight" rows={2} maxLength={50} placeholder="一句话说明：它做了什么新的、为什么重要" /></label></>}
        <div className="form-note"><span>AI</span><p><b>自动生成范围</b>：标题、作者单位、中文摘要、关键词和创新点初稿。关键图表由上传者确认并选择。</p></div>
        <div className="form-actions"><small>{status}</small><button type="submit">{mode === "auto" ? "开始解析" : "创建条目"} →</button></div>
      </form>
    </div>
  );
}
