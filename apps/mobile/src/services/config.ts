/**
 * API wiring. Set EXPO_PUBLIC_API_URL to point the app at the real backend;
 * leaving it unset keeps the app on the local mock data layer.
 *
 * On a physical device use your machine's LAN IP, not localhost, e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
export const USE_HTTP = API_URL.length > 0;
