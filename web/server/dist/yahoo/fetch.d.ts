import { type HttpFetchOptions } from "../http.js";
export declare const YAHOO_USER_AGENT: string;
export declare function fetchYahoo(url: string, options?: HttpFetchOptions & {
    headers?: Record<string, string>;
}): Promise<string | null>;
