export type Scalar = string | number | boolean;
export type Outcome = { passed?: boolean; outcomeId?: string; endingId?: string };

export type FormFlowEvent =
  | { type: "ready"; formId: string; data: { formId: string; versionId?: string; experimentId?: string; variantId?: string; locale: string } }
  | { type: "view"; formId: string; data: Record<string, never> }
  | { type: "start"; formId: string; data: Record<string, never> }
  | { type: "step"; formId: string; data: { index: number; fieldId: string; total: number } }
  | { type: "answer"; formId: string; data: { fieldId: string; type: string; value?: unknown } }
  | { type: "complete"; formId: string; data: { submissionId: string; outcome: Outcome; endingId?: string; durationMs?: number; queued?: boolean; answers?: Record<string, unknown> } }
  | { type: "request"; formId: string; data: FormFlowRequest }
  | { type: "progress"; formId: string; data: { step: number; total: number; percent: number } }
  | { type: "close"; formId: string; data: Record<string, never> }
  | { type: "skip"; formId: string; data: Record<string, never> }
  | { type: "holdout"; formId: string; data: { experimentId: string; redirectUrl?: string } }
  /** An ending asked to leave. `route` is its ctaRoute; `url` is empty when only a route is set, and may be a custom scheme (myapp://tool/x). */
  | { type: "redirect"; formId: string; data: { url: string; route?: string; target?: "top" | "blank" | "self" } }
  | { type: "error"; formId: string; data: { message: string } };

/** The form asks the app to do something: notifications, tracking, open a URL, sign in, deep link, or a custom name. */
export type FormFlowRequest = { requestId: string; action: string; params: Record<string, string> };

export type EventOf<T extends FormFlowEvent["type"]> = Extract<FormFlowEvent, { type: T }>;

export type PostHogLike = { getDistinctId?: () => string; getSessionId?: () => string };

export type FormFlowConfig = {
  /** Origin of your FormFlow host, e.g. https://forms.example.com */
  baseUrl: string;
  /** Form slug. */
  slug?: string;
  /** Alias of slug: the /embed route resolves forms by slug. */
  formId?: string;
  /** Your app's stable user id; forwarded to the form (experiments, attribution). */
  uid?: string;
  /** HMAC of uid computed on YOUR server. Never sign in the app. */
  uidSignature?: string;
  /** User attributes sent as attrs.<key>. Platform, os_version, locale and app_version are auto-filled unless autoAttributes is false. */
  attributes?: Record<string, Scalar>;
  autoAttributes?: boolean;
  appVersion?: string;
  /** Pass the posthog-react-native client (usePostHog()) to link the PostHog session and distinct id. Opt-in. */
  posthog?: PostHogLike;
  posthogSessionId?: string;
  posthogDistinctId?: string;
  /** false starts over instead of resuming saved progress (resume is per uid, server-side). */
  resume?: boolean;
  appearance?: { colorScheme?: "light" | "dark" | "system"; accent?: string; fontFamily?: string };
  /** Force an experiment variant id. */
  variant?: string;
  locale?: string;
  hidden?: Record<string, Scalar>;
  prefill?: Record<string, Scalar>;
  /** Also receive answer values (never for sensitive fields). Default false. */
  includeAnswers?: boolean;
  /** Statistics consent from your consent banner (Cookie Munch or any other): true | "granted" | false | "denied" | { statistics }. With no signal the form forwards nothing to analytics destinations. Updates while mounted are pushed live. */
  consent?: boolean | "granted" | "denied" | { statistics: boolean };
  /** An Atlas session JWT as proof of uid, instead of uidSignature. */
  atlasToken?: string;
  /** Show a Skip control; it posts `skip`. */
  skippable?: boolean;
  /** Where complete and skip send the app: arrives as a `redirect` event with ff_done=1 / ff_skipped=1. */
  returnUrl?: string;
  /** Integration tests: no exposure or conversion is counted. */
  test?: boolean;
  /** Show the in-form close button. Default false. */
  showClose?: boolean;
};

export type FormFlowCallbacks = {
  onReady?: (e: EventOf<"ready">["data"]) => void;
  onStart?: () => void;
  onStep?: (e: EventOf<"step">["data"]) => void;
  onAnswer?: (e: EventOf<"answer">["data"]) => void;
  onComplete?: (e: EventOf<"complete">["data"]) => void;
  onClose?: () => void;
  onSkip?: () => void;
  onHoldout?: (e: EventOf<"holdout">["data"]) => void;
  onRedirect?: (e: EventOf<"redirect">["data"]) => void;
  onError?: (e: { message: string }) => void;
  /** Load timeout in ms (default 8000) for the form to report ready. */
  timeoutMs?: number;
  /** Called once if the form did not become ready in time. Continue your onboarding. */
  onTimeout?: () => void;
  /** Answer a `request` event; the return value is sent back to the form. */
  onRequest?: (r: FormFlowRequest) => unknown | Promise<unknown>;
  /** Every event, after the specific callback. */
  onEvent?: (e: FormFlowEvent) => void;
};

/** Response of POST /api/v1/public/onboarding/decide. */
export type OnboardingDecision = {
  show: boolean;
  experimentId?: string | null;
  variantId?: string | null;
  formId?: string | null;
  slug?: string | null;
  versionId?: string | null;
  reason: string;
  definition?: unknown;
  resume?: Record<string, unknown> | null;
  /** Set by the SDK when the network failed and a cached decision was returned. */
  fromCache?: boolean;
};
