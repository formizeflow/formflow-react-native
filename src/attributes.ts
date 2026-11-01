import { Platform } from "react-native";
import type { FormFlowConfig, Scalar } from "./types";

/** Auto-filled attributes (platform, os_version, locale, app_version when given), overridden by the ones you pass. Device model needs expo-device or similar: pass it in `attributes.device_model`. */
export function collectAttributes(c: Pick<FormFlowConfig, "attributes" | "autoAttributes" | "appVersion" | "locale">): Record<string, Scalar> {
  const auto: Record<string, Scalar> = {};
  if (c.autoAttributes !== false) {
    auto.platform = Platform.OS;
    auto.os_version = String(Platform.Version);
    try { auto.locale = c.locale ?? Intl.DateTimeFormat().resolvedOptions().locale; } catch { /* no Intl */ }
    if (c.appVersion) auto.app_version = c.appVersion;
  }
  return { ...auto, ...(c.attributes ?? {}) };
}
