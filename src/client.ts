import type { FormFlowConfig, OnboardingDecision } from "./types";
import { collectAttributes } from "./attributes";

export type DecideOptions = {
  /** The onboarding entry key you configured in FormFlow (e.g. "first-launch"). */
  entry: string;
  uid?: string;
  uidSignature?: string;
  attributes?: FormFlowConfig["attributes"];
  appVersion?: string;
  posthogSessionId?: string;
  posthogDistinctId?: string;
};
/** AsyncStorage-compatible. Without one, decisions are cached in memory only. */
export type Storage = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<unknown> };

export class FormFlowClient {
  private mem = new Map<string, OnboardingDecision>();
  constructor(private o: { baseUrl: string; timeoutMs?: number; storage?: Storage; fetch?: typeof fetch }) {}

  private key(d: DecideOptions) { return `formflow:decision:${d.entry}:${d.uid ?? "anon"}`; }

  async cached(d: DecideOptions): Promise<OnboardingDecision | null> {
    const k = this.key(d);
    const m = this.mem.get(k);
    if (m) return m;
    try { const raw = await this.o.storage?.getItem(k); return raw ? (JSON.parse(raw) as OnboardingDecision) : null; } catch { return null; }
  }

  /** Ask the server whether to show the flow. On network failure returns the cached decision (fromCache: true) or throws. */
  async decide(d: DecideOptions): Promise<OnboardingDecision> {
    const f = this.o.fetch ?? fetch;
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), this.o.timeoutMs ?? 8000) : null;
    try {
      const res = await f(`${this.o.baseUrl.replace(/\/+$/, "")}/api/v1/public/onboarding/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entry: d.entry, uid: d.uid, uid_sig: d.uidSignature, attributes: collectAttributes({ attributes: d.attributes, appVersion: d.appVersion }), ph_session: d.posthogSessionId, ph_distinct: d.posthogDistinctId }),
        signal: ctl?.signal,
      });
      if (!res.ok) throw new Error(`decide ${res.status}`);
      const j = await res.json();
      const dec = (j?.data ?? j) as OnboardingDecision;
      this.mem.set(this.key(d), dec);
      this.o.storage?.setItem(this.key(d), JSON.stringify(dec)).catch(() => undefined);
      return dec;
    } catch (e) {
      const c = await this.cached(d);
      if (c) return { ...c, fromCache: true };
      throw e;
    } finally {
      if (t) clearTimeout(t);
    }
  }

  /** Warm the decision cache before the onboarding step. Never throws. */
  async preload(d: DecideOptions): Promise<OnboardingDecision | null> {
    try { return await this.decide(d); } catch { return null; }
  }
}

/** Props for <FormFlowForm> from a decision, or null when the flow must be skipped (holdout, completed, no match). */
export function decisionToProps(d: OnboardingDecision): { slug: string; variant?: string } | null {
  if (!d.show || !d.slug) return null;
  return { slug: d.slug, variant: d.variantId ?? undefined };
}
