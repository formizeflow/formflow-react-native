import { describe, expect, it, vi } from "vitest";
import { decisionToProps } from "./client";

// FormFlowClient imports react-native through attributes.ts, so only the pure helper is tested here.
vi.mock("react-native", () => ({ Platform: { OS: "ios", Version: "17" } }));
import { FormFlowClient } from "./client";

const dec = { show: true, slug: "onb", variantId: "b", reason: "variant" };
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: body }) } as Response);

describe("FormFlowClient", () => {
  it("returns the decision and falls back to the cache offline", async () => {
    let fail = false;
    const f = vi.fn(() => (fail ? Promise.reject(new Error("offline")) : ok(dec))) as unknown as typeof fetch;
    const c = new FormFlowClient({ baseUrl: "https://f.co", fetch: f });
    expect(await c.decide({ entry: "e", uid: "u" })).toEqual(dec);
    fail = true;
    expect(await c.decide({ entry: "e", uid: "u" })).toEqual({ ...dec, fromCache: true });
    await expect(c.decide({ entry: "e", uid: "other" })).rejects.toThrow();
    expect(await c.preload({ entry: "e", uid: "other" })).toBeNull();
  });
  it("maps a decision to props", () => {
    expect(decisionToProps(dec)).toEqual({ slug: "onb", variant: "b" });
    expect(decisionToProps({ show: false, reason: "holdout" })).toBeNull();
  });
});
