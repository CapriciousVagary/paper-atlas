"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { categories } from "../data";

const CUSTOM = "__custom__";

export default function UploadForm() {
  const [categoryChoice, setCategoryChoice] = useState(categories[0].name);
  const [subcategoryChoice, setSubcategoryChoice] = useState(categories[0].subcategories[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [figures, setFigures] = useState<Array<{ file: File; url: string }>>([]);
  const [keyFigureIndex, setKeyFigureIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const subcategoryOptions = useMemo(
    () => categories.find((item) => item.name === categoryChoice)?.subcategories ?? [],
    [categoryChoice],
  );
  const resolvedCategory = categoryChoice === CUSTOM ? customCategory.trim() : categoryChoice;
  const resolvedSubcategory = subcategoryChoice === CUSTOM || categoryChoice === CUSTOM ? customSubcategory.trim() : subcategoryChoice;

  useEffect(() => () => figures.forEach((item) => URL.revokeObjectURL(item.url)), [figures]);

  function chooseCategory(value: string) {
    setCategoryChoice(value);
    const first = categories.find((item) => item.name === value)?.subcategories[0] ?? CUSTOM;
    setSubcategoryChoice(first);
  }

  function chooseFigures(fileList: FileList | null) {
    figures.forEach((item) => URL.revokeObjectURL(item.url));
    const next = Array.from(fileList ?? []).slice(0, 8).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFigures(next);
    setKeyFigureIndex(0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolvedCategory || !resolvedSubcategory) {
      setStatus("请填写完整的大类和小类。");
      return;
    }
    setStatus("正在提交…");
    const form = new FormData(event.currentTarget);
    form.set("category", resolvedCategory);
    form.set("subcategory", resolvedSubcategory);
    form.set("keyFigureIndex", String(keyFigureIndex));
    const response = await fetch("/api/papers", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setSubmitted(true);
      setStatus(data.message ?? "投稿已提交，等待管理员审核。");
    } else {
      setStatus(data.error ?? "提交失败，请检查文件和表单内容。");
    }
  }

  return (
    <div className="upload-workspace">
      <div className="upload-intro">
        <span className="section-kicker">CONTRIBUTE A PAPER</span>
        <h1>上传一篇论文，<br />留下一张清晰的回顾卡。</h1>
        <p>任何人都可以投稿。请按模板填写摘要、标签与创新点；管理员审核通过后，条目才会出现在公开文献库。</p>
        <div className="workflow-steps"><span className="done"><b>1</b>来源</span><i /><span className="done"><b>2</b>填写</span><i /><span><b>3</b>关键图</span><i /><span><b>4</b>待审核</span></div>
        <div className="review-callout"><b>公开投稿 · 审核发布</b><span>投稿后不会立即公开，管理员可在审核台批准或退回。</span></div>
      </div>

      <form className="upload-form" onSubmit={submit}>
        <div className="form-section-title"><span>01</span><div><b>论文来源</b><small>PDF 与 DOI 至少填写一项</small></div></div>
        <label className="drop-zone"><input type="file" name="file" accept="application/pdf" /><span className="upload-icon">↑</span><b>拖入论文 PDF，或点击选择文件</b><small>PDF 不超过 50 MB</small></label>
        <div className="or-divider"><span>或</span></div>
        <label className="field-label">DOI / arXiv / 论文链接<input name="sourceUrl" placeholder="例如：10.1038/s41566-..." /></label>

        <div className="form-section-title"><span>02</span><div><b>基础信息</b><small>请以论文原文为准</small></div></div>
        <div className="form-grid"><label className="field-label">论文标题<input name="title" required placeholder="英文原始标题" /></label><label className="field-label">期刊与年月<input name="journal" placeholder="Nature Photonics · 2026.03" /></label></div>
        <label className="field-label">作者与单位<textarea name="authors" rows={3} placeholder="第一行填写作者，用逗号分隔；后续每行一个单位" /></label>

        <div className="form-section-title"><span>03</span><div><b>分类与标签</b><small>列表没有合适项时可直接新增</small></div></div>
        <div className="form-grid">
          <label className="field-label">大类
            <select value={categoryChoice} onChange={(event) => chooseCategory(event.target.value)}>{categories.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}<option value={CUSTOM}>＋ 自定义大类</option></select>
            {categoryChoice === CUSTOM && <input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="输入新的大类名称" required />}
          </label>
          <label className="field-label">小类
            <select value={subcategoryChoice} onChange={(event) => setSubcategoryChoice(event.target.value)} disabled={categoryChoice === CUSTOM}>{subcategoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}<option value={CUSTOM}>＋ 自定义小类</option></select>
            {(subcategoryChoice === CUSTOM || categoryChoice === CUSTOM) && <input value={customSubcategory} onChange={(event) => setCustomSubcategory(event.target.value)} placeholder="输入新的小类名称" required />}
          </label>
        </div>
        <label className="field-label">标签关键词<input name="tags" placeholder="微环, WDM, 矩阵乘法, 标定" /><small className="field-help">用逗号分隔，最多 12 个；论文发布后读者也可以继续补充标签。</small></label>

        <div className="form-section-title"><span>04</span><div><b>回顾内容</b><small>这是日后快速回忆论文的核心</small></div></div>
        <label className="field-label">中文摘要<textarea name="abstractZh" rows={6} required placeholder="建议保留研究目的、方法、主要结果与结论" /></label>
        <label className="field-label">50字以内创新点<textarea name="insight" rows={2} maxLength={50} required placeholder="一句话说明：它做了什么新的、为什么重要" /></label>

        <div className="form-section-title"><span>05</span><div><b>关键图表</b><small>可上传多张，并指定详情页主图</small></div></div>
        <label className="figure-drop"><input type="file" name="figures" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => chooseFigures(event.target.files)} /><span>＋ 添加关键图</span><small>JPG / PNG / WebP，最多 8 张，单张不超过 8 MB</small></label>
        {figures.length > 0 && <div className="figure-picker"><div className="figure-picker-title"><b>选择详情页主图</b><span>不选择时默认第一张</span></div><div className="figure-options">{figures.map((item, index) => <label className={keyFigureIndex === index ? "selected" : ""} key={`${item.file.name}-${index}`}><input type="radio" name="keyFigureChoice" checked={keyFigureIndex === index} onChange={() => setKeyFigureIndex(index)} /><img src={item.url} alt={`关键图候选 ${index + 1}`} /><span><b>图 {index + 1}</b><small>{item.file.name}</small></span></label>)}</div></div>}
        <label className="field-label">关键图说明<textarea name="figureCaption" rows={2} placeholder="例如：图 3，器件结构及不同波长通道的实验响应" /></label>

        <div className="form-section-title"><span>06</span><div><b>投稿人</b><small>用于审核沟通，不在公开页面显示邮箱</small></div></div>
        <div className="form-grid"><label className="field-label">姓名<input name="submitterName" required placeholder="你的姓名" /></label><label className="field-label">联系邮箱<input name="submitterEmail" type="email" placeholder="可选" /></label></div>
        <div className="form-note"><span>✓</span><p><b>发布规则</b>：新投稿默认进入待审核区；标题、分类、摘要、标签和关键图均可由管理员确认后公开。</p></div>
        <div className="form-actions"><small className={submitted ? "success" : ""}>{status}</small><button type="submit" disabled={submitted}>{submitted ? "已提交" : "提交审核 →"}</button></div>
      </form>
    </div>
  );
}
