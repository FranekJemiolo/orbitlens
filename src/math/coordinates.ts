import {
  DEG2RAD,
  RAD2DEG,
  getLMSTRadians,
  getHourAngleRadians,
} from "./astronomy";

/**
 * Core Schema 2: Dynamic AR Object
 */
export interface ARObject {
  id: string;
  type: "STAR" | "SATELLITE" | "AIRPLANE" | "COMET" | "METEOR";
  label: string;
  altitude: number; // Real-time altitude above horizon (-90 to +90 degrees)
  azimuth: number; // Real-time compass heading (0 to 360 degrees, 0 = North, 90 = East)
  magnitude?: number; // Visual magnitude (smaller/negative is brighter)
  distanceKm?: number; // Distance from observer in km
  velocityKmh?: number; // Velocity in km/h
  metadata?: Record<string, string | number | boolean>;
}

export interface HorizontalCoords {
  altitude: number; // Degrees [-90, +90]
  azimuth: number; // Degrees [0, 360)
}

export interface CartesianVector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Converts Equatorial coordinates (RA, Dec) to Topocentric Horizontal coordinates (Alt, Az)
 * @param raRad Right Ascension in radians [0, 2pi)
 * @param decRad Declination in radians [-pi/2, +pi/2]
 * @param latDeg Observer Latitude in degrees [-90, +90]
 * @param lonDeg Observer Longitude in degrees [-180, +180]
 * @param date Observation UTC timestamp
 */
export function equatorialToHorizontal(
  raRad: number,
  decRad: number,
  latDeg: number,
  lonDeg: number,
  date: Date,
): HorizontalCoords {
  const latRad = latDeg * DEG2RAD;
  const lmstRad = getLMSTRadians(date, lonDeg);
  const haRad = getHourAngleRadians(lmstRad, raRad);

  // Altitude sin(alt) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(ha)
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const clampedSinAlt = Math.max(-1.0, Math.min(1.0, sinAlt));
  const altRad = Math.asin(clampedSinAlt);

  // Azimuth calculation
  // tan(az) = -cos(dec)*sin(ha) / (sin(dec)*cos(lat) - cos(dec)*sin(lat)*cos(ha))
  const y = -Math.cos(decRad) * Math.sin(haRad);
  const x =
    Math.sin(decRad) * Math.cos(latRad) -
    Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad);

  let azRad = Math.atan2(y, x);
  if (azRad < 0) {
    azRad += 2.0 * Math.PI;
  }

  return {
    altitude: altRad * RAD2DEG,
    azimuth: azRad * RAD2DEG,
  };
}

/**
 * Converts Horizontal coordinates (Alt, Az) to Three.js Cartesian coordinates (X, Y, Z).
 * Celestial Sphere Convention:
 *   Radius r
 *   +Y = Zenith (Alt = +90°)
 *   -Z = True North (Az = 0°, Alt = 0°)
 *   +X = True East (Az = 90°, Alt = 0°)
 *   +Z = True South (Az = 180°, Alt = 0°)
 *   -X = True West (Az = 270°, Alt = 0°)
 */
export function horizontalToCartesian(
  altitudeDeg: number,
  azimuthDeg: number,
  radius = 1000,
): CartesianVector3 {
  const altRad = altitudeDeg * DEG2RAD;
  const azRad = azimuthDeg * DEG2RAD;

  const cosAlt = Math.cos(altRad);
  const sinAlt = Math.sin(altRad);

  // X = r * cos(alt) * sin(az) [East]
  // Y = r * sin(alt)           [Zenith]
  // Z = -r * cos(alt) * cos(az) [North is -Z]
  return {
    x: radius * cosAlt * Math.sin(azRad),
    y: radius * sinAlt,
    z: -radius * cosAlt * Math.cos(azRad),
  };
}

/**
 * Converts screen pixel (X, Y) back to directional angles or vice versa using viewport dimensions
 */
export function project3DToScreen(
  point: CartesianVector3,
  viewMatrix: number[], // 16-element float array
  projMatrix: number[], // 16-element float array
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } {
  // Multiply point by viewMatrix then projMatrix (4x4 matrix vector transform)
  const x = point.x,
    y = point.y,
    z = point.z;

  // View transform
  const vx =
    viewMatrix[0] * x + viewMatrix[4] * y + viewMatrix[8] * z + viewMatrix[12];
  const vy =
    viewMatrix[1] * x + viewMatrix[5] * y + viewMatrix[9] * z + viewMatrix[13];
  const vz =
    viewMatrix[2] * x + viewMatrix[6] * y + viewMatrix[10] * z + viewMatrix[14];
  const vw =
    viewMatrix[3] * x + viewMatrix[7] * y + viewMatrix[11] * z + viewMatrix[15];

  // Clip test
  if (vw <= 0) {
    return { x: -1, y: -1, visible: false };
  }

  // Projection transform
  const px =
    projMatrix[0] * vx +
    projMatrix[4] * vy +
    projMatrix[8] * vz +
    projMatrix[12] * vw;
  const py =
    projMatrix[1] * vx +
    projMatrix[5] * vy +
    projMatrix[9] * vz +
    projMatrix[13] * vw;
  const pw =
    projMatrix[3] * vx +
    projMatrix[7] * vy +
    projMatrix[11] * vz +
    projMatrix[15] * vw;

  if (pw <= 0) {
    return { x: -1, y: -1, visible: false };
  }

  const ndcX = px / pw;
  const ndcY = py / pw;

  const screenX = ((ndcX + 1.0) / 2.0) * width;
  const screenY = ((-ndcY + 1.0) / 2.0) * height;

  const visible = ndcX >= -1.1 && ndcX <= 1.1 && ndcY >= -1.1 && ndcY <= 1.1;

  return { x: screenX, y: screenY, visible };
}
