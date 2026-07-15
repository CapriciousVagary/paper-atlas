import { SiteHeader } from "../components/SiteHeader";
import SearchClient from "./SearchClient";

export default function SearchPage() {
  return <main><SiteHeader active="search" /><SearchClient /></main>;
}
