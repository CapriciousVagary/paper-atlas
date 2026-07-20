import { ensureDatabase } from "../../../db/ensure";
import { loadMetadataCatalog } from "../../lib/metadata-catalog";

export async function GET() {
  await ensureDatabase();
  return Response.json(await loadMetadataCatalog(), { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
