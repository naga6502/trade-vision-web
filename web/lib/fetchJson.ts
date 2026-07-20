// Safe JSON fetch: never calls response.json() on a non-JSON body (Next dev
// returns an HTML "compiling"/error page for a route that is mid-recompile,
// which would otherwise throw `Unexpected token '<' ... is not valid JSON`).
// Throws a clean error instead so callers can show a friendly message.

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const ctype = res.headers.get("content-type") ?? "";
  const isJson = ctype.includes("application/json");
  if (!res.ok || !isJson) {
    // When the server replied with JSON (e.g. a 502 { error }), surface its
    // message; when it replied with HTML (dev recompile / 500 page) just give
    // the status so we never throw the raw "<!DOCTYPE ... is not valid JSON".
    let detail = "";
    if (isJson) {
      try {
        const j = JSON.parse(text);
        if (j && typeof j.error === "string") detail = `: ${j.error}`;
      } catch {
        /* ignore unparseable body */
      }
    }
    throw new Error(`Request failed (${res.status})${detail}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
}
