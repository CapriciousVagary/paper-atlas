import { SiteHeader } from "../components/SiteHeader";
import IndexClient from "./IndexClient";

export default function IndexPage() {
  return <main><SiteHeader active="index" /><IndexClient /></main>;
}
