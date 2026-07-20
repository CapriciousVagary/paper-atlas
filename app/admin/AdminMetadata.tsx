"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Catalog = {
  categories: Array<{ name: string; subcategories: string[] }>;
  tags: string[];
  journals: Array<{ fullName: string; abbreviation: string; aliases: string[] }>;
  institutions: Array<{ fullName: string; aliases: string[] }>;
  papers: Array<{ slug: string; title: string; recordType: "curated" | "stored"; classifications: Array<{ category: string; subcategory: string }>; keywords: string[] }>;
};
type Migration = { kind: "category" | "subcategory" | "tag"; name: string; parent: string };
const emptyCatalog: Catalog = { categories: [], tags: [], journals: [], institutions: [], papers: [] };

export default function AdminMetadata({ adminKey, editorName }: { adminKey: string; editorName: string }) {
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [status, setStatus] = useState("正在读取分类与字典…");
  const [migration, setMigration] = useState<Migration | null>(null);
  const [targetCategory, setTargetCategory] = useState("");
  const [targetSubcategory, setTargetSubcategory] = useState("");
  const [targetTag, setTargetTag] = useState("");
  const [taxonomyKind, setTaxonomyKind] = useState<Migration["kind"]>("category");
  const [taxonomyName, setTaxonomyName] = useState("");
  const [taxonomyParent, setTaxonomyParent] = useState("");
  const [journalName, setJournalName] = useState(""); const [journalAbbreviation, setJournalAbbreviation] = useState(""); const [journalAliases, setJournalAliases] = useState("");
  const [institutionName, setInstitutionName] = useState(""); const [institutionAliases, setInstitutionAliases] = useState("");

  async function load() {
    const response = await fetch("/api/admin/metadata", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setStatus(data.error ?? "读取失败"); return; }
    setCatalog(data); setStatus(`已收录 ${data.categories?.length ?? 0} 个大类、${data.tags?.length ?? 0} 个标签、${data.journals?.length ?? 0} 个期刊和 ${data.institutions?.length ?? 0} 个单位。`);
  }
  // Load once when the metadata workspace becomes visible.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  const affected = useMemo(() => !migration ? [] : catalog.papers.filter((paper) => migration.kind === "tag" ? paper.keywords.includes(migration.name) : paper.classifications.some((item) => migration.kind === "category" ? item.category === migration.name : item.category === migration.parent && item.subcategory === migration.name)), [catalog.papers, migration]);
  const targetSubcategories = catalog.categories.find((item) => item.name === targetCategory)?.subcategories ?? [];

  function beginMigration(next: Migration) {
    setMigration(next); const category = catalog.categories.find((item) => item.name !== (next.kind === "category" ? next.name : "")); setTargetCategory(category?.name ?? ""); setTargetSubcategory(category?.subcategories[0] ?? ""); setTargetTag("");
    window.setTimeout(() => document.querySelector(".metadata-migration")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  async function addEntry(event: FormEvent, body: Record<string, unknown>, reset: () => void) {
    event.preventDefault(); setStatus("正在保存选项…");
    const response = await fetch("/api/admin/metadata", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": adminKey, "x-editor-name": editorName }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})); if (!response.ok) { setStatus(data.error ?? "保存失败"); return; } reset(); await load();
  }

  async function confirmMigration() {
    if (!migration) return; setStatus(`正在迁移 ${affected.length} 篇论文…`);
    const response = await fetch("/api/admin/metadata", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": adminKey, "x-editor-name": editorName }, body: JSON.stringify({ ...migration, replacementCategory: targetCategory, replacementSubcategory: targetSubcategory, replacementTag: targetTag }) });
    const data = await response.json().catch(() => ({})); if (!response.ok) { setStatus(data.error ?? "迁移失败"); return; } setMigration(null); setStatus(`迁移完成，共更新 ${data.changed} 篇论文。`); await load();
  }

  return <section className="metadata-admin">
    <div className="metadata-heading"><div><span className="section-kicker">CONTROLLED VOCABULARY</span><h2>分类、期刊与单位</h2><p>{status}</p></div><button type="button" onClick={load}>刷新</button></div>
    {migration && <section className="metadata-migration"><div className="editor-section-heading"><div><span>MIGRATE BEFORE DELETE</span><h3>删除“{migration.parent ? `${migration.parent} / ` : ""}{migration.name}”前迁移论文</h3></div><button type="button" onClick={() => setMigration(null)}>取消</button></div><p>以下 {affected.length} 篇论文会受影响。确认后系统将批量改写这些论文，并隐藏旧选项。</p><div className="migration-paper-list">{affected.map((paper) => <span key={`${paper.recordType}-${paper.slug}`}>{paper.title}<small>{paper.recordType === "curated" ? "批量导入" : "线上投稿"}</small></span>)}</div>{migration.kind === "tag" ? <label>替换为标签（留空表示仅删除）<input list="metadata-tag-options" value={targetTag} onChange={(event) => setTargetTag(event.target.value)} /></label> : <div className="edit-grid"><label>迁移至大类<select value={targetCategory} onChange={(event) => { setTargetCategory(event.target.value); setTargetSubcategory(catalog.categories.find((item) => item.name === event.target.value)?.subcategories[0] ?? ""); }}>{catalog.categories.filter((item) => item.name !== (migration.kind === "category" ? migration.name : "")).map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>迁移至小类<select value={targetSubcategory} onChange={(event) => setTargetSubcategory(event.target.value)}>{targetSubcategories.map((item) => <option key={item}>{item}</option>)}</select></label></div>}<button className="danger-action" type="button" onClick={confirmMigration}>迁移全部受影响论文并删除旧选项</button></section>}
    <datalist id="metadata-tag-options">{catalog.tags.filter((tag) => tag !== migration?.name).map((tag) => <option value={tag} key={tag} />)}</datalist>
    <div className="metadata-columns">
      <section><h3>分类与标签</h3><form onSubmit={(event) => addEntry(event, { type: "taxonomy", kind: taxonomyKind, name: taxonomyName, parent: taxonomyParent }, () => { setTaxonomyName(""); setTaxonomyParent(""); })}><select value={taxonomyKind} onChange={(event) => setTaxonomyKind(event.target.value as Migration["kind"])}><option value="category">大类</option><option value="subcategory">小类</option><option value="tag">标签</option></select>{taxonomyKind === "subcategory" && <select value={taxonomyParent} onChange={(event) => setTaxonomyParent(event.target.value)} required><option value="">选择所属大类</option>{catalog.categories.map((item) => <option key={item.name}>{item.name}</option>)}</select>}<input value={taxonomyName} onChange={(event) => setTaxonomyName(event.target.value)} placeholder="新选项名称" required /><button>添加</button></form><div className="taxonomy-list">{catalog.categories.map((category) => <article key={category.name}><div><b>{category.name}</b><button type="button" onClick={() => beginMigration({ kind: "category", name: category.name, parent: "" })}>删除/迁移</button></div>{category.subcategories.map((subcategory) => <span key={subcategory}>{subcategory}<button type="button" onClick={() => beginMigration({ kind: "subcategory", name: subcategory, parent: category.name })}>×</button></span>)}</article>)}<article><div><b>标签</b></div>{catalog.tags.map((tag) => <span key={tag}>#{tag}<button type="button" onClick={() => beginMigration({ kind: "tag", name: tag, parent: "" })}>×</button></span>)}</article></div></section>
      <section><h3>期刊全称与简称</h3><form onSubmit={(event) => addEntry(event, { type: "journal", name: journalName, abbreviation: journalAbbreviation, aliases: journalAliases.split(/[,，]/) }, () => { setJournalName(""); setJournalAbbreviation(""); setJournalAliases(""); })}><input value={journalName} onChange={(event) => setJournalName(event.target.value)} placeholder="期刊英文全称" required /><input value={journalAbbreviation} onChange={(event) => setJournalAbbreviation(event.target.value)} placeholder="英文简称" /><input value={journalAliases} onChange={(event) => setJournalAliases(event.target.value)} placeholder="其他简称，逗号分隔" /><button>保存期刊</button></form><div className="dictionary-list">{catalog.journals.map((journal) => <button type="button" key={journal.fullName} onClick={() => { setJournalName(journal.fullName); setJournalAbbreviation(journal.abbreviation); setJournalAliases(journal.aliases.join(", ")); }}><b>{journal.fullName}</b><span>{journal.abbreviation || "简称待补充"}{journal.aliases.length ? ` · ${journal.aliases.join(" / ")}` : ""}</span></button>)}</div></section>
      <section><h3>单位全称与别名</h3><form onSubmit={(event) => addEntry(event, { type: "institution", name: institutionName, aliases: institutionAliases.split(/[,，]/) }, () => { setInstitutionName(""); setInstitutionAliases(""); })}><input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="单位英文全称" required /><input value={institutionAliases} onChange={(event) => setInstitutionAliases(event.target.value)} placeholder="英文缩写、中文全称或缩写，逗号分隔" /><button>保存单位</button></form><div className="dictionary-list">{catalog.institutions.map((institution) => <button type="button" key={institution.fullName} onClick={() => { setInstitutionName(institution.fullName); setInstitutionAliases(institution.aliases.join(", ")); }}><b>{institution.fullName}</b><span>{institution.aliases.join(" / ") || "别名待补充"}</span></button>)}</div></section>
    </div>
  </section>;
}
