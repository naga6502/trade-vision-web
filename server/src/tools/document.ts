import { fetchNSE } from "../nse/fetch.js";

export interface DocumentMeta {
  url: string;
  contentType: string | null;
  /** True when the payload is text we could inline; false for binary (PDF). */
  isText: boolean;
  /** First ~4KB for text payloads; null for binary. */
  snippet: string | null;
  /** For binary payloads, the byte length (best-effort). */
  length: number | null;
}

/**
 * Fetch a document (DRHP, RHP, circular, report) and report its metadata.
 * NSE/BSE documents are usually PDFs; we surface a link + content-type and,
 * for text payloads, a snippet. We never guess the document URL — callers
 * supply it (e.g. from get_ipo_prospectus).
 */
export async function downloadDocument(url: string): Promise<DocumentMeta> {
  if (url.includes("nseindia.com")) {
    const text = await fetchNSE<string>(url, { ttlMs: 0 });
    if (typeof text === "string") {
      return { url, contentType: "text/plain", isText: true, snippet: text.slice(0, 4000), length: text.length };
    }
    return { url, contentType: "application/octet-stream", isText: false, snippet: null, length: null };
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(30000),
  });
  const ct = res.headers.get("content-type");
  if (ct && (ct.includes("application/json") || ct.includes("text/"))) {
    const body = await res.text();
    return { url, contentType: ct, isText: true, snippet: body.slice(0, 4000), length: body.length };
  }
  const buf = await res.arrayBuffer().catch(() => null);
  return {
    url,
    contentType: ct,
    isText: false,
    snippet: null,
    length: buf ? buf.byteLength : null,
  };
}
