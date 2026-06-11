// Búsqueda de lugares/direcciones con Nominatim (OpenStreetMap).
// Política de uso (https://operations.osmfoundation.org/policies/nominatim/):
// máx 1 req/s, sin autocompletar (solo búsqueda por submit), User-Agent
// identificatorio obligatorio y atribución "© OpenStreetMap contributors".

export type PlaceResult = {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

export type SearchViewbox = {
  lonMin: number;
  latMax: number;
  lonMax: number;
  latMin: number;
};

type NominatimRow = {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
};

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'appmorcito/1.0 (victor.2002.espinoza@gmail.com)';
const MIN_INTERVAL_MS = 1100;

const cache = new Map<string, PlaceResult[]>();
let lastRequestAt = 0;

function mapRow(row: NominatimRow): PlaceResult {
  const fallbackTitle = row.display_name.split(',')[0]?.trim() || 'Lugar';

  return {
    id: String(row.place_id),
    title: row.name?.trim() || fallbackTitle,
    subtitle: row.display_name,
    latitude: parseFloat(row.lat),
    longitude: parseFloat(row.lon),
  };
}

export async function searchPlaces(
  query: string,
  viewbox?: SearchViewbox
): Promise<PlaceResult[]> {
  const normalized = query.trim();

  if (!normalized) return [];

  const cacheKey = normalized.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Respetar el límite de 1 req/s de Nominatim.
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();

  const params = new URLSearchParams({
    q: normalized,
    format: 'jsonv2',
    limit: '5',
    'accept-language': 'es',
    addressdetails: '0',
  });

  if (viewbox) {
    // Sin bounded=1: solo sesga el ranking hacia el área visible del mapa,
    // sin dejar de encontrar lugares lejanos (ej: "Torre de Tokio").
    params.set(
      'viewbox',
      `${viewbox.lonMin},${viewbox.latMax},${viewbox.lonMax},${viewbox.latMin}`
    );
  }

  const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim respondió ${response.status}`);
  }

  const rows = (await response.json()) as NominatimRow[];
  const results = rows.map(mapRow);

  cache.set(cacheKey, results);

  return results;
}
