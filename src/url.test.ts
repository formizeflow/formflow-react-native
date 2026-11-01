import { describe, expect, it } from "vitest";
import { buildFormUrl, isAllowedNavigation, parseEvent } from "./url";

describe("buildFormUrl", () => {
  it("builds and encodes everything", () => {
    const u = buildFormUrl({ baseUrl: "https://f.example.com/", slug: "on boarding", uid: "u 1&x", variant: "v2", locale: "de", hidden: { plan: "pro/1" }, prefill: { email: "a+b@c.co" }, includeAnswers: true });
    expect(u).toBe("https://f.example.com/embed/on%20boarding?native=1&uid=u%201%26x&variant=v2&lang=de&answers=1&hidden.plan=pro%2F1&prefill.email=a%2Bb%40c.co");
  });
  it("omits answers by default and requires a slug", () => {
    expect(buildFormUrl({ baseUrl: "https://f.co", formId: "x" })).toBe("https://f.co/embed/x?native=1");
    expect(() => buildFormUrl({ baseUrl: "https://f.co" })).toThrow();
  });
});

describe("navigation", () => {
  it("allows only the base host", () => {
    expect(isAllowedNavigation("https://f.example.com/embed/x", "https://f.example.com")).toBe(true);
    expect(isAllowedNavigation("https://evil.com/", "https://f.example.com")).toBe(false);
    expect(isAllowedNavigation("https://f.example.com.evil.com/", "https://f.example.com")).toBe(false);
    expect(isAllowedNavigation("about:blank", "https://f.example.com")).toBe(true);
  });
});

describe("parseEvent", () => {
  it("parses strings and objects, ignores foreign messages", () => {
    const m = { source: "formflow", type: "step", formId: "f", data: { index: 1, fieldId: "a", total: 3 } };
    const { source: _, ...event } = m;
    expect(parseEvent(JSON.stringify(m))).toEqual(event);
    expect(parseEvent(m)).toEqual(event);
    expect(parseEvent("nope")).toBeNull();
    expect(parseEvent({ source: "other", type: "step" })).toBeNull();
    expect(parseEvent({ source: "formflow", type: "resize", data: { height: 1 } })).toBeNull();
  });
});

describe("identity and appearance", () => {
  it("adds signature, posthog, appearance, resume and attributes", () => {
    const u = buildFormUrl({ baseUrl: "https://f.co", slug: "x", uid: "u", uidSignature: "ab/c=", posthogSessionId: "s1", posthogDistinctId: "d1", resume: false, appearance: { colorScheme: "dark", accent: "#112233", fontFamily: "Inter" }, attributes: { plan: "pro", app_version: "1.2" } });
    expect(u).toBe("https://f.co/embed/x?native=1&uid=u&uid_sig=ab%2Fc%3D&resume=0&ph_session=s1&ph_distinct=d1&scheme=dark&accent=%23112233&font=Inter&attrs.app_version=1.2&attrs.plan=pro");
  });
  it("reads posthog from a client object", () => {
    expect(buildFormUrl({ baseUrl: "https://f.co", slug: "x", posthog: { getSessionId: () => "S", getDistinctId: () => "D" } })).toContain("ph_session=S&ph_distinct=D");
  });
  it("parses request events", () => {
    const m = { source: "formflow", type: "request", formId: "f", data: { requestId: "r", action: "notifications", params: {} } };
    expect(parseEvent(m)?.type).toBe("request");
  });
});
