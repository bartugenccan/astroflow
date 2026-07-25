import { City } from "./types";
import { Locale } from "../i18n";

/**
 * Live city search via the Open-Meteo geocoding API — free, no API key,
 * supports Turkish, and returns region + IANA timezone alongside coordinates.
 */

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

const ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodingError";
  }
}

export async function searchCitiesRemote(
  query: string,
  locale: Locale,
): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `${ENDPOINT}?name=${encodeURIComponent(q)}&count=10&language=${locale}&format=json`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new GeocodingError(`Network error: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new GeocodingError(`Geocoding failed (${res.status})`);
  }

  const data = (await res.json()) as { results?: OpenMeteoResult[] };
  if (!data.results) return [];

  return data.results.map((r) => ({
    id: String(r.id),
    name: r.name,
    country: r.country ?? "",
    lat: r.latitude,
    lon: r.longitude,
    admin1: r.admin1,
    timezone: r.timezone,
  }));
}
