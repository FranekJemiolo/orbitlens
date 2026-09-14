/**
 * Astronomy Math: Julian Date, Sidereal Time, and Hour Angles
 * Standard astronomical formulations (IAU SOFA / Meeus Astronomical Algorithms)
 */

export const DEG2RAD = Math.PI / 180.0;
export const RAD2DEG = 180.0 / Math.PI;

/**
 * Calculates Julian Date from a JavaScript Date object (UTC)
 */
export function getJulianDate(date: Date): number {
  const time = date.getTime();
  return time / 86400000.0 + 2440587.5;
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in degrees [0, 360)
 * Uses the IAU formula for GMST at 0h UT1 plus Earth rotation.
 */
export function getGMSTDegrees(date: Date): number {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0; // Days since J2000.0
  const T = d / 36525.0; // Julian centuries since J2000.0

  // GMST in degrees
  let gmst =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmst = ((gmst % 360.0) + 360.0) % 360.0;
  return gmst;
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in radians [0, 2pi)
 */
export function getGMSTRadians(date: Date): number {
  return getGMSTDegrees(date) * DEG2RAD;
}

/**
 * Calculates Local Sidereal Time (LMST) in radians [0, 2pi)
 * @param date Current UTC timestamp
 * @param longitudeDeg Observer longitude in decimal degrees (-180 to +180, East positive)
 */
export function getLMSTRadians(date: Date, longitudeDeg: number): number {
  const gmst = getGMSTRadians(date);
  const lonRad = longitudeDeg * DEG2RAD;
  let lmst = (gmst + lonRad) % (2.0 * Math.PI);
  if (lmst < 0) {
    lmst += 2.0 * Math.PI;
  }
  return lmst;
}

/**
 * Calculates Local Hour Angle (LHA) in radians [-pi, +pi]
 * @param lmstRad Local sidereal time in radians
 * @param raRad Right Ascension of the celestial object in radians
 */
export function getHourAngleRadians(lmstRad: number, raRad: number): number {
  let ha = lmstRad - raRad;
  while (ha < -Math.PI) ha += 2.0 * Math.PI;
  while (ha > Math.PI) ha -= 2.0 * Math.PI;
  return ha;
}
