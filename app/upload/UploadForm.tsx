"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authorRoleLabels, categories, type AuthorDetail, type AuthorRole } from "../data";

const CUSTOM = "__custom__";
type Duplicate = { slug: string; title: string; titleZh?: string; journal?: string; published?: string; matchReason: string; score: number };
type AuthorRow = AuthorDetail & { id: string };
type InstitutionOption = { fullName: string; aliases: string[] };
type ExtraClassification = { id: string; category: string; subcategory: string };

const initialAuthors: AuthorRow[] = [
  { id: "first", role: "first", name: "", institution: "" },
  { id: "cofirst", role: "cofirst", name: "", institution: "" },
  { id: "corresponding", role: "corresponding", name: "", institution: "" },
  { id: "notable", role: "notable", name: "", institution: "", note: "" },
];

export default function UploadForm() {
  const [categoryChoice, setCategoryChoice] = useState(categories[0].name);
  const [subcategoryChoice, setSubcategoryChoice] = useState(categories[0].subcategories[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [figures, setFigures] = useState<Array<{ file: File; url: string }>>([]);
  const [keyFigureIndex, setKeyFigureIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [authors, setAuthors] = useState<AuthorRow[]>(initialAuthors);
  const [institutionOptions, setInstitutionOptions] = useState<InstitutionOption[]>([]);
  const [extraClassifications, setExtraClassifications] = useState<ExtraClassification[]>([]);

  const subcategoryOptions = useMemo(
    () => categories.find((item) => item.name === categoryChoice)?.subcategories ?? [],
    [categoryChoice],
  );
  const resolvedCategory = categoryChoice === CUSTOM ? customCategory.trim() : categoryChoice;
  const resolvedSubcategory = subcategoryChoice === CUSTOM || categoryChoice === CUSTOM ? customSubcategory.trim() : subcategoryChoice;

  useEffect(() => () => figures.forEach((item) => URL.revokeObjectURL(item.url)), [figures]);

  useEffect(() => { void loadInstitutions(""); }, []);

  useEffect(() => {
    if (title.trim().length < 3 && !sourceUrl.trim()) {
      const reset = window.setTimeout(() => setDuplicates([]), 0);
      return () => window.clearTimeout(reset);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ title: title.trim(), doi: sourceUrl.trim() });
        const response = await fetch(`/api/papers/duplicates?${params}`, { signal: controller.signal });
        const data = response.ok ? await response.json() : { duplicates: [] };
        setDuplicates(data.duplicates ?? []);
      } catch { if (!controller.signal.aborted) setDuplicates([]); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [title, sourceUrl]);

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

  async function loadInstitutions(query: string) {
    try {
      const response = await fetch(`/api/institutions?q=${encodeURIComponent(query)}`);
      if (response.ok) setInstitutionOptions((await response.json()).institutions ?? []);
    } catch {
      // Free-form institution entry remains available.
    }
  }

  function updateAuthor(id: string, patch: Partial<AuthorRow>) {
    setAuthors((current) => current.map((author) => author.id === id ? { ...author, ...patch } : author));
  }

  function addAuthor(role: AuthorRole = "cofirst") {
    setAuthors((current) => [...current, { id: `${role}-${Date.now()}-${current.length}`, role, name: "", institution: "", note: "" }]);
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
    form.set("confirmDuplicate", duplicateConfirmed ? "1" : "0");
    form.set("authorDetails", JSON.stringify(authors.filter((author) => author.name.trim()).map((author) => ({ name: author.name, role: author.role, institution: author.institution, aliases: author.aliases, note: author.note }))));
    form.set("classifications", JSON.stringify(extraClassifications.filter((item) => item.category.trim() && item.subcategory.trim())));
    const response = await fetch("/api/papers", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (response.status === 409) {
      setDuplicates(data.duplicates ?? []);
      setStatus("检测到可能重复的条目。请先查看下方结果；确认不是重复后仍可继续提交。");
    } else if (response.ok) {
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
        <label className="field-label">DOI / arXiv / 论文链接<input name="sourceUrl" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setDuplicateConfirmed(false); }} placeholder="例如：10.1038/s41566-..." /></label>

        <div className="form-section-title"><span>02</span><div><b>基础信息</b><small>请以论文原文为准</small></div></div>
        <div className="form-grid"><label className="field-label">论文标题<input name="title" required value={title} onChange={(event) => { setTitle(event.target.value); setDuplicateConfirmed(false); }} placeholder="英文原始标题" /></label><label className="field-label">期刊与年月<input name="journal" placeholder="Nature Photonics · 2026.03" /></label></div>
        {duplicates.length > 0 && <div className="duplicate-warning"><div><b>可能已经收录</b><span>标题或 DOI 与现有条目接近，请先预览再判断。</span></div>{duplicates.map((paper) => <Link href={`/papers/${paper.slug}`} target="_blank" key={paper.slug}><span>{paper.matchReason} · {Math.round(paper.score * 100)}%</span><strong>{paper.title}</strong><small>{paper.journal || "期刊待补充"} · {paper.published || "年月待补充"}　预览本站详情 ↗</small></Link>)}<label><input type="checkbox" checked={duplicateConfirmed} onChange={(event) => setDuplicateConfirmed(event.target.checked)} />我已查看，确认仍要继续投稿</label></div>}
        <div className="author-editor">
          <div className="author-editor-heading"><div><b>关键作者与单位（可选）</b><small>默认展示第一作者、共同一作、通讯作者和投稿者重点关注的作者</small></div><button type="button" onClick={() => addAuthor()}>＋ 添加作者</button></div>
          <input type="hidden" name="authorDetails" />
          <datalist id="institution-options">{institutionOptions.map((item) => <option value={item.fullName} key={item.fullName}>{item.aliases.join(" / ")}</option>)}</datalist>
          <div className="author-rows">{authors.map((author, index) => <div className="author-row" key={author.id}>
            <label>作者类型<select value={author.role} onChange={(event) => updateAuthor(author.id, { role: event.target.value as AuthorRole })}>{Object.entries(authorRoleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>姓名<input value={author.name} onChange={(event) => updateAuthor(author.id, { name: event.target.value })} placeholder={index === 0 ? "例如：Jane Doe" : "可留空"} /></label>
            <label>姓名别名<input value={(author.aliases ?? []).join(", ")} onChange={(event) => updateAuthor(author.id, { aliases: event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) })} placeholder="例如：张三, San Zhang" /></label>
            <label className="institution-field">单位英文全称<input list="institution-options" value={author.institution ?? ""} onFocus={() => loadInstitutions(author.institution ?? "")} onChange={(event) => { updateAuthor(author.id, { institution: event.target.value }); void loadInstitutions(event.target.value); }} placeholder="输入中文名或缩写可获得英文全称建议" /></label>
            {author.role === "notable" && <label>关注说明<input value={author.note ?? ""} onChange={(event) => updateAuthor(author.id, { note: event.target.value })} placeholder="例如：该方向代表性学者" /></label>}
            <button className="remove-author" type="button" onClick={() => setAuthors((current) => current.filter((item) => item.id !== author.id))} aria-label="删除该作者">×</button>
          </div>)}</div>
          <div className="author-quick-add"><span>快速添加：</span><button type="button" onClick={() => addAuthor("cofirst")}>共同一作</button><button type="button" onClick={() => addAuthor("corresponding")}>通讯作者</button><button type="button" onClick={() => addAuthor("notable")}>重点关注作者</button></div>
          <p className="field-help">请选择建议中的英文全称；如果是尚未出现的新单位，可直接填写英文全称，论文审核通过后会自动加入下次的提示列表。姓名、单位和作者类型均可稍后补充。</p>
        </div>

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
        <div className="multi-class-editor"><div><b>其他所属分类（可选）</b><button type="button" onClick={() => setExtraClassifications((current) => [...current, { id: `class-${Date.now()}`, category: "", subcategory: "" }])}>＋ 添加另一分类</button></div><p>同一论文可属于多个大类或小类；每个所属分类都会参与计数与筛选。</p><datalist id="category-options">{categories.map((item) => <option value={item.name} key={item.name} />)}</datalist>{extraClassifications.map((item) => <div className="multi-class-row" key={item.id}><input list="category-options" value={item.category} onChange={(event) => setExtraClassifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, category: event.target.value } : entry))} placeholder="大类（可新建）" /><input value={item.subcategory} onChange={(event) => setExtraClassifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, subcategory: event.target.value } : entry))} placeholder="小类（可新建）" /><button type="button" onClick={() => setExtraClassifications((current) => current.filter((entry) => entry.id !== item.id))}>×</button></div>)}</div>
        <label className="field-label">标签关键词<input name="tags" placeholder="微环, WDM, 矩阵乘法" /><small className="field-help">标签尽量精简，用逗号分隔，最多 6 个；论文发布后仍可继续补充。</small></label>

        <div className="form-section-title"><span>04</span><div><b>回顾内容</b><small>这是日后快速回忆论文的核心</small></div></div>
        <label className="field-label">中文摘要<textarea name="abstractZh" rows={6} required placeholder="建议保留研究目的、方法、主要结果与结论" /></label>
        <label className="field-label">50字以内创新点<textarea name="insight" rows={2} maxLength={50} required placeholder="一句话说明：它做了什么新的、为什么重要" /></label>

        <div className="form-section-title"><span>05</span><div><b>关键图表（可选）</b><small>未上传时显示默认示意图；上传多张时可指定主图</small></div></div>
        <label className="figure-drop"><input type="file" name="figures" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => chooseFigures(event.target.files)} /><span>＋ 添加关键图（可跳过）</span><small>JPG / PNG / WebP，最多 8 张，单张不超过 8 MB；不上传也可提交</small></label>
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
