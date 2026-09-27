import assert from "node:assert/strict";
import { fileExt, formatFileSize, isViewableInline, resolveMime } from "./files";

assert.equal(fileExt("Report v2.PDF"), "pdf");
assert.equal(fileExt("noext"), "");

assert.equal(resolveMime("a.pdf"), "application/pdf");
assert.equal(resolveMime("a.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
assert.equal(resolveMime("a.png"), "image/png");
// Active content must never be served from our origin.
assert.equal(resolveMime("evil.html"), null);
assert.equal(resolveMime("evil.js"), null);
assert.equal(resolveMime("payload"), null);
// SVG may upload but must always download, never render inline.
assert.equal(resolveMime("logo.svg"), "image/svg+xml");
assert.equal(isViewableInline("logo.svg"), false);
// Client-claimed type is only trusted when the extension is unknown.
assert.equal(resolveMime("data.bin", "application/pdf"), "application/pdf");
assert.equal(resolveMime("data.bin", "text/javascript"), "application/octet-stream");

assert.equal(isViewableInline("a.pdf"), true);
assert.equal(isViewableInline("a.png"), true);
assert.equal(isViewableInline("a.xlsx"), false);
assert.equal(isViewableInline("a.html"), false);
assert.equal(isViewableInline(null), false);

assert.equal(formatFileSize(512), "512 B");
assert.equal(formatFileSize(2048), "2 KB");
assert.equal(formatFileSize(2 * 1024 * 1024), "2.0 MB");
assert.equal(formatFileSize(null), "");

console.log("files.ts checks passed");
