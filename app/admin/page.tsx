import { SiteHeader } from "../components/SiteHeader";
import AdminReview from "./AdminReview";

export default function AdminPage() {
  return <main><SiteHeader active="admin" /><AdminReview /></main>;
}
