import { useEffect, useMemo, useState } from "react";
import { FormFlowClient, decisionToProps, type DecideOptions, type Storage } from "./client";

/**
 * Ask FormFlow whether to show the onboarding entry. `status` is "loading", then "show" (render <FormFlowView entry={...} {...props}/>) or "skip"
 * (holdout, already done, offline without a cached decision: carry on with your app; a failure never blocks).
 */
export function useFormFlowOnboarding(o: DecideOptions & { baseUrl: string; storage?: Storage; timeoutMs?: number }): { status: "loading" | "show" | "skip"; props: { slug: string; variant?: string } | null } {
  const { baseUrl, storage, timeoutMs, ...d } = o;
  const client = useMemo(() => new FormFlowClient({ baseUrl, storage, timeoutMs }), [baseUrl, storage, timeoutMs]);
  const [props, setProps] = useState<{ slug: string; variant?: string } | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    client.decide(d).then((r) => live && setProps(decisionToProps(r)), () => live && setProps(null));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, d.entry, d.uid, d.uidSignature, d.atlasToken, d.firstRunOnly, d.test]);
  return { status: props === undefined ? "loading" : props ? "show" : "skip", props: props ?? null };
}
