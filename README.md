# @formizeflow/react-native

[![CI](https://github.com/formizeflow/formflow-react-native/actions/workflows/ci.yml/badge.svg)](https://github.com/formizeflow/formflow-react-native/actions/workflows/ci.yml)

Show FormFlow forms inside React Native apps. Built on `react-native-webview` (peer dependency). No credentials in the app: the form is loaded from your FormFlow host and submitted by the hosted page.

```sh
npm install @formizeflow/react-native react-native-webview
```

## Onboarding on first launch

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FormFlowForm } from "@formizeflow/react-native";

export function Onboarding({ userId, onDone }: { userId: string; onDone: () => void }) {
  return (
    <FormFlowForm
      baseUrl="https://forms.example.com"
      slug="app-onboarding"
      uid={userId}                      // your stable user id
      hidden={{ app_version: "3.2.0", platform: "ios" }}
      onStep={(s) => console.log("step", s.index, "/", s.total)}
      onComplete={async (c) => { await AsyncStorage.setItem("onboarded", "1"); onDone(); }}
      onClose={onDone}
      showClose
      style={{ flex: 1 }}
    />
  );
}
```

Read the answers server-side (REST API `GET /api/v1/forms/:id/submissions` or the `submission.completed` webhook) and join them on `uid`. Answer values reach the app only if you pass `includeAnswers` (never for sensitive fields).

## Modal

```tsx
const { present, modal } = useFormFlow({ baseUrl, slug: "nps", uid, onComplete: () => thank() });
return <><Button title="Feedback" onPress={() => present()} />{modal}</>;
```

## Props

`baseUrl`, `slug` (or `formId`, an alias), `uid`, `variant`, `locale`, `hidden`, `prefill`, `includeAnswers`, `showClose`, `style`; callbacks `onReady`, `onStart`, `onStep`, `onAnswer`, `onComplete`, `onClose`, `onError`, `onEvent`.

Events: `ready {formId, versionId, experimentId?, variantId?, locale}`, `view`, `start`, `step {index, fieldId, total}`, `answer {fieldId, type}`, `complete {submissionId, outcome, endingId, durationMs}`, `close`, `error`.

Navigation stays on your FormFlow host; other links open in the system browser. The WebView user agent ends with `FormFlowRN/<version>`.

## Onboarding experiment: decide, preload, fall back

```tsx
import { FormFlowClient, FormFlowForm, decisionToProps } from "@formizeflow/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";

const client = new FormFlowClient({ baseUrl: "https://forms.example.com", storage: AsyncStorage });

// 1. At app start (splash screen). Never throws; warms the cache for offline starts.
client.preload({ entry: "first-launch", uid: user.id, uidSignature: user.formflowSig });

function Onboarding({ user, next }) {
  const posthog = usePostHog();
  const [props, setProps] = useState<{ slug: string; variant?: string } | null | undefined>(undefined);
  useEffect(() => {
    client.decide({ entry: "first-launch", uid: user.id, uidSignature: user.formflowSig, attributes: { plan: user.plan } })
      .then((d) => setProps(decisionToProps(d)))   // null = holdout or already done
      .catch(() => setProps(null));                 // offline, no cache: skip, never block the app
  }, []);
  useEffect(() => { if (props === null) next(); }, [props]);
  if (!props) return null;
  return (
    <FormFlowForm
      baseUrl="https://forms.example.com" {...props}
      uid={user.id} uidSignature={user.formflowSig} posthog={posthog}
      attributes={{ plan: user.plan }} appVersion="3.2.0"
      includeAnswers resume
      appearance={{ colorScheme: "system", accent: "#4f46e5" }}
      timeoutMs={8000} onTimeout={next}
      onStep={(s) => { if (s.fieldId === "notifications_q") askNotifications(); }}
      onRequest={async (r) => (r.action === "notifications" ? (await requestPermission()) : "unsupported")}
      onComplete={(c) => { save(c.answers); next(); }}
      onClose={next}
    />
  );
}
```

`uidSignature` is an HMAC of `uid` computed on your server (see the docs page "Mobile apps"). `ref.current.restart()` starts over without saved progress. `posthog` (optional) links the PostHog session and distinct id. In the form, a link such as `[Enable notifications](https://example.com/#ff-action=notifications)` triggers `onRequest`; the return value goes back to the form.
