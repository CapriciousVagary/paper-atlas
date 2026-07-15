import importedPapers from "./imported-papers.json";

export type AuthorRole = "first" | "cofirst" | "corresponding" | "notable" | "other";

export type AuthorDetail = {
  name: string;
  role: AuthorRole;
  institution?: string;
  note?: string;
};

export type Paper = {
  slug: string;
  title: string;
  titleZh: string;
  category: string;
  subcategory: string;
  journal: string;
  published: string;
  authors: string[];
  institutions: string[];
  authorDetails?: AuthorDetail[];
  abstractZh: string;
  insight: string;
  keywords: string[];
  figureCaption: string;
  figureType: "ring" | "modulator" | "laser";
  accent: string;
  figureImageUrl?: string;
  pdfUrl?: string;
  sourceUrl?: string;
  doi?: string;
  verificationStatus?: "verified" | "manual";
  createdAt?: string;
  addedAt?: string;
  sample?: boolean;
};

export const categories = [
  {
    name: "光计算",
    code: "OC",
    description: "面向矩阵运算、神经网络与可重构信号处理的集成光子计算架构",
    subcategories: ["微环光计算", "MZI 光计算", "逆向设计光计算", "光电融合", "量子光计算", "微环器件基础", "集成光源", "光子安全与智能感知"],
    tone: "violet",
  },
  {
    name: "薄膜铌酸锂集成光子学",
    code: "TFLN",
    description: "覆盖非线性频率转换、高速调制、无源器件与量子光子学",
    subcategories: ["PPLN 非线性", "高速调制器", "AWG 与其他器件", "逆向设计", "量子计算"],
    tone: "cyan",
  },
  {
    name: "集成半导体外腔激光器",
    code: "ECL",
    description: "关注异质集成、窄线宽、宽调谐及片上激光控制",
    subcategories: ["异质集成", "窄线宽", "宽调谐", "控制与封装"],
    tone: "amber",
  },
];

export const papers = importedPapers as Paper[];

export const authorRoleLabels: Record<AuthorRole, string> = {
  first: "第一作者",
  cofirst: "共同第一作者",
  corresponding: "通讯作者",
  notable: "重点关注作者",
  other: "其他作者",
};

export function getAuthorDetails(paper: Pick<Paper, "authors" | "institutions" | "authorDetails">): AuthorDetail[] {
  if (paper.authorDetails?.length) return paper.authorDetails.filter((author) => author.name.trim());
  return (paper.authors ?? []).map((name, index) => ({
    name,
    role: index === 0 ? "first" : "other",
    institution: paper.authors.length === paper.institutions.length ? paper.institutions[index] : undefined,
  }));
}

export function paperAddedAt(paper: Pick<Paper, "createdAt" | "addedAt">) {
  return paper.createdAt || paper.addedAt || "2026-07-15T00:00:00+08:00";
}

export const findPaper = (slug: string) => papers.find((paper) => paper.slug === slug);
