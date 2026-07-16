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
export declare function downloadDocument(url: string): Promise<DocumentMeta>;
