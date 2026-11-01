import type { FormFlowConfig, FormFlowEvent } from "./types";

const enc = encodeURIComponent;

/** `<baseUrl>/embed/<slug>?native=1&uid=&variant=&lang=&answers=1&close=1&hidden.x=&prefill.y=`; every value URL-encoded, keys sorted. */
export function buildFormUrl(c: FormFlowConfig): string {
  const slug = c.slug ?? c.formId;
  if (!slug) throw new Error("FormFlow: slug is required");
  const base = c.baseUrl.replace(/\/+$/, "");
  const q: string[] = ["native=1"];
  if (c.uid) q.push(`uid=${enc(c.uid)}`);
  if (c.uidSignature) q.push(`uid_sig=${enc(c.uidSignature)}`);
  if (c.variant) q.push(`variant=${enc(c.variant)}`);
  if (c.locale) q.push(`lang=${enc(c.locale)}`);
  if (c.includeAnswers) q.push("answers=1");
  if (c.showClose) q.push("close=1");
  if (c.resume === false) q.push("resume=0");
  const sid = c.posthogSessionId ?? c.posthog?.getSessionId?.();
  const did = c.posthogDistinctId ?? c.posthog?.getDistinctId?.();
  if (sid) q.push(`ph_session=${enc(sid)}`);
  if (did) q.push(`ph_distinct=${enc(did)}`);
  const a = c.appearance;
  if (a?.colorScheme) q.push(`scheme=${enc(a.colorScheme)}`);
  if (a?.accent) q.push(`accent=${enc(a.accent)}`);
  if (a?.fontFamily) q.push(`font=${enc(a.fontFamily)}`);
  for (const [k, v] of Object.entries(c.hidden ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))) q.push(`hidden.${enc(k)}=${enc(String(v))}`);
  for (const [k, v] of Object.entries(c.prefill ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))) q.push(`prefill.${enc(k)}=${enc(String(v))}`);
  for (const [k, v] of Object.entries(c.attributes ?? {}).sort(([x], [y]) => (x < y ? -1 : 1))) q.push(`attrs.${enc(k)}=${enc(String(v))}`);
  return `${base}/embed/${enc(slug)}?${q.join("&")}`;
}

const hostOf = (u: string): string | null => { const m = /^https?:\/\/([^/?#]+)/i.exec(u); return m ? m[1].toLowerCase() : null; };

/** Only the configured host (and about:blank) may load inside the WebView; everything else opens outside. */
export function isAllowedNavigation(url: string, baseUrl: string): boolean {
  if (url === "about:blank") return true;
  const h = hostOf(url);
  return h !== null && h === hostOf(baseUrl);
}

const TYPES = new Set(["request", "ready", "view", "start", "step", "answer", "complete", "submit", "progress", "close", "error", "resize"]);

/** Parse a WebView message. Returns null for anything that is not a FormFlow message. `submit` is folded into `complete`; `resize` is dropped. */
export function parseEvent(raw: unknown): FormFlowEvent | null {
  let o: unknown = raw;
  if (typeof raw === "string") { try { o = JSON.parse(raw); } catch { return null; } }
  if (!o || typeof o !== "object") return null;
  const m = o as { source?: unknown; type?: unknown; formId?: unknown; data?: unknown };
  if (m.source !== "formflow" || typeof m.type !== "string" || !TYPES.has(m.type)) return null;
  if (m.type === "resize" || m.type === "submit") return null; // `complete` follows `submit` in native mode
  const data = m.data && typeof m.data === "object" ? m.data : {};
  return { type: m.type, formId: typeof m.formId === "string" ? m.formId : "", data } as FormFlowEvent;
}
