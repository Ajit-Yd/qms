import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { makeCsv, makePdf } from "./qms-files";
import { auditFiles, capaFiles, documentFiles, ncFiles, trainingFiles } from "./qms-seed-files";

// A PDF is only useful here if a real reader can open it, so check the structural
// invariants a reader relies on: header, xref offsets, trailer, EOF.
function assertValidPdf(buf: Buffer, label: string) {
  const text = buf.toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"), `${label}: missing header`);
  assert.ok(text.trimEnd().endsWith("%%EOF"), `${label}: missing EOF`);

  const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
  assert.ok(Number.isInteger(startxref) && startxref > 0, `${label}: bad startxref`);
  assert.ok(text.slice(startxref).startsWith("xref"), `${label}: startxref does not point at xref`);

  // Every object header in the table must land exactly on its "N 0 obj" marker.
  const table = text.slice(startxref).match(/^(\d{10}) 00000 n /gm) ?? [];
  assert.ok(table.length >= 5, `${label}: expected >=5 xref entries, got ${table.length}`);
  table.forEach((row, i) => {
    const offset = Number(row.slice(0, 10));
    assert.ok(
      text.slice(offset).startsWith(`${i + 1} 0 obj`),
      `${label}: xref entry ${i + 1} points to "${text.slice(offset, offset + 12).replace(/\n/g, "\\n")}"`
    );
  });
  assert.ok(text.includes("/Root 1 0 R"), `${label}: trailer has no root`);
}

const sample = makePdf("Test Document", ["Line one", "Line two (with parens)"]);
assertValidPdf(sample, "sample pdf");
assert.deepEqual(makePdf("Escaping", ["a\\b (c)"]).toString("latin1").includes("a\\\\b \\(c\\)"), true);

// Every module's seeded attachment is structurally openable, not just documents.
const allFiles = {
  documents: documentFiles,
  capa: capaFiles,
  nonconformances: ncFiles,
  audits: auditFiles,
  training: trainingFiles,
};
const counts = { documents: 15, capa: 12, nonconformances: 12, audits: 8, training: 12 };
let pdfs = 0;
for (const [module, files] of Object.entries(allFiles)) {
  assert.equal(Object.keys(files).length, counts[module as keyof typeof counts], `${module}: expected ${counts[module as keyof typeof counts]} files`);
  for (const [id, file] of Object.entries(files)) {
    const buf = Buffer.from(file.fileData, "base64");
    assert.equal(buf.byteLength, file.fileSize, `${id}: fileSize does not match fileData`);
    assert.ok(buf.byteLength > 0, `${id}: empty file`);
    const allowedTypes = new Set(["application/pdf", "image/png", "text/csv"]);
    assert.ok(allowedTypes.has(file.fileType), `${id}: unexpected type ${file.fileType}`);
    if (file.fileType === "application/pdf") {
      assertValidPdf(buf, id);
      pdfs++;
    } else if (file.fileType === "image/png") {
      assert.ok(buf.toString("latin1").startsWith("\x89PNG\r\n\x1a\n"), `${id}: bad PNG magic`);
    }
  }
}
assert.equal(pdfs, 15 + 11 + 9 + 7 + 12, "expected 54 seeded PDFs");

const csv = makeCsv([["a", "b"], ["1", "2"]]);
assert.equal(csv.toString("utf8"), "a,b\n1,2");

// Leave one on disk so it can be eyeballed in a real viewer.
writeFileSync("seed-sample.pdf", sample);
console.log(`qms-files.ts checks passed (${pdfs} valid PDFs + PNGs across all modules)`);
