import type { Href } from "expo-router";

/** In-app routes a server-sent link may open. Anything else is ignored. */
const ALLOWED = [/^\/chart(\?[\w=&%.-]*)?$/];

/**
 * A server-provided deep link ("See it in your chart") as a safe in-app route,
 * or null. The server only ever sends `/chart?planet=…&transit=…`; a link that
 * doesn't match the allowlist is dropped rather than pushed onto the router.
 */
export function safeInAppLink(link: string | null | undefined): Href | null {
  if (!link) return null;
  return ALLOWED.some((re) => re.test(link)) ? (link as Href) : null;
}
