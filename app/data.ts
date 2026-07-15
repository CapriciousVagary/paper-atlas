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
  abstractZh: string;
  insight: string;
  keywords: string[];
  figureCaption: string;
  figureType: "ring" | "modulator" | "laser";
  accent: string;
  figureImageUrl?: string;
  pdfUrl?: string;
  sourceUrl?: string;
  sample?: boolean;
};

export const categories = [
  {
    name: "光计算",
    code: "OC",
    description: "面向矩阵运算、神经网络与可重构信号处理的集成光子计算架构",
    subcategories: ["微环光计算", "MZI 光计算", "逆向设计光计算", "光电融合"],
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

export const papers: Paper[] = [
  {
    slug: "reconfigurable-microring-matrix",
    title: "Reconfigurable matrix computing with cascaded microring resonators",
    titleZh: "级联微环谐振器的可重构矩阵计算",
    category: "光计算",
    subcategory: "微环光计算",
    journal: "Nature Photonics",
    published: "2026.03",
    authors: ["示例作者 A", "示例作者 B", "示例作者 C"],
    institutions: ["示例大学光子学研究所", "示例国家实验室"],
    abstractZh:
      "本文展示一种基于级联微环谐振器的可重构矩阵运算架构。系统通过波长与热调谐联合控制权重，在紧凑芯片面积内实现并行光学乘加，并讨论了器件偏差、热串扰与标定策略对系统精度的影响。",
    insight: "以波长并行结合微环权重标定，在紧凑芯片上实现可重构矩阵乘法。",
    keywords: ["微环", "矩阵乘法", "WDM", "标定"],
    figureCaption: "关键图示占位：微环权重阵列、波长通道与输出读出链路。",
    figureType: "ring",
    accent: "#7c5cff",
    sample: true,
  },
  {
    slug: "thin-film-lithium-niobate-modulator",
    title: "Broadband traveling-wave modulators on thin-film lithium niobate",
    titleZh: "薄膜铌酸锂宽带行波调制器",
    category: "薄膜铌酸锂集成光子学",
    subcategory: "高速调制器",
    journal: "Optica",
    published: "2025.11",
    authors: ["示例作者 D", "示例作者 E", "示例作者 F"],
    institutions: ["示例大学量子研究中心", "示例微纳加工平台"],
    abstractZh:
      "本文提出一类面向高速链路的薄膜铌酸锂行波电极设计。通过优化微波与光波速度匹配、阻抗及电极损耗，在较长作用长度下保持宽电光带宽，并给出数据调制与功耗分析。",
    insight: "协同优化速度匹配与电极损耗，在长作用区间兼顾低驱动电压和宽带宽。",
    keywords: ["TFLN", "调制器", "行波电极", "高速通信"],
    figureCaption: "关键图示占位：器件截面、行波电极与电光响应曲线。",
    figureType: "modulator",
    accent: "#18b9c5",
    sample: true,
  },
  {
    slug: "heterogeneous-external-cavity-laser",
    title: "Heterogeneously integrated semiconductor external-cavity laser",
    titleZh: "异质集成半导体外腔激光器",
    category: "集成半导体外腔激光器",
    subcategory: "异质集成",
    journal: "Light: Science & Applications",
    published: "2025.08",
    authors: ["示例作者 G", "示例作者 H", "示例作者 I"],
    institutions: ["示例集成光电子实验室", "示例半导体研究院"],
    abstractZh:
      "本文将半导体增益芯片与低损耗外腔光子回路进行异质集成，利用高 Q 滤波结构增强选模与频率选择能力。工作展示了窄线宽、可调谐输出及长期稳定性，并分析封装反馈对性能的影响。",
    insight: "以低损耗高Q外腔强化选模，在片上同时获得窄线宽与可调谐激光输出。",
    keywords: ["外腔激光器", "异质集成", "窄线宽", "调谐"],
    figureCaption: "关键图示占位：增益芯片、外腔滤波器与调谐输出光谱。",
    figureType: "laser",
    accent: "#e99b38",
    sample: true,
  },
];

export const findPaper = (slug: string) => papers.find((paper) => paper.slug === slug);
