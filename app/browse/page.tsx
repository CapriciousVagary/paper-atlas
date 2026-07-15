import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import BrowseClient from "./BrowseClient";

export const metadata: Metadata = { title: "分类浏览", description: "按研究方向、小类、标签与作者浏览文献" };

type Query = { category?: string; subcategory?: string; tag?: string; author?: string; institution?: string; sort?: string; page?: string };

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  return <main><SiteHeader active="browse" /><BrowseClient initialQuery={query} /></main>;
}
