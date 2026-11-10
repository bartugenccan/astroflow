import React from "react";

/**
 * Whether the screen around a component is the one the user is looking at.
 *
 * Tabs stay mounted (detached off-window) and stack screens stay mounted under
 * the one on top, so their infinite animations — Aster breathing, twinkles,
 * running lights, star fields — would keep costing UI-thread frames nobody
 * sees. Components with a looping animation read this and stop the loop while
 * it is false.
 *
 * Provided by `ScreenWrapper` (the route's focus) and by `SectionPager` panes
 * (the visible pane). Outside any screen — root overlays such as the
 * celebration host — it is `true`.
 */
const ScreenActiveContext = React.createContext(true);

export function ScreenActiveProvider({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const parent = React.useContext(ScreenActiveContext);
  return (
    <ScreenActiveContext.Provider value={parent && active}>{children}</ScreenActiveContext.Provider>
  );
}

export function useScreenActive(): boolean {
  return React.useContext(ScreenActiveContext);
}
