// ponytail: files live as base64 in Postgres (4MB cap) — fine for QMS evidence,
// move to blob storage (S3/Vercel Blob) if you need large CAD/video uploads.

export const MAX_FILE_BYTES = 4 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  // documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  // images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  // archives
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",
  gz: "application/gzip",
};

/** Served with `Content-Disposition: inline` — safe to render in-browser. */
const INLINE_EXT = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp", "txt", "csv"]);

/** Active content: renders/executes in our origin. Never serve from here. */
const ACTIVE_EXT = new Set(["html", "htm", "xhtml", "js", "mjs", "mhtml", "xml", "swf", "jar", "vbs"]);

export function fileExt(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : "";
}

/** Resolves a safe content type, or null when the extension is not allowed. */
export function resolveMime(fileName: string, claimed?: string | null): string | null {
  const ext = fileExt(fileName);
  if (!ext || ACTIVE_EXT.has(ext)) return null;
  if (MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  if (claimed && claimed !== "application/octet-stream" && !claimed.includes("javascript")) return claimed;
  return "application/octet-stream";
}

export function isViewableInline(fileName: string | null | undefined): boolean {
  return !!fileName && INLINE_EXT.has(fileExt(fileName));
}

export const fileMetaSelect = {
  fileName: true,
  fileType: true,
  fileSize: true,
} as const;

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
