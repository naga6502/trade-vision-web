// Reusable client-side CSV export. No dependencies — builds a Blob and
// triggers a download. A UTF-8 BOM is prepended so Excel renders Indian
// stock names (and any non-ASCII text) correctly instead of mojibake.

export type CsvCell = string | number | null | undefined;

export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const escape = (v: CsvCell): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = "﻿" + rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
