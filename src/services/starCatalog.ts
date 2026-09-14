import * as THREE from "three";
import {
  equatorialToHorizontal,
  horizontalToCartesian,
} from "../math/coordinates";
import type { ARObject } from "../math/coordinates";
import {
  getMoonPosition,
  getSunPosition,
  getMajorPlanetsPositions,
} from "../math/astronomy";

export interface StarRecord {
  id: number;
  raRad: number;
  decRad: number;
  mag: number;
}

export interface ConstellationLine {
  name: string;
  lines: [[number, number], [number, number]][]; // [[ra1, dec1], [ra2, dec2]]
}

export interface NamedStarRecord {
  id: number;
  name: string;
  raRad: number;
  decRad: number;
  mag: number;
  constellation: string;
  spectralType: string;
}

export interface StarCatalogData {
  stars: StarRecord[];
  starPositions: Float32Array; // [x, y, z, x, y, z, ...]
  starSizes: Float32Array; // [size, size, ...]
  starColors: Float32Array; // [r, g, b, r, g, b, ...]
  constellationPositions: Float32Array; // Line segments for constellations
}

/**
 * Loads named prominent benchmark stars from public/data/named_stars.json
 */
export async function loadNamedStars(
  basePath = "./",
): Promise<NamedStarRecord[]> {
  try {
    const url = `${basePath.replace(/\/$/, "")}/data/named_stars.json`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return (await response.json()) as NamedStarRecord[];
  } catch {
    return [];
  }
}

/**
 * Converts named stars into ARObject entities for interactive targeting
 */
export function getNamedStarsARObjects(
  namedStars: NamedStarRecord[],
  observerLat: number,
  observerLon: number,
  date: Date,
): ARObject[] {
  return namedStars.map((star) => {
    const { altitude, azimuth } = equatorialToHorizontal(
      star.raRad,
      star.decRad,
      observerLat,
      observerLon,
      date,
    );
    return {
      id: `star-${star.id}`,
      type: "STAR",
      label: star.name,
      altitude,
      azimuth,
      magnitude: star.mag,
      metadata: {
        constellation: star.constellation,
        spectralType: star.spectralType,
        hygId: star.id,
      },
    };
  });
}

/**
 * Computes real-time ARObjects for the Moon, Sun, and major visible planets
 */
export function getSolarSystemARObjects(
  observerLat: number,
  observerLon: number,
  date: Date,
): ARObject[] {
  const bodies = [
    getMoonPosition(date),
    ...getMajorPlanetsPositions(date),
    getSunPosition(date),
  ];

  return bodies.map((body) => {
    const { altitude, azimuth } = equatorialToHorizontal(
      body.raRad,
      body.decRad,
      observerLat,
      observerLon,
      date,
    );

    return {
      id: `sol-${body.name.toLowerCase()}`,
      type: body.type,
      label: body.name,
      altitude,
      azimuth,
      magnitude: body.magnitude,
      distanceKm: body.distanceKm,
      metadata: body.metadata,
    };
  });
}

/**
 * Loads the 16-byte stride binary star catalog from public/data/stars.bin
 */
export async function loadBinaryStarCatalog(
  basePath = "./",
): Promise<StarRecord[]> {
  const url = `${basePath.replace(/\/$/, "")}/data/stars.bin`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch star catalog from ${url}: ${response.statusText}`,
    );
  }

  const buffer = await response.arrayBuffer();
  const stride = 16; // 4 bytes id (int32), 4 bytes ra (float32), 4 bytes dec (float32), 4 bytes mag (float32)
  const count = Math.floor(buffer.byteLength / stride);

  const dataView = new DataView(buffer);
  const stars: StarRecord[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const offset = i * stride;
    const id = dataView.getInt32(offset, true);
    const raRad = dataView.getFloat32(offset + 4, true);
    const decRad = dataView.getFloat32(offset + 8, true);
    const mag = dataView.getFloat32(offset + 12, true);

    stars[i] = { id, raRad, decRad, mag };
  }

  return stars;
}

/**
 * Loads constellation stick figures from public/data/constellations.json
 */
export async function loadConstellations(
  basePath = "./",
): Promise<ConstellationLine[]> {
  try {
    const url = `${basePath.replace(/\/$/, "")}/data/constellations.json`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return (await response.json()) as ConstellationLine[];
  } catch {
    return [];
  }
}

/**
 * Generates Three.js vertex attributes for stars and constellations
 * given current observer location and observation timestamp.
 */
export function buildCelestialGeometry(
  stars: StarRecord[],
  constellations: ConstellationLine[],
  observerLat: number,
  observerLon: number,
  date: Date,
  radius = 1000,
): {
  starGeometry: THREE.BufferGeometry;
  constellationGeometry: THREE.BufferGeometry;
} {
  const starCount = stars.length;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const star = stars[i];
    const { altitude, azimuth } = equatorialToHorizontal(
      star.raRad,
      star.decRad,
      observerLat,
      observerLon,
      date,
    );

    const pos = horizontalToCartesian(altitude, azimuth, radius);
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    // Magnitude scaling: Sirius (-1.46) is largest, mag 6.0 is smallest
    // mag <= 0 -> size ~ 8, mag 6 -> size ~ 2
    const normalizedMag = Math.max(-1.5, Math.min(6.0, star.mag));
    const size = Math.max(1.8, 8.0 - normalizedMag * 1.0);
    sizes[i] = size;

    // Color brightness and temperature
    const brightness = Math.max(
      0.3,
      Math.min(1.0, 1.0 - (normalizedMag - -1.5) / 7.5),
    );
    if (star.mag < 1.0) {
      // Very bright stars have blue/white/golden tint
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.96;
      colors[i * 3 + 2] = brightness * 0.9;
    } else {
      colors[i * 3] = brightness * 0.9;
      colors[i * 3 + 1] = brightness * 0.95;
      colors[i * 3 + 2] = brightness;
    }
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Build Constellation Line Segments
  const linePoints: number[] = [];
  for (const constellation of constellations) {
    for (const line of constellation.lines) {
      const [p1, p2] = line;
      const h1 = equatorialToHorizontal(
        p1[0],
        p1[1],
        observerLat,
        observerLon,
        date,
      );
      const h2 = equatorialToHorizontal(
        p2[0],
        p2[1],
        observerLat,
        observerLon,
        date,
      );

      const c1 = horizontalToCartesian(h1.altitude, h1.azimuth, radius * 0.99);
      const c2 = horizontalToCartesian(h2.altitude, h2.azimuth, radius * 0.99);

      linePoints.push(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
    }
  }

  const constellationGeometry = new THREE.BufferGeometry();
  if (linePoints.length > 0) {
    const linePos = new Float32Array(linePoints);
    constellationGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePos, 3),
    );
  }

  return { starGeometry, constellationGeometry };
}
