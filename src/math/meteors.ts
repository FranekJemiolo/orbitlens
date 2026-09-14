import { equatorialToHorizontal } from "./coordinates";
import type { ARObject } from "./coordinates";

export interface MeteorShower {
  name: string;
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  peakMonth: number;
  peakDay: number;
  raRad: number; // Radiant Right Ascension in radians
  decRad: number; // Radiant Declination in radians
  zhr: number; // Zenithal Hourly Rate
  velocityKmS: number;
}

export const METEOR_SHOWERS: MeteorShower[] = [
  {
    name: "Quadrantids",
    startMonth: 12,
    endMonth: 1,
    peakMonth: 1,
    peakDay: 4,
    raRad: 4.01,
    decRad: 0.855,
    zhr: 120,
    velocityKmS: 41,
  },
  {
    name: "Lyrids",
    startMonth: 4,
    endMonth: 4,
    peakMonth: 4,
    peakDay: 22,
    raRad: 4.73,
    decRad: 0.593,
    zhr: 18,
    velocityKmS: 49,
  },
  {
    name: "Eta Aquariids",
    startMonth: 4,
    endMonth: 5,
    peakMonth: 5,
    peakDay: 6,
    raRad: 5.89,
    decRad: -0.017,
    zhr: 50,
    velocityKmS: 66,
  },
  {
    name: "Perseids",
    startMonth: 7,
    endMonth: 8,
    peakMonth: 8,
    peakDay: 13,
    raRad: 0.802,
    decRad: 1.012,
    zhr: 100,
    velocityKmS: 59,
  },
  {
    name: "Orionids",
    startMonth: 10,
    endMonth: 11,
    peakMonth: 10,
    peakDay: 21,
    raRad: 1.66,
    decRad: 0.279,
    zhr: 20,
    velocityKmS: 66,
  },
  {
    name: "Leonids",
    startMonth: 11,
    endMonth: 11,
    peakMonth: 11,
    peakDay: 18,
    raRad: 2.65,
    decRad: 0.384,
    zhr: 15,
    velocityKmS: 71,
  },
  {
    name: "Geminids",
    startMonth: 12,
    endMonth: 12,
    peakMonth: 12,
    peakDay: 14,
    raRad: 1.956,
    decRad: 0.576,
    zhr: 150,
    velocityKmS: 35,
  },
  {
    name: "Ursids",
    startMonth: 12,
    endMonth: 12,
    peakMonth: 12,
    peakDay: 22,
    raRad: 3.79,
    decRad: 1.326,
    zhr: 10,
    velocityKmS: 33,
  },
];

/**
 * Returns active meteor showers for the specified date
 */
export function getActiveMeteorShowers(date: Date): MeteorShower[] {
  const month = date.getUTCMonth() + 1; // 1-12

  return METEOR_SHOWERS.filter((shower) => {
    if (shower.startMonth <= shower.endMonth) {
      return month >= shower.startMonth && month <= shower.endMonth;
    }
    // Wraps across new year (e.g. Dec - Jan)
    return month >= shower.startMonth || month <= shower.endMonth;
  });
}

/**
 * Calculates current horizontal positions of active meteor shower radiants
 */
export function getMeteorRadiantsARObjects(
  date: Date,
  latDeg: number,
  lonDeg: number,
): ARObject[] {
  const active = getActiveMeteorShowers(date);
  // If none strictly active in window, always show the nearest upcoming notable shower
  const targets = active.length > 0 ? active : [METEOR_SHOWERS[3]]; // Default to Perseids as flagship

  return targets.map((shower) => {
    const { altitude, azimuth } = equatorialToHorizontal(
      shower.raRad,
      shower.decRad,
      latDeg,
      lonDeg,
      date,
    );

    return {
      id: `meteor-${shower.name.toLowerCase().replace(/\s+/g, "-")}`,
      type: "METEOR",
      label: `${shower.name} Radiant`,
      altitude,
      azimuth,
      velocityKmh: shower.velocityKmS * 3600,
      metadata: {
        zhr: shower.zhr,
        peak: `${shower.peakMonth}/${shower.peakDay}`,
        velocityKmS: shower.velocityKmS,
      },
    };
  });
}
