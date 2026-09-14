import * as satellite from "satellite.js";
import { RAD2DEG, DEG2RAD } from "./astronomy";
import type { ARObject } from "./coordinates";

export interface SatelliteLookAngles {
  altitude: number; // Degrees above horizon (-90 to +90)
  azimuth: number; // Degrees compass bearing (0 to 360)
  rangeKm: number; // Distance in kilometers
  velocityKmh: number; // Speed in km/h
  latitude: number; // Sub-satellite point latitude
  longitude: number; // Sub-satellite point longitude
  heightKm: number; // Altitude above Earth sea level in km
}

export interface SatelliteTLE {
  name: string;
  line1: string;
  line2: string;
  type?: "ISS" | "STARLINK" | "SATELLITE";
}

/**
 * Propagates a satellite TLE to topocentric look angles for a ground observer.
 */
export function propagateSatellite(
  tle: SatelliteTLE,
  observerLatDeg: number,
  observerLonDeg: number,
  observerAltMeters: number,
  date: Date,
): SatelliteLookAngles | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (
      !positionAndVelocity ||
      typeof positionAndVelocity.position === "boolean" ||
      !positionAndVelocity.position
    ) {
      return null;
    }

    const positionEci =
      positionAndVelocity.position as satellite.EciVec3<number>;
    const velocityEci =
      positionAndVelocity.velocity as satellite.EciVec3<number>;

    const gmst = satellite.gstime(date);
    const positionEcf = satellite.eciToEcf(positionEci, gmst);

    // Geodetic sub-satellite point
    const positionGd = satellite.eciToGeodetic(positionEci, gmst);
    const subLat = satellite.degreesLat(positionGd.latitude);
    const subLon = satellite.degreesLong(positionGd.longitude);
    const heightKm = positionGd.height;

    // Observer geodetic coordinates
    const observerGd: satellite.GeodeticLocation = {
      latitude: observerLatDeg * DEG2RAD,
      longitude: observerLonDeg * DEG2RAD,
      height: observerAltMeters / 1000.0,
    };

    // Calculate topocentric look angles (azimuth, elevation, range)
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    const altitudeDeg = lookAngles.elevation * RAD2DEG;
    let azimuthDeg = lookAngles.azimuth * RAD2DEG;
    if (azimuthDeg < 0) azimuthDeg += 360.0;

    if (isNaN(altitudeDeg) || isNaN(azimuthDeg) || isNaN(lookAngles.rangeSat)) {
      return null;
    }

    // Velocity magnitude (km/s -> km/h)
    const speedKmS = Math.sqrt(
      velocityEci.x * velocityEci.x +
        velocityEci.y * velocityEci.y +
        velocityEci.z * velocityEci.z,
    );
    const velocityKmh = speedKmS * 3600.0;

    return {
      altitude: altitudeDeg,
      azimuth: azimuthDeg,
      rangeKm: lookAngles.rangeSat,
      velocityKmh,
      latitude: subLat,
      longitude: subLon,
      heightKm,
    };
  } catch {
    return null;
  }
}

/**
 * Converts a SatelliteTLE into an ARObject if above or near the horizon
 */
export function satelliteToARObject(
  tle: SatelliteTLE,
  observerLatDeg: number,
  observerLonDeg: number,
  observerAltMeters: number,
  date: Date,
): ARObject | null {
  const angles = propagateSatellite(
    tle,
    observerLatDeg,
    observerLonDeg,
    observerAltMeters,
    date,
  );
  if (!angles) return null;

  return {
    id: `sat-${tle.name.replace(/\s+/g, "-").toLowerCase()}`,
    type: "SATELLITE",
    label: tle.name,
    altitude: angles.altitude,
    azimuth: angles.azimuth,
    magnitude: tle.name.includes("ISS") ? -2.5 : 3.5,
    distanceKm: Math.round(angles.rangeKm),
    velocityKmh: Math.round(angles.velocityKmh),
    metadata: {
      heightKm: Math.round(angles.heightKm),
      subLat: Number(angles.latitude.toFixed(2)),
      subLon: Number(angles.longitude.toFixed(2)),
      type: tle.type ?? "SATELLITE",
    },
  };
}
