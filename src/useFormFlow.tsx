import React, { useCallback, useState, type ReactElement } from "react";
import { Modal, View } from "react-native";
import { FormFlowForm, type FormFlowFormProps } from "./FormFlowForm";

/**
 * Modal presentation. Render `modal` once in your tree and call `present()`:
 *   const { present, modal } = useFormFlow({ baseUrl, slug: "onboarding", uid });
 * The modal closes itself on `complete` and `close` (after your callbacks run).
 */
export function useFormFlow(props: Omit<FormFlowFormProps, "style">): { present: (override?: Partial<FormFlowFormProps>) => void; dismiss: () => void; isOpen: boolean; modal: ReactElement } {
  const [state, setState] = useState<Partial<FormFlowFormProps> | null>(null);
  const dismiss = useCallback(() => setState(null), []);
  const present = useCallback((o: Partial<FormFlowFormProps> = {}) => setState(o), []);
  const merged = { ...props, ...(state ?? {}) } as FormFlowFormProps;
  const modal = (
    <Modal visible={state !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { merged.onClose?.(); dismiss(); }}>
      <View style={{ flex: 1 }}>
        {state !== null && (
          <FormFlowForm
            showClose
            {...merged}
            onComplete={(e) => { merged.onComplete?.(e); dismiss(); }}
            onClose={() => { merged.onClose?.(); dismiss(); }}
          />
        )}
      </View>
    </Modal>
  );
  return { present, dismiss, isOpen: state !== null, modal };
}
