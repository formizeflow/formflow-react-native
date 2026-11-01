import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Linking, type StyleProp, type ViewStyle } from "react-native";
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import { collectAttributes } from "./attributes";
import type { FormFlowCallbacks, FormFlowConfig, FormFlowEvent } from "./types";
import { buildFormUrl, isAllowedNavigation, parseEvent } from "./url";
import { USER_AGENT_SUFFIX } from "./version";

type WebViewHandle = { reload(): void; injectJavaScript(script: string): void };
// The generic .d.ts types WebView as a FunctionComponent without ref; every platform build is a forwardRef.
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & React.RefAttributes<WebViewHandle>>;

export type FormFlowFormProps = FormFlowConfig & FormFlowCallbacks & { style?: StyleProp<ViewStyle> };

/** Dispatch one parsed event to the matching callbacks. Exported for tests. */
export function dispatch(e: FormFlowEvent, cb: FormFlowCallbacks): void {
  switch (e.type) {
    case "ready": cb.onReady?.(e.data); break;
    case "start": cb.onStart?.(); break;
    case "step": cb.onStep?.(e.data); break;
    case "answer": cb.onAnswer?.(e.data); break;
    case "complete": cb.onComplete?.(e.data); break;
    case "close": cb.onClose?.(); break;
    case "error": cb.onError?.(e.data); break;
  }
  cb.onEvent?.(e);
}

export type FormFlowHandle = { /** Start over, ignoring saved progress. */ restart(): void; reload(): void };

export const FormFlowForm = forwardRef<FormFlowHandle, FormFlowFormProps>(function FormFlowForm(props, ref) {
  const { style, timeoutMs = 8000 } = props;
  const web = useRef<WebViewHandle>(null);
  const [fresh, setFresh] = useState(false);
  const [nonce, setNonce] = useState(0);
  const ready = useRef(false);
  const cfg = { ...props, resume: fresh ? false : props.resume, attributes: collectAttributes(props) };
  const url = useMemo(
    () => buildFormUrl(cfg),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.baseUrl, props.slug, props.formId, props.uid, props.uidSignature, props.variant, props.locale, JSON.stringify(props.hidden), JSON.stringify(props.prefill), JSON.stringify(props.attributes), props.includeAnswers, props.showClose, props.resume, fresh, JSON.stringify(props.appearance), props.posthogSessionId, props.posthogDistinctId, props.appVersion],
  );
  useImperativeHandle(ref, () => ({ restart: () => { ready.current = false; setFresh(true); setNonce((n) => n + 1); }, reload: () => web.current?.reload() }));

  // A slow or failed load must never block the app: tell it once and let it carry on.
  useEffect(() => {
    ready.current = false;
    const t = setTimeout(() => { if (!ready.current) props.onTimeout?.(); }, timeoutMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, timeoutMs]);

  const respond = useCallback((requestId: string, result: unknown) => {
    const msg = JSON.stringify(JSON.stringify({ type: "respond", requestId, result: result ?? null }));
    web.current?.injectJavaScript(`window.FormFlow&&window.FormFlow.native&&window.FormFlow.native.receive(${msg});true;`);
  }, []);

  const onMessage = useCallback((m: WebViewMessageEvent) => {
    const e = parseEvent(m.nativeEvent.data);
    if (!e) return;
    if (e.type === "ready") ready.current = true;
    if (e.type === "request" && props.onRequest) {
      Promise.resolve().then(() => props.onRequest!(e.data)).then((r) => respond(e.data.requestId, r), () => respond(e.data.requestId, "error"));
    }
    dispatch(e, props);
  }, [props, respond]);
  const onShould = useCallback((r: { url: string }) => {
    if (isAllowedNavigation(r.url, props.baseUrl)) return true;
    Linking.openURL(r.url).catch(() => undefined);
    return false;
  }, [props.baseUrl]);
  const fail = (message: string) => { ready.current = true; props.onError?.({ message }); props.onTimeout?.(); };
  return (
    <WebView
      ref={web}
      key={nonce}
      source={{ uri: url }}
      style={[{ flex: 1, backgroundColor: "transparent" }, style]}
      applicationNameForUserAgent={USER_AGENT_SUFFIX}
      onMessage={onMessage}
      onShouldStartLoadWithRequest={onShould}
      onError={(e) => fail(e.nativeEvent.description)}
      onHttpError={(e) => fail(`HTTP ${e.nativeEvent.statusCode}`)}
      bounces={false}
      overScrollMode="never"
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      setSupportMultipleWindows={false}
      originWhitelist={["https://*", "http://*"]}
      javaScriptEnabled
      domStorageEnabled
      keyboardDisplayRequiresUserAction={false}
    />
  );
});
