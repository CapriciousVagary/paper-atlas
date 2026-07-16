import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/ensure";
import { papers } from "../../../../db/schema";

export async function POST(request: Request) {
  await ensureDatabase();
  const payload = await request.json() as { slug?: string; pdfKey?: string | null; figureKeys?: string[]; keyFigureIndex?: number; figureCaption?: string };
  const slug = String(payload.slug ?? "").trim();
  const token = request.headers.get("x-upload-token") ?? "";
  const [paper] = await getDb().select({ uploadToken: papers.uploadToken }).from(papers).where(eq(papers.slug, slug)).limit(1);
  if (!paper?.uploadToken || token !== paper.uploadToken) return Response.json({ error: "上传凭证无效" }, { status: 401 });
  const prefix = `papers/${slug}/`;
  const pdfKey = payload.pdfKey && payload.pdfKey.startsWith(`${prefix}paper-`) ? payload.pdfKey : null;
  const figureKeys = (Array.isArray(payload.figureKeys) ? payload.figureKeys : []).filter((key) => typeof key === "string" && key.startsWith(`${prefix}figures/`)).slice(0, 8);
  const keyIndex = Math.min(Math.max(Number(payload.keyFigureIndex) || 0, 0), Math.max(figureKeys.length - 1, 0));
  await getDb().update(papers).set({ fileKey: pdfKey, figureKeys: JSON.stringify(figureKeys), keyFigureKey: figureKeys[keyIndex] ?? null, figureCaption: String(payload.figureCaption ?? "").trim().slice(0, 500) }).where(eq(papers.slug, slug));
  return Response.json({ ok: true, pdf: Boolean(pdfKey), figureCount: figureKeys.length });
}
