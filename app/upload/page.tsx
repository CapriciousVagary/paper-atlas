import { SiteHeader } from "../components/SiteHeader";
import UploadForm from "./UploadForm";

export default function UploadPage() {
  return <main><SiteHeader active="upload" /><UploadForm /></main>;
}
