import React from "react";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useUiStore } from "../../store/useUiStore";
import { useTranslation } from "../../i18n";
import { termText } from "../../lib/glossary";
import { TermBody } from "./TermBody";

/**
 * The one glossary sheet for the whole app, mounted at the root layout. Any
 * `TermInfo` opens it through `useUiStore.openTerm`; related-term chips swap
 * the content in place (keyed so each term gets a fresh entrance).
 */
export function TermSheet() {
  const termId = useUiStore((s) => s.termId);
  const openTerm = useUiStore((s) => s.openTerm);
  const closeTerm = useUiStore((s) => s.closeTerm);
  const { t } = useTranslation();

  return (
    <SpringBottomSheet
      visible={!!termId}
      onClose={closeTerm}
      title={termId ? termText(t, termId, "title") : undefined}
    >
      {termId ? <TermBody key={termId} id={termId} onRelated={openTerm} /> : null}
    </SpringBottomSheet>
  );
}
