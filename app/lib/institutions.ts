export type InstitutionOption = { fullName: string; aliases: string[] };

export const knownInstitutions: InstitutionOption[] = [
  { fullName: "Fudan University", aliases: ["复旦大学", "FDU"] },
  { fullName: "The Hong Kong Polytechnic University", aliases: ["香港理工大学", "PolyU", "HKPolyU"] },
  { fullName: "Research Institute for Quantum Technology, The Hong Kong Polytechnic University", aliases: ["香港理工大学量子技术研究中心", "RIQT"] },
  { fullName: "Peking University", aliases: ["北京大学", "北大", "PKU"] },
  { fullName: "Shanghai Jiao Tong University", aliases: ["上海交通大学", "上海交大", "SJTU"] },
  { fullName: "Huazhong University of Science and Technology", aliases: ["华中科技大学", "华科", "HUST"] },
  { fullName: "The Chinese University of Hong Kong", aliases: ["香港中文大学", "港中大", "CUHK"] },
  { fullName: "Tsinghua University", aliases: ["清华大学", "清华", "THU"] },
  { fullName: "Zhejiang University", aliases: ["浙江大学", "浙大", "ZJU"] },
  { fullName: "The University of Tokyo", aliases: ["东京大学", "UTokyo"] },
  { fullName: "The University of Texas at Austin", aliases: ["德克萨斯大学奥斯汀分校", "UT Austin", "UT-Austin"] },
  { fullName: "King Abdullah University of Science and Technology", aliases: ["阿卜杜拉国王科技大学", "KAUST"] },
  { fullName: "Stanford University", aliases: ["斯坦福大学", "Stanford"] },
  { fullName: "Stevens Institute of Technology", aliases: ["史蒂文斯理工学院", "Stevens"] },
  { fullName: "Nanyang Technological University", aliases: ["南洋理工大学", "NTU"] },
  { fullName: "Massachusetts Institute of Technology", aliases: ["麻省理工学院", "MIT"] },
  { fullName: "University of Oxford", aliases: ["牛津大学", "Oxford"] },
  { fullName: "University of Cambridge", aliases: ["剑桥大学", "Cambridge"] },
  { fullName: "Lightelligence Pte. Ltd.", aliases: ["光子算数", "Lightelligence"] },
  { fullName: "Quantum Computing Inc.", aliases: ["QCi", "Quantum Computing Incorporated"] },
];

export function normalizeInstitution(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s.,()&'’\-–—]/g, "");
}

export function canonicalizeInstitution(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const needle = normalizeInstitution(trimmed);
  const match = knownInstitutions.find((item) => [item.fullName, ...item.aliases].some((name) => normalizeInstitution(name) === needle));
  return match?.fullName ?? trimmed;
}

export function mergeInstitutionOptions(values: string[], stored: InstitutionOption[] = []) {
  const map = new Map<string, InstitutionOption>();
  for (const item of [...knownInstitutions, ...stored, ...values.map((fullName) => ({ fullName, aliases: [] }))]) {
    const fullName = canonicalizeInstitution(item.fullName);
    if (!fullName) continue;
    const key = normalizeInstitution(fullName);
    const existing = map.get(key);
    map.set(key, { fullName, aliases: [...new Set([...(existing?.aliases ?? []), ...item.aliases])] });
  }
  return [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, "en"));
}
