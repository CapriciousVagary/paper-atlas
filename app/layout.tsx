import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: { default: "PhotonicsX × RIQT Literature Atlas", template: "%s · PhotonicsX × RIQT" },
    description: "复旦大学未来信息创新学院 PhotonicsX 与香港理工大学量子技术研究中心 RIQT 联合文献知识库",
    openGraph: { title: "PhotonicsX × RIQT Literature Atlas", description: "把读过的论文，变成可检索的集体知识。", type: "website", images: [{ url: imageUrl, width: 1536, height: 1024, alt: "PhotonicsX × RIQT Literature Atlas" }] },
    twitter: { card: "summary_large_image", title: "PhotonicsX × RIQT Literature Atlas", description: "复旦大学 PhotonicsX × 香港理工大学 RIQT 联合文献库", images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
