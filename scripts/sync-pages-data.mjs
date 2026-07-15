import { readFile, writeFile } from "node:fs/promises";

const papers = JSON.parse(await readFile("app/imported-papers.json", "utf8")).map((paper) => ({
  slug: paper.slug,
  title: paper.title,
  titleZh: paper.titleZh,
  category: paper.category,
  subcategory: paper.subcategory,
  journal: paper.journal,
  published: paper.published,
  authors: paper.authors,
  institutions: paper.institutions,
  abstractZh: paper.abstractZh,
  insight: paper.insight,
  keywords: paper.keywords,
  figure: paper.figureType,
  accent: paper.accent,
  caption: paper.figureCaption,
  doi: paper.doi,
  sourceUrl: paper.sourceUrl,
}));

const categories = [
  { name: "光计算", code: "OC", tone: "violet", description: "面向矩阵运算、神经网络与可重构信号处理的集成光子计算架构", subs: ["微环光计算", "MZI 光计算", "逆向设计光计算", "光电融合", "量子光计算", "微环器件基础", "集成光源", "光子安全与智能感知"] },
  { name: "薄膜铌酸锂集成光子学", code: "TFLN", tone: "cyan", description: "覆盖非线性频率转换、高速调制、无源器件与量子光子学", subs: ["PPLN 非线性", "高速调制器", "AWG 与其他器件", "逆向设计", "量子计算"] },
  { name: "集成半导体外腔激光器", code: "ECL", tone: "amber", description: "关注异质集成、窄线宽、宽调谐及片上激光控制", subs: ["异质集成", "窄线宽", "宽调谐", "控制与封装"] },
];

await writeFile("docs/data.js", `window.PAPER_ATLAS = ${JSON.stringify({ categories, papers }, null, 2)};\n`, "utf8");
console.log(`Synced ${papers.length} papers to GitHub Pages data.`);
