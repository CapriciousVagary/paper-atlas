import { readFile, writeFile } from "node:fs/promises";

const path = process.argv[2] ?? "app/imported-papers.json";
const existing = JSON.parse(await readFile(path, "utf8"));
const addedAt = "2026-07-16T12:00:00+08:00";
const defaultCaption = "上传者暂未提供关键图，当前显示铌酸锂非线性光学的默认示意图。";
const ln = "薄膜铌酸锂集成光子学";
const bulk = "铌酸锂非线性光学";

function author(name, role, institution, aliases = [], note) { return { name, role, institution, aliases, ...(note ? { note } : {}) }; }
function paper(data) {
  return { figureCaption: defaultCaption, figureType: "modulator", accent: "#14aeb6", verificationStatus: "verified", addedAt, ...data };
}

const imports = [
  paper({
    slug: "segment-chirped-ppln-waveguides-broadband-supercontinuum",
    title: "Segment-chirped periodically poled lithium niobate waveguides for broadband supercontinuum generation",
    titleZh: "用于宽带超连续谱产生的分段啁啾周期极化铌酸锂波导",
    category: ln, subcategory: "PPLN 非线性",
    classifications: [{ category: ln, subcategory: "PPLN 非线性" }, { category: ln, subcategory: "超连续谱与频率梳" }, { category: ln, subcategory: "宽带频率转换" }],
    journal: "arXiv preprint", published: "2026.05",
    authors: ["Yue Li", "Xiaodong Shi", "Sakthi Sanjeev Mohanraj", "Mengyao Zhao", "Xu Chen", "Xuan Mao", "Qijie Wang", "Shouhuan Zhou", "Guoliang Deng", "Di Zhu"],
    institutions: ["National University of Singapore", "Sichuan University", "Agency for Science, Technology and Research (A*STAR)", "Centre for Quantum Technologies, National University of Singapore"],
    authorDetails: [
      author("Yue Li", "first", "Department of Materials Science and Engineering, National University of Singapore; College of Electronics and Information Engineering, Sichuan University"),
      ...["Xiaodong Shi", "Sakthi Sanjeev Mohanraj", "Mengyao Zhao", "Xu Chen", "Xuan Mao", "Qijie Wang", "Shouhuan Zhou", "Guoliang Deng"].map((name) => author(name, "other")),
      author("Di Zhu", "corresponding", "Department of Materials Science and Engineering, National University of Singapore; Quantum Innovation Centre, Agency for Science, Technology and Research (A*STAR); Centre for Quantum Technologies, National University of Singapore"),
    ],
    abstractZh: "研究提出分段啁啾周期极化铌酸锂波导，通过在不同波导段采用离散变化的极化周期，同时调控二阶和三阶非线性过程。该设计避免连续啁啾结构中极短畴宽与占空比失真的制造难题，在接近理想占空比的条件下实现从约320 nm到2600 nm的平坦三倍频程超连续谱，为片上宽带光源和精密光谱提供可制造方案。",
    insight: "分段啁啾极化兼顾可制造性，实现三倍频程平坦超连续谱。",
    keywords: ["分段啁啾", "PPLN", "超连续谱", "二阶非线性", "色散工程"],
    sourceUrl: "https://arxiv.org/abs/2605.30941",
  }),
  paper({
    slug: "anisotropy-free-awg-x-cut-tfln",
    title: "Anisotropy-free arrayed waveguide gratings on X-cut thin film lithium niobate platform of in-plane anisotropy",
    titleZh: "面向面内各向异性 X 切薄膜铌酸锂平台的无各向异性阵列波导光栅",
    category: ln, subcategory: "AWG 与其他器件",
    classifications: [{ category: ln, subcategory: "AWG 与其他器件" }],
    journal: "Light: Science & Applications", published: "2024.06",
    authors: ["Junjie Yi", "Changjian Guo", "Ziliang Ruan", "Gengxin Chen", "Haiqiang Wei", "Liwang Lu", "Shengqi Gong", "Xiaofu Pan", "Xiaowan Shen", "Xiaowei Guan", "Daoxin Dai", "Kangping Zhong", "Liu Liu"],
    institutions: ["State Key Laboratory of Extreme Photonics and Instrumentation, College of Optical Science and Engineering, International Research Center for Advanced Photonics, Zhejiang University"],
    authorDetails: [author("Junjie Yi", "first", "State Key Laboratory of Extreme Photonics and Instrumentation, College of Optical Science and Engineering, International Research Center for Advanced Photonics, Zhejiang University"), author("Changjian Guo", "cofirst", "State Key Laboratory of Extreme Photonics and Instrumentation, College of Optical Science and Engineering, International Research Center for Advanced Photonics, Zhejiang University"), ...["Ziliang Ruan", "Gengxin Chen", "Haiqiang Wei", "Liwang Lu", "Shengqi Gong", "Xiaofu Pan", "Xiaowan Shen", "Xiaowei Guan", "Daoxin Dai", "Kangping Zhong"].map((name) => author(name, "other")), author("Liu Liu", "corresponding", "State Key Laboratory of Extreme Photonics and Instrumentation, College of Optical Science and Engineering, International Research Center for Advanced Photonics, Zhejiang University")],
    abstractZh: "X 切薄膜铌酸锂具有显著面内各向异性，使弯曲波导的有效折射率随传播方向变化，限制了传统阵列波导光栅的相位一致性。作者提出通用的无各向异性设计方法，并首次在该平台实现阵列波导光栅，测得2.4 dB插入损耗和−24.1 dB串扰，同时演示波长路由与波分复用功能。",
    insight: "用无各向异性版图消除 X 切 TFLN 弯曲波导相位误差。",
    keywords: ["阵列波导光栅", "X切TFLN", "各向异性", "波分复用", "波长路由"], doi: "10.1038/s41377-024-01506-1", sourceUrl: "https://doi.org/10.1038/s41377-024-01506-1",
  }),
  paper({
    slug: "broadband-tunable-shg-suspended-tfln-rib-waveguides",
    title: "Broadband and widely tunable second harmonic generation in suspended thin-film LiNbO3 rib waveguides",
    titleZh: "悬空薄膜铌酸锂脊形波导中的宽带宽调谐二次谐波产生",
    category: ln, subcategory: "二阶非线性与频率转换",
    classifications: [{ category: ln, subcategory: "二阶非线性与频率转换" }, { category: ln, subcategory: "宽带频率转换" }],
    journal: "APL Photonics", published: "2024.10",
    authors: ["Aiman Zinaoui", "Lucas Grosjean", "Arthur De Sousa Lopes Moreira", "Miguel Angel Suarez", "Samuel Queste", "Laurent Robert", "Ludovic Gauthier-Manuel", "Mathieu Chauvet", "Nadège Courjal"],
    institutions: ["FEMTO-ST Institute, UMR CNRS 6174, University of Franche-Comté"],
    authorDetails: [author("Aiman Zinaoui", "first", "FEMTO-ST Institute, UMR CNRS 6174, University of Franche-Comté"), ...["Lucas Grosjean", "Arthur De Sousa Lopes Moreira", "Miguel Angel Suarez", "Samuel Queste", "Laurent Robert", "Ludovic Gauthier-Manuel", "Mathieu Chauvet"].map((name) => author(name, "other")), author("Nadège Courjal", "corresponding", "FEMTO-ST Institute, UMR CNRS 6174, University of Franche-Comté")],
    abstractZh: "作者在悬空薄膜铌酸锂脊形波导中利用 I 型双折射相位匹配实现二次谐波产生。器件具有两个泵浦相位匹配点，温度变化25 ℃即可覆盖1350–1650 nm约300 nm的调谐范围；实验获得约150 nm的通信波段响应、超过40 % W⁻¹ cm⁻²的归一化效率和约0.8 dB的耦合损耗。",
    insight: "悬空脊波导以双折射相位匹配实现 300 nm 温度调谐。",
    keywords: ["二次谐波", "双折射相位匹配", "悬空波导", "宽带调谐", "TFLN"], doi: "10.1063/5.0230481", sourceUrl: "https://doi.org/10.1063/5.0230481",
  }),
  paper({
    slug: "broadband-qpm-shg-mgo-ppln-communications-band",
    title: "Broadband quasi-phase-matched second-harmonic generation in MgO-doped periodically poled LiNbO3 at the communications band",
    titleZh: "通信波段 MgO 掺杂周期极化铌酸锂中的宽带准相位匹配二次谐波产生",
    category: bulk, subcategory: "体材料 PPLN",
    classifications: [{ category: bulk, subcategory: "体材料 PPLN" }, { category: ln, subcategory: "PPLN 非线性" }, { category: ln, subcategory: "宽带频率转换" }],
    journal: "Optics Letters", published: "2002.06",
    authors: ["Nan Ei Yu", "Jung Hoon Ro", "Myoungsik Cha", "Sunao Kurimura", "Takunori Taira"],
    institutions: ["Department of Physics and Research Center for Dielectric and Advanced Matter Physics, Pusan National University", "Institute for Molecular Science"],
    authorDetails: [author("Nan Ei Yu", "first", "Department of Physics and Research Center for Dielectric and Advanced Matter Physics, Pusan National University"), ...["Jung Hoon Ro", "Myoungsik Cha", "Sunao Kurimura"].map((name) => author(name, "other")), author("Takunori Taira", "corresponding", "Institute for Molecular Science", [], "论文首页未标通讯作者，按末位作者规则暂定")],
    abstractZh: "研究利用 MgO 掺杂周期极化铌酸锂中的 d31 非线性系数与群速度匹配，在通信波段实现 I 型宽带准相位匹配二次谐波产生。以1566 nm为中心获得52 nm的基频接受带宽，显著高于采用 d33 的常规方案约1.3 nm带宽，展示了群速度工程对宽带频率转换的作用。",
    insight: "借助 d31 群速度匹配，将通信波段 SHG 带宽拓展至 52 nm。",
    keywords: ["MgO:PPLN", "准相位匹配", "群速度匹配", "二次谐波", "通信波段"], doi: "10.1364/OL.27.001046", sourceUrl: "https://doi.org/10.1364/OL.27.001046",
  }),
  paper({
    slug: "wafer-scale-periodic-poling-thin-film-lithium-niobate",
    title: "Wafer-Scale Periodic Poling of Thin-Film Lithium Niobate",
    titleZh: "薄膜铌酸锂的晶圆级周期极化",
    category: ln, subcategory: "制造与周期极化",
    classifications: [{ category: ln, subcategory: "制造与周期极化" }, { category: ln, subcategory: "PPLN 非线性" }],
    journal: "Materials", published: "2024.04",
    authors: ["Mengwen Chen", "Chenyu Wang", "Xiao-Hui Tian", "Jie Tang", "Xiaowen Gu", "Guang Qian", "Kunpeng Jia", "Hua-Ying Liu", "Zhong Yan", "Zhilin Ye", "Zhijun Yin", "Shi-Ning Zhu", "Zhenda Xie"],
    institutions: ["National Laboratory of Solid State Microstructures, Nanjing University"],
    authorDetails: [author("Mengwen Chen", "first", "National Laboratory of Solid State Microstructures, Nanjing University"), author("Chenyu Wang", "cofirst", "National Laboratory of Solid State Microstructures, Nanjing University"), author("Xiao-Hui Tian", "corresponding", "National Laboratory of Solid State Microstructures, Nanjing University"), ...["Jie Tang", "Xiaowen Gu", "Guang Qian", "Kunpeng Jia", "Hua-Ying Liu", "Zhong Yan", "Zhilin Ye", "Zhijun Yin", "Shi-Ning Zhu"].map((name) => author(name, "other")), author("Zhenda Xie", "corresponding", "National Laboratory of Solid State Microstructures, Nanjing University")],
    abstractZh: "作者展示四英寸薄膜铌酸锂晶圆上的大面积周期极化工艺，可在一次操作中实现0.5–10.17 mm反转长度、约1 cm²极化面积以及4.38–5.51 μm周期。实验报告100%的极化成功率和平均98%的高质量区域占比，说明该方法适用于高通量、可扩展的薄膜铌酸锂非线性器件制造。",
    insight: "一次操作实现四英寸晶圆级高一致性周期极化。",
    keywords: ["晶圆级极化", "PPLN", "畴反转", "薄膜铌酸锂", "规模制造"], doi: "10.3390/ma17081720", sourceUrl: "https://doi.org/10.3390/ma17081720",
  }),
  paper({
    slug: "multiplexed-quantum-frequency-conversion",
    title: "Multiplexed quantum frequency conversion",
    titleZh: "多路复用量子频率转换",
    category: ln, subcategory: "量子频率转换",
    classifications: [{ category: ln, subcategory: "量子频率转换" }, { category: ln, subcategory: "PPLN 非线性" }, { category: ln, subcategory: "多通道频率转换" }],
    journal: "Optics Letters", published: "2024.10",
    authors: ["Chao Tang", "Zhaohui Ma", "Zhan Li", "Yongmeng Sua", "Yu-Ping Huang"],
    institutions: ["Department of Physics and Center for Quantum Science and Engineering, Stevens Institute of Technology"],
    authorDetails: [author("Chao Tang", "first", "Department of Physics and Center for Quantum Science and Engineering, Stevens Institute of Technology"), ...["Zhaohui Ma", "Zhan Li", "Yongmeng Sua"].map((name) => author(name, "other")), author("Yu-Ping Huang", "corresponding", "Department of Physics and Center for Quantum Science and Engineering, Stevens Institute of Technology")],
    abstractZh: "研究证明单一泵浦可在一个周期极化铌酸锂波导中同时完成多个信号通道的量子频率转换。作者设计三峰准相位匹配响应并演示通信波段多路上转换，各通道内部转换效率最高达到73.6%。该方案减少多通道量子接口所需的泵浦与器件数量。",
    insight: "单泵驱动三峰 PPLN，同时完成多通道量子频率转换。",
    keywords: ["量子频率转换", "多路复用", "PPLN", "单泵浦", "准相位匹配"], doi: "10.1364/OL.537834", sourceUrl: "https://doi.org/10.1364/OL.537834",
  }),
  paper({
    slug: "simultaneous-broadband-quadratic-processes-lnoi-waveguides",
    title: "Simultaneous broadband nonlinear quadratic processes in lithium niobate on insulator waveguides",
    titleZh: "绝缘体上铌酸锂波导中的同步宽带二阶非线性过程",
    category: ln, subcategory: "宽带频率转换",
    classifications: [{ category: ln, subcategory: "宽带频率转换" }, { category: ln, subcategory: "二阶非线性与频率转换" }],
    journal: "Optics Express", published: "2026.02",
    authors: ["Halvor R. Fergestad", "Katia Gallo"],
    institutions: ["Nonlinear and Quantum Photonics Group, Department of Physics, KTH Royal Institute of Technology"],
    authorDetails: [author("Halvor R. Fergestad", "first_corresponding", "Nonlinear and Quantum Photonics Group, Department of Physics, KTH Royal Institute of Technology"), author("Katia Gallo", "other", "Nonlinear and Quantum Photonics Group, Department of Physics, KTH Royal Institute of Technology")],
    abstractZh: "作者通过色散工程设计 X 切 LNOI 波导，以支持同步宽带差频与倍频过程。计算显示差频带宽可达258–433 nm；空气包层方案可同时获得约103 nm的倍频带宽和433 nm的差频带宽，预期归一化效率约700 % W⁻¹ cm⁻²。研究还指出侧壁角度是维持宽带相位匹配的关键制造参数。",
    insight: "色散工程让同一 LNOI 波导同步支持宽带倍频与差频。",
    keywords: ["LNOI", "差频", "二次谐波", "色散工程", "宽带相位匹配"], doi: "10.1364/OE.585355", sourceUrl: "https://doi.org/10.1364/OE.585355",
  }),
  paper({
    slug: "doubly-phase-matched-wavelength-conversion-tfln",
    title: "Doubly Phase Matched Wavelength Conversion in Thin-film Lithium Niobate Nanowaveguides",
    titleZh: "薄膜铌酸锂纳米波导中的双重相位匹配波长转换",
    category: ln, subcategory: "多通道频率转换",
    classifications: [{ category: ln, subcategory: "多通道频率转换" }, { category: ln, subcategory: "PPLN 非线性" }],
    journal: "CLEO 2023", published: "2023.05",
    authors: ["Chao Tang", "Shen-yu Zhu", "Zhao-hui Ma", "Zhan Li", "Yong Meng Sua", "Yu-Ping Huang"],
    institutions: ["Department of Physics and Center for Quantum Science and Engineering, Stevens Institute of Technology"],
    authorDetails: [author("Chao Tang", "first", "Department of Physics and Center for Quantum Science and Engineering, Stevens Institute of Technology"), ...["Shen-yu Zhu", "Zhao-hui Ma", "Zhan Li", "Yong Meng Sua"].map((name) => author(name, "other")), author("Yu-Ping Huang", "corresponding", "Department of Physics and Center for Quantum Science and Engineering, Stevens Institute of Technology")],
    abstractZh: "该会议论文通过设计周期极化结构，在薄膜铌酸锂纳米波导中形成双峰准相位匹配二次谐波响应，从而支持两个波长通道的转换。结果展示了用同一纳米波导开展多通道非线性处理的可行性，为复用量子与经典频率接口提供器件基础。",
    insight: "工程化极化图案产生双峰相位匹配，支持双通道波长转换。",
    keywords: ["双重相位匹配", "TFLN", "PPLN", "多通道", "波长转换"], doi: "10.1364/CLEO_SI.2023.STu3N.2", sourceUrl: "https://doi.org/10.1364/CLEO_SI.2023.STu3N.2",
  }),
  paper({
    slug: "type-i-qpm-blue-shg-ppln",
    title: "Type I quasi-phase-matched blue second harmonic generation with different polarizations in periodically poled LiNbO3",
    titleZh: "周期极化铌酸锂中不同偏振下的 I 型准相位匹配蓝光二次谐波产生",
    category: bulk, subcategory: "体材料 PPLN",
    classifications: [{ category: bulk, subcategory: "体材料 PPLN" }, { category: ln, subcategory: "PPLN 非线性" }, { category: bulk, subcategory: "二阶非线性频率转换" }],
    journal: "Optics & Laser Technology", published: "2006.02",
    authors: ["Yuping Chen", "Rui Wu", "Xianglong Zeng", "Yuxing Xia", "Xianfeng Chen"],
    institutions: ["Institute of Optics & Photonics, Department of Physics, State Key Laboratory on Fiber Optic Local Area Communication Networks and Advanced Optical Communication Systems, Shanghai Jiao Tong University"],
    authorDetails: [author("Yuping Chen", "first_corresponding", "Institute of Optics & Photonics, Department of Physics, State Key Laboratory on Fiber Optic Local Area Communication Networks and Advanced Optical Communication Systems, Shanghai Jiao Tong University"), ...["Rui Wu", "Xianglong Zeng", "Yuxing Xia", "Xianfeng Chen"].map((name) => author(name, "other"))],
    abstractZh: "研究在周期极化铌酸锂中实验实现0.473 μm蓝光的一级 I 型准相位匹配二次谐波产生，最高转换效率达到45.6%。作者比较不同偏振配置的温度与波长接受带宽，分析偏振对准相位匹配和转换效率的影响，为蓝光频率转换器件设计提供实验依据。",
    insight: "I 型一级准相位匹配实现 0.473 μm 蓝光与 45.6% 转换。",
    keywords: ["蓝光倍频", "I型相位匹配", "PPLN", "偏振", "二次谐波"], doi: "10.1016/j.optlastec.2004.11.001", sourceUrl: "https://doi.org/10.1016/j.optlastec.2004.11.001",
  }),
];

const doiKeys = new Set(existing.map((item) => item.doi?.toLowerCase()).filter(Boolean));
const titleKeys = new Set(existing.map((item) => item.title.toLowerCase()));
const next = [...existing];
for (const item of imports) if ((!item.doi || !doiKeys.has(item.doi.toLowerCase())) && !titleKeys.has(item.title.toLowerCase())) next.push(item);
await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Imported ${next.length - existing.length} PPLN/LN papers; total ${next.length}.`);
