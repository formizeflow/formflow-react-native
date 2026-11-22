import React, { useRef } from "react";
import { Linking } from "react-native";
import { FormFlowForm, type FormFlowFormProps } from "./FormFlowForm";
import { routeOf } from "./url";

/** Why the form is finished: the app should leave the screen. */
export type FormFlowDone = { reason: "complete" | "skip" | "holdout" | "close" };

export type FormFlowViewProps = Omit<FormFlowFormProps, "slug" | "formId"> & {
  /** The onboarding entry slug (or a form slug). */
  entry: string;
  /** In-app navigation: `route` is the ending's ctaRoute, or the path of a custom-scheme address (myapp://tool/x gives "tool/x"). */
  onRoute?: (route: string, e: { url: string; route?: string }) => void;
  /** Once, when the form is finished: completed, skipped, a holdout (no form shown) or closed. Leave the screen here. */
  onDone?: (d: FormFlowDone) => void;
};

/** <FormFlowView entry uid uidSignature consent onRoute onDone onSkip/>: the form in a WebView with its bridge messages handled for you. */
export function FormFlowView({ entry, onRoute, onDone, ...props }: FormFlowViewProps) {
  const done = useRef(false);
  const finish = (reason: FormFlowDone["reason"]) => { if (!done.current) { done.current = true; onDone?.({ reason }); } };
  return (
    <FormFlowForm
      {...props}
      slug={entry}
      onComplete={(e) => { props.onComplete?.(e); finish("complete"); }}
      onSkip={() => { props.onSkip?.(); finish("skip"); }}
      onHoldout={(e) => { props.onHoldout?.(e); finish("holdout"); }}
      onClose={() => { props.onClose?.(); finish("close"); }}
      onRedirect={(e) => {
        props.onRedirect?.(e);
        const route = routeOf(e);
        if (route && onRoute) onRoute(route, e);
        else if (/^https?:\/\//i.test(e.url)) Linking.openURL(e.url).catch(() => undefined); // a web address: the system browser
      }}
    />
  );
}
