type ChunkUploadOptions = {
  file: File;
  slug: string;
  kind: "pdf" | "figure";
  uploadToken?: string;
  adminKey?: string;
  onProgress?: (progress: number) => void;
};

const CHUNK_BYTES = 512 * 1024;

export async function uploadFileInChunks({ file, slug, kind, uploadToken, adminKey, onProgress }: ChunkUploadOptions) {
  const fileId = crypto.randomUUID();
  const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  const authHeaders: Record<string, string> = {};
  if (uploadToken) authHeaders["x-upload-token"] = uploadToken;
  if (adminKey) authHeaders["x-admin-key"] = adminKey;

  for (let index = 0; index < totalParts; index += 1) {
    const response = await fetch(`/api/uploads/chunk?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { ...authHeaders, "x-file-id": fileId, "x-part-index": String(index), "x-total-parts": String(totalParts) },
      body: file.slice(index * CHUNK_BYTES, Math.min(file.size, (index + 1) * CHUNK_BYTES)),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? `文件分块 ${index + 1}/${totalParts} 上传失败`);
    }
    onProgress?.((index + 1) / (totalParts + 1));
  }

  const finalize = await fetch(`/api/uploads/chunk?slug=${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, totalParts, totalBytes: file.size, filename: file.name, contentType: file.type, kind }),
  });
  const data = await finalize.json().catch(() => ({}));
  if (!finalize.ok || !data.key) throw new Error(data.error ?? "文件合并保存失败");
  onProgress?.(1);
  return data.key as string;
}
