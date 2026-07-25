import { City } from "../types";

/** A small searchable city list for onboarding. Manual lat/lon is the fallback. */
export const CITIES: City[] = [
  { id: "istanbul", name: "İstanbul", country: "Türkiye", lat: 41.0082, lon: 28.9784 },
  { id: "ankara", name: "Ankara", country: "Türkiye", lat: 39.9334, lon: 32.8597 },
  { id: "izmir", name: "İzmir", country: "Türkiye", lat: 38.4237, lon: 27.1428 },
  { id: "bursa", name: "Bursa", country: "Türkiye", lat: 40.1826, lon: 29.0665 },
  { id: "antalya", name: "Antalya", country: "Türkiye", lat: 36.8969, lon: 30.7133 },
  { id: "adana", name: "Adana", country: "Türkiye", lat: 37.0, lon: 35.3213 },
  { id: "konya", name: "Konya", country: "Türkiye", lat: 37.8667, lon: 32.4833 },
  { id: "gaziantep", name: "Gaziantep", country: "Türkiye", lat: 37.0662, lon: 37.3833 },
  { id: "london", name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { id: "paris", name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  { id: "madrid", name: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038 },
  { id: "rome", name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
  { id: "vienna", name: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738 },
  { id: "athens", name: "Athens", country: "Greece", lat: 37.9838, lon: 23.7275 },
  { id: "moscow", name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173 },
  { id: "dubai", name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708 },
  { id: "cairo", name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
  { id: "new-york", name: "New York", country: "United States", lat: 40.7128, lon: -74.006 },
  { id: "los-angeles", name: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437 },
  { id: "chicago", name: "Chicago", country: "United States", lat: 41.8781, lon: -87.6298 },
  { id: "toronto", name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332 },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333 },
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { id: "seoul", name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  { id: "mumbai", name: "Mumbai", country: "India", lat: 19.076, lon: 72.8777 },
  { id: "sydney", name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  { id: "singapore", name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
];

/** Locale-insensitive search across name + country. */
export function searchCities(query: string): City[] {
  const q = normalize(query.trim());
  if (!q) return CITIES.slice(0, 8);
  return CITIES.filter(
    (c) => normalize(c.name).includes(q) || normalize(c.country).includes(q),
  ).slice(0, 12);
}

function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
