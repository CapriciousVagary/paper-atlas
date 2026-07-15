import type { Metadata } from "next";
import Dashboard from "./components/Dashboard";

export const metadata: Metadata = {
  title: "文献库",
  description: "Q-chip 课题组共享文献知识库",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const query = await searchParams;
  return <Dashboard initialQuery={query.q ?? ""} initialCategory={query.category ?? "全部方向"} />;
}
