import { DEG2RAD, RAD2DEG } from "./astronomy";
import type { ARObject } from "./coordinates";

export interface OpenSkyStateVector {
  icao24: string;
  callsign: string;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitudeMeters: number | null;
  onGround: boolean;
  velocityMps: number | null;
  trueTrackDeg: number | null;
  verticalRateMps: number | null;
  geoAltitudeMeters: number | null;
}

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

/**
 * Calculates geographic bounding box around observer for OpenSky API
 * @param latDeg Observer Latitude
 * @param lonDeg Observer Longitude
 * @param radiusKm Search radius in kilometers (default 120 km)
 */
export function getObserverBoundingBox(
  latDeg: number,
  lonDeg: number,
  radiusKm = 120,
): BoundingBox {
  const dLat = radiusKm / 111.32;
  const cosLat = Math.max(0.01, Math.cos(latDeg * DEG2RAD));
  const dLon = radiusKm / (111.32 * cosLat);

  return {
    lamin: Math.max(-90, latDeg - dLat),
    lamax: Math.min(90, latDeg + dLat),
    lomin: Math.max(-180, lonDeg - dLon),
    lomax: Math.min(180, lonDeg + dLon),
  };
}

/**
 * Computes great-circle ground distance and initial bearing from observer to target
 */
export function getGroundDistanceAndBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): { distanceKm: number; bearingDeg: number } {
  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const deltaPhi = (lat2 - lat1) * DEG2RAD;
  const deltaLambda = (lon2 - lon1) * DEG2RAD;

  // Haversine distance
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = 6371.0 * c;

  // Initial bearing
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  let bearingDeg = Math.atan2(y, x) * RAD2DEG;
  if (bearingDeg < 0) bearingDeg += 360.0;

  return { distanceKm, bearingDeg };
}

/**
 * Converts an OpenSky raw state array into OpenSkyStateVector
 */
export function parseOpenSkyState(
  raw: (string | number | boolean | null)[],
): OpenSkyStateVector | null {
  if (!raw || raw.length < 14) return null;
  return {
    icao24: String(raw[0] ?? ""),
    callsign: String(raw[1] ?? "").trim(),
    originCountry: String(raw[2] ?? ""),
    timePosition: typeof raw[3] === "number" ? raw[3] : null,
    lastContact: Number(raw[4] ?? 0),
    longitude: typeof raw[5] === "number" ? raw[5] : null,
    latitude: typeof raw[6] === "number" ? raw[6] : null,
    baroAltitudeMeters: typeof raw[7] === "number" ? raw[7] : null,
    onGround: Boolean(raw[8]),
    velocityMps: typeof raw[9] === "number" ? raw[9] : null,
    trueTrackDeg: typeof raw[10] === "number" ? raw[10] : null,
    verticalRateMps: typeof raw[11] === "number" ? raw[11] : null,
    geoAltitudeMeters: typeof raw[13] === "number" ? raw[13] : null,
  };
}

/**
 * Converts an aircraft state to an ARObject relative to observer
 */
export function airplaneToARObject(
  plane: OpenSkyStateVector,
  observerLat: number,
  observerLon: number,
  observerAltMeters = 0,
): ARObject | null {
  if (plane.latitude === null || plane.longitude === null || plane.onGround) {
    return null;
  }

  const { distanceKm, bearingDeg } = getGroundDistanceAndBearing(
    observerLat,
    observerLon,
    plane.latitude,
    plane.longitude,
  );

  const planeAltMeters =
    plane.baroAltitudeMeters ?? plane.geoAltitudeMeters ?? 10000;
  const deltaAltKm = (planeAltMeters - observerAltMeters) / 1000.0;

  // Slant altitude angle above horizon
  const altitudeDeg =
    Math.atan2(deltaAltKm, Math.max(0.1, distanceKm)) * RAD2DEG;
  const velocityKmh = plane.velocityMps
    ? Math.round(plane.velocityMps * 3.6)
    : undefined;

  return {
    id: `flight-${plane.icao24}`,
    type: "AIRPLANE",
    label: plane.callsign || plane.icao24.toUpperCase(),
    altitude: altitudeDeg,
    azimuth: bearingDeg,
    distanceKm: Math.round(distanceKm),
    velocityKmh,
    metadata: {
      icao24: plane.icao24,
      country: plane.originCountry,
      altitudeMeters: Math.round(planeAltMeters),
      trackDeg: plane.trueTrackDeg ?? 0,
    },
  };
}
