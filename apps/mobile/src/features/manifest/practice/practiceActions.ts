import { astrologyApi } from "../../../services/astrologyApi";
import { useMascotStore } from "../../../store/useMascotStore";
import type { CheckInResult } from "../../../services/types";
import type { Locale } from "../../../i18n";

/**
 * Send a written page (a script, or a 3-6-9 sentence) as a check-in on the
 * manifestation, and feed Aster with what it earned — Işık, a milestone, a
 * shield — through the celebration queue (one pill, not a second popup).
 * The text goes to the AI for Aster's reply; that is disclosed as
 * "manifest text and practice notes".
 */
export async function sendPage(
  wishId: string,
  page: { text: string; conviction: number },
  locale: Locale,
): Promise<CheckInResult> {
  const r = await astrologyApi.checkInIntention(
    wishId,
    { conviction: page.conviction, userText: page.text.trim() || undefined, inputMode: "text" },
    locale,
  );
  useMascotStore.getState().applyDelta(r.mascot, {
    milestoneName: r.milestoneName,
    shieldsUsed: r.streak.shieldsUsed,
  });
  return r;
}
