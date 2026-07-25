/** Simulated network latency so loading/skeleton states are exercised. */
export const delay = (ms = 450): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
