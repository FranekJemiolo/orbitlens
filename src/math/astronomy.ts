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

export interface CelestialBodyEphemeris {
  name: string;
  type: "PLANET" | "STAR";
  raRad: number;
  decRad: number;
  distanceKm: number;
  magnitude: number;
  metadata?: Record<string, string | number | boolean>;
}

const AU_KM = 149597870.7;

/**
 * Computes the Sun's geocentric equatorial position
 */
export function getSunPosition(date: Date): CelestialBodyEphemeris {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0;

  const mRad = ((357.529 + 0.98560028 * d) % 360) * DEG2RAD;
  const lambdaRad =
    ((280.459 +
      0.98564736 * d +
      1.915 * Math.sin(mRad) +
      0.02 * Math.sin(2 * mRad)) %
      360) *
    DEG2RAD;
  const epsRad = (23.439 - 0.00000036 * d) * DEG2RAD;

  const sinLambda = Math.sin(lambdaRad);
  const cosLambda = Math.cos(lambdaRad);
  const sinEps = Math.sin(epsRad);
  const cosEps = Math.cos(epsRad);

  let raRad = Math.atan2(cosEps * sinLambda, cosLambda);
  if (raRad < 0) raRad += 2 * Math.PI;
  const decRad = Math.asin(sinEps * sinLambda);

  // Approximate distance in AU
  const rAu = 1.00014 - 0.01671 * Math.cos(mRad);

  return {
    name: "Sun",
    type: "STAR",
    raRad,
    decRad,
    distanceKm: Math.round(rAu * AU_KM),
    magnitude: -26.7,
    metadata: {
      spectralType: "G2V",
      classification: "Yellow Dwarf Star",
    },
  };
}

/**
 * Computes the Moon's geocentric position and phase
 */
export function getMoonPosition(date: Date): CelestialBodyEphemeris {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0;

  const lPrime = ((218.316 + 13.176396 * d) % 360) * DEG2RAD;
  const m = ((134.963 + 13.064993 * d) % 360) * DEG2RAD;
  const f = ((93.272 + 13.22935 * d) % 360) * DEG2RAD;

  const lambdaRad = lPrime + 6.289 * Math.sin(m) * DEG2RAD;
  const betaRad = 5.128 * Math.sin(f) * DEG2RAD;
  const epsRad = (23.439 - 0.00000036 * d) * DEG2RAD;

  const sinBeta = Math.sin(betaRad);
  const cosBeta = Math.cos(betaRad);
  const sinLambda = Math.sin(lambdaRad);
  const cosLambda = Math.cos(lambdaRad);
  const sinEps = Math.sin(epsRad);
  const cosEps = Math.cos(epsRad);

  const sinDec = sinBeta * cosEps + cosBeta * sinEps * sinLambda;
  const decRad = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const y = cosBeta * cosEps * sinLambda - sinBeta * sinEps;
  const x = cosBeta * cosLambda;
  let raRad = Math.atan2(y, x);
  if (raRad < 0) raRad += 2 * Math.PI;

  const distKm = Math.round(385000 - 20905 * Math.cos(m));

  // Moon phase calculation using elongation from Sun
  const sunPos = getSunPosition(date);
  let elongationDeg = (lambdaRad - sunPos.raRad) * RAD2DEG;
  elongationDeg = ((elongationDeg % 360) + 360) % 360;

  const illumination = Math.round(
    ((1 - Math.cos(elongationDeg * DEG2RAD)) / 2) * 100,
  );

  let phaseName = "New Moon";
  if (elongationDeg > 22.5 && elongationDeg <= 67.5)
    phaseName = "Waxing Crescent";
  else if (elongationDeg > 67.5 && elongationDeg <= 112.5)
    phaseName = "First Quarter";
  else if (elongationDeg > 112.5 && elongationDeg <= 157.5)
    phaseName = "Waxing Gibbous";
  else if (elongationDeg > 157.5 && elongationDeg <= 202.5)
    phaseName = "Full Moon";
  else if (elongationDeg > 202.5 && elongationDeg <= 247.5)
    phaseName = "Waning Gibbous";
  else if (elongationDeg > 247.5 && elongationDeg <= 292.5)
    phaseName = "Last Quarter";
  else if (elongationDeg > 292.5 && elongationDeg <= 337.5)
    phaseName = "Waning Crescent";

  return {
    name: "Moon",
    type: "PLANET",
    raRad,
    decRad,
    distanceKm: distKm,
    magnitude: -12.5,
    metadata: {
      phase: phaseName,
      illumination: `${illumination}%`,
      elongation: `${Math.round(elongationDeg)}°`,
    },
  };
}

interface PlanetElements {
  name: string;
  a: number; // AU
  e: number;
  iDeg: number;
  l0Deg: number;
  lRateDeg: number;
  periDeg: number;
  nodeDeg: number;
  mag0: number;
}

const PLANETS: PlanetElements[] = [
  {
    name: "Venus",
    a: 0.72333,
    e: 0.00677,
    iDeg: 3.39,
    l0Deg: 181.98,
    lRateDeg: 1.6021302,
    periDeg: 131.53,
    nodeDeg: 76.68,
    mag0: -4.4,
  },
  {
    name: "Mars",
    a: 1.52368,
    e: 0.0934,
    iDeg: 1.85,
    l0Deg: 355.45,
    lRateDeg: 0.524033,
    periDeg: 336.04,
    nodeDeg: 49.56,
    mag0: -1.5,
  },
  {
    name: "Jupiter",
    a: 5.2026,
    e: 0.04849,
    iDeg: 1.3,
    l0Deg: 34.4,
    lRateDeg: 0.0830853,
    periDeg: 14.75,
    nodeDeg: 100.56,
    mag0: -2.7,
  },
  {
    name: "Saturn",
    a: 9.5549,
    e: 0.05555,
    iDeg: 2.49,
    l0Deg: 49.94,
    lRateDeg: 0.0334442,
    periDeg: 92.43,
    nodeDeg: 113.72,
    mag0: 0.4,
  },
];

/**
 * Computes geocentric equatorial positions for major visible planets (Venus, Mars, Jupiter, Saturn)
 */
export function getMajorPlanetsPositions(date: Date): CelestialBodyEphemeris[] {
  const jd = getJulianDate(date);
  const d = jd - 2451545.0;
  const epsRad = (23.439 - 0.00000036 * d) * DEG2RAD;

  // Earth heliocentric position
  const meRad = ((357.529 + 0.98560028 * d) % 360) * DEG2RAD;
  const leRad =
    ((280.46 +
      0.98564736 * d +
      1.915 * Math.sin(meRad) +
      0.02 * Math.sin(2 * meRad)) %
      360) *
    DEG2RAD;
  const reAu = 1.00014 - 0.01671 * Math.cos(meRad);
  const xe = reAu * Math.cos(leRad);
  const ye = reAu * Math.sin(leRad);

  return PLANETS.map((planet) => {
    const lDeg = (planet.l0Deg + planet.lRateDeg * d) % 360;
    const mDeg = (lDeg - planet.periDeg + 360) % 360;
    const mRad = mDeg * DEG2RAD;

    // Kepler approximation: E = M + e*sin(M)
    const eRad = mRad + planet.e * Math.sin(mRad);
    const nuRad =
      2 *
      Math.atan2(
        Math.sqrt(1 + planet.e) * Math.sin(eRad / 2),
        Math.sqrt(1 - planet.e) * Math.cos(eRad / 2),
      );
    const rAu = planet.a * (1 - planet.e * Math.cos(eRad));

    const omegaRad = (planet.periDeg - planet.nodeDeg) * DEG2RAD;
    const nodeRad = planet.nodeDeg * DEG2RAD;
    const iRad = planet.iDeg * DEG2RAD;
    const uRad = omegaRad + nuRad;

    // Heliocentric coordinates
    const xh =
      rAu *
      (Math.cos(nodeRad) * Math.cos(uRad) -
        Math.sin(nodeRad) * Math.sin(uRad) * Math.cos(iRad));
    const yh =
      rAu *
      (Math.sin(nodeRad) * Math.cos(uRad) +
        Math.cos(nodeRad) * Math.sin(uRad) * Math.cos(iRad));
    const zh = rAu * (Math.sin(uRad) * Math.sin(iRad));

    // Geocentric coordinates
    const xg = xh - xe;
    const yg = yh - ye;
    const zg = zh;

    // Convert geocentric ecliptic to equatorial
    const cosEps = Math.cos(epsRad);
    const sinEps = Math.sin(epsRad);

    const xeq = xg;
    const yeq = yg * cosEps - zg * sinEps;
    const zeq = yg * sinEps + zg * cosEps;

    let raRad = Math.atan2(yeq, xeq);
    if (raRad < 0) raRad += 2 * Math.PI;
    const decRad = Math.atan2(zeq, Math.sqrt(xeq * xeq + yeq * yeq));

    const distAu = Math.sqrt(xg * xg + yg * yg + zg * zg);
    const distKm = Math.round(distAu * AU_KM);

    return {
      name: planet.name,
      type: "PLANET",
      raRad,
      decRad,
      distanceKm: distKm,
      magnitude: planet.mag0,
      metadata: {
        distanceAU: `${distAu.toFixed(2)} AU`,
        classification:
          planet.name === "Venus" || planet.name === "Mars"
            ? "Terrestrial Planet"
            : "Gas Giant",
      },
    };
  });
}
