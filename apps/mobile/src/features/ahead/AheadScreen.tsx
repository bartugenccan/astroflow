import React from "react";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ForecastScreen } from "../forecast/ForecastScreen";
import { EnterView } from "../../lib/motion";
import { SolarReturnCard } from "./SolarReturnCard";

/**
 * "Future" — everything about timing. The Solar Return (the year from this
 * birthday to the next) is pinned to the top with a running-light border so
 * nobody scrolls past it; the weekly/monthly forecast and best days follow.
 * "Right now" moved to Today, so there is no horizon switcher any more.
 */
export function AheadScreen() {
  return (
    <ScreenWrapper>
      <ForecastScreen
        headerSlot={
          <EnterView scale>
            <SolarReturnCard />
          </EnterView>
        }
      />
    </ScreenWrapper>
  );
}
