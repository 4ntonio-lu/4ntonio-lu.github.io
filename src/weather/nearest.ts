import { CITIES, type City, type CityId } from './forecast';

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometers. Used only to rank the nine cities. */
function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earth = 6371;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(a));
}

/** Closest of the nine forecast cities. A tie keeps the earlier city in the menu. */
export function nearestCity(latitude: number, longitude: number): City {
  let best: City = CITIES[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const city of CITIES) {
    const kilometers = distance(latitude, longitude, city.latitude, city.longitude);
    if (kilometers < bestDistance) {
      best = city;
      bestDistance = kilometers;
    }
  }
  return best;
}

let ask: Promise<CityId | null> | null = null;

/**
 * Ask the browser for a position once per page load.
 * The coordinates are used to pick a city and then dropped. Nothing is stored.
 * Denial or a missing API resolves to null so the window stays on Austin.
 */
export function locateNearestCity(): Promise<CityId | null> {
  if (ask) return ask;
  ask = new Promise((resolve) => {
    const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
    if (!geolocation) {
      resolve(null);
      return;
    }
    geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(nearestCity(latitude, longitude).id);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  });
  return ask;
}

/** Tests start from a fresh permission ask. */
export function resetLocationAsk(): void {
  ask = null;
}
