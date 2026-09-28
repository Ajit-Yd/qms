// Generates real, openable files so the seed exercises the real upload/view/download
// paths (base64 in Postgres, same fields the multipart API writes).
// A minimal PDF needs no dependency: fixed object offsets are computed from the body.

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Single-page A4 PDF with a title and body lines. Valid enough for any viewer. */
export function makePdf(title: string, lines: string[] = []): Buffer {
  const content = [
    "BT",
    "/F1 18 Tf",
    "72 760 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 11 Tf",
    ...lines.flatMap((line) => ["0 -20 Td", `(${escapePdfText(line)}) Tj`]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

/** Smallest valid 1x1 PNG. */
export function makePng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

export function makeCsv(rows: string[][]): Buffer {
  return Buffer.from(rows.map((row) => row.join(",")).join("\n"), "utf8");
}
