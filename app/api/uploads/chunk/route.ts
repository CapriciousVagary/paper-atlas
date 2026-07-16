import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensureDatabase } from "../../../../db/ensure";
import { papers } from "../../../../db/schema";

const MAX_CHUNK_BYTES = 700 * 1024;
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_FIGURE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FIGURE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeId(value: string) { return /^[a-zA-Z0-9-]{8,80}$/.test(value) ? value : ""; }
function safeFilename(name: string) { return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file"; }

async function authorize(request: Request, slug: string) {
  const expectedAdmin = (env as unknown as { ADMIN_REVIEW_KEY?: string }).ADMIN_REVIEW_KEY;
  if (expectedAdmin && request.headers.get("x-admin-key") === expectedAdmin) return true;
  const token = request.headers.get("x-upload-token");
  if (!token) return false;
  const [paper] = await getDb().select({ uploadToken: papers.uploadToken }).from(papers).where(eq(papers.slug, slug)).limit(1);
  return Boolean(paper?.uploadToken && paper.uploadToken === token);
}

export async function POST(request: Request) {
  await ensureDatabase();
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug || !(await authorize(request, slug))) return Response.json({ error: "上传凭证无效" }, { status: 401 });
  const fileId = safeId(request.headers.get("x-file-id") ?? "");
  const partIndex = Number(request.headers.get("x-part-index"));
  const totalParts = Number(request.headers.get("x-total-parts"));
  if (!fileId || !Number.isInteger(partIndex) || partIndex < 0 || !Number.isInteger(totalParts) || totalParts < 1 || totalParts > 120 || partIndex >= totalParts) return Response.json({ error: "文件分块参数无效" }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_CHUNK_BYTES) return Response.json({ error: "单个文件分块过大" }, { status: 413 });
  await (env as unknown as { PAPERS: R2Bucket }).PAPERS.put(`tmp/uploads/${slug}/${fileId}/${partIndex}`, bytes, { httpMetadata: { contentType: "application/octet-stream" } });
  return Response.json({ ok: true, partIndex });
}

export async function PUT(request: Request) {
  await ensureDatabase();
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug || !(await authorize(request, slug))) return Response.json({ error: "上传凭证无效" }, { status: 401 });
  const payload = await request.json() as { fileId?: string; totalParts?: number; totalBytes?: number; filename?: string; contentType?: string; kind?: "pdf" | "figure" };
  const fileId = safeId(String(payload.fileId ?? ""));
  const totalParts = Number(payload.totalParts);
  const totalBytes = Number(payload.totalBytes);
  const filename = String(payload.filename ?? "file");
  const contentType = String(payload.contentType ?? "application/octet-stream");
  const kind = payload.kind;
  const limit = kind === "pdf" ? MAX_PDF_BYTES : MAX_FIGURE_BYTES;
  if (!fileId || !["pdf", "figure"].includes(kind ?? "") || !Number.isInteger(totalParts) || totalParts < 1 || totalParts > 120 || !Number.isFinite(totalBytes) || totalBytes < 1 || totalBytes > limit) return Response.json({ error: "文件合并参数无效" }, { status: 400 });
  if (kind === "pdf" && contentType !== "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) return Response.json({ error: "论文文件必须是 PDF" }, { status: 400 });
  if (kind === "figure" && !ALLOWED_FIGURE_TYPES.has(contentType)) return Response.json({ error: "图片仅支持 JPG、PNG 或 WebP" }, { status: 400 });

  const storage = (env as unknown as { PAPERS: R2Bucket }).PAPERS;
  const parts: Uint8Array[] = [];
  let actualBytes = 0;
  for (let index = 0; index < totalParts; index += 1) {
    const object = await storage.get(`tmp/uploads/${slug}/${fileId}/${index}`);
    if (!object) return Response.json({ error: `缺少文件分块 ${index + 1}/${totalParts}` }, { status: 409 });
    const bytes = new Uint8Array(await object.arrayBuffer()); parts.push(bytes); actualBytes += bytes.byteLength;
  }
  if (actualBytes !== totalBytes) return Response.json({ error: "文件分块大小校验失败" }, { status: 409 });
  const combined = new Uint8Array(actualBytes);
  let offset = 0; for (const part of parts) { combined.set(part, offset); offset += part.byteLength; }
  const key = kind === "pdf" ? `papers/${slug}/paper-${fileId}-${safeFilename(filename)}` : `papers/${slug}/figures/editor-${fileId}-${safeFilename(filename)}`;
  await storage.put(key, combined, { httpMetadata: { contentType }, customMetadata: { slug, originalName: filename, source: "chunked-upload" } });
  await Promise.all(Array.from({ length: totalParts }, (_, index) => storage.delete(`tmp/uploads/${slug}/${fileId}/${index}`)));
  return Response.json({ ok: true, key, bytes: actualBytes });
}
