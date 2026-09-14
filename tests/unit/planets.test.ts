import { describe, it, expect } from "vitest";
import {
  getSunPosition,
  getMoonPosition,
  getMajorPlanetsPositions,
} from "../../src/math/astronomy";
import { getSolarSystemARObjects } from "../../src/services/starCatalog";
import { computeDynamicFov } from "../../src/math/coordinates";

describe("Solar System Ephemeris & Astronomy Calculations", () => {
  const testDate = new Date("2026-09-14T12:00:00Z");

  it("should calculate valid Sun position and distance", () => {
    const sun = getSunPosition(testDate);
    expect(sun.name).toBe("Sun");
    expect(sun.raRad).toBeGreaterThanOrEqual(0);
    expect(sun.raRad).toBeLessThan(2 * Math.PI);
    expect(sun.decRad).toBeGreaterThan(-Math.PI / 2);
    expect(sun.decRad).toBeLessThan(Math.PI / 2);
    // Sun distance in km should be between 147M and 153M km
    expect(sun.distanceKm).toBeGreaterThan(147000000);
    expect(sun.distanceKm).toBeLessThan(153000000);
    expect(sun.magnitude).toBe(-26.7);
  });

  it("should calculate valid Moon position, distance, and phase", () => {
    const moon = getMoonPosition(testDate);
    expect(moon.name).toBe("Moon");
    expect(moon.distanceKm).toBeGreaterThan(350000);
    expect(moon.distanceKm).toBeLessThan(410000);
    expect(moon.metadata?.phase).toBeDefined();
    expect(typeof moon.metadata?.illumination).toBe("string");
  });

  it("should compute positions for Venus, Mars, Jupiter, and Saturn", () => {
    const planets = getMajorPlanetsPositions(testDate);
    expect(planets.length).toBe(4);

    const names = planets.map((p) => p.name);
    expect(names).toContain("Venus");
    expect(names).toContain("Mars");
    expect(names).toContain("Jupiter");
    expect(names).toContain("Saturn");

    for (const p of planets) {
      expect(p.raRad).toBeGreaterThanOrEqual(0);
      expect(p.raRad).toBeLessThan(2 * Math.PI);
      expect(p.distanceKm).toBeGreaterThan(30000000); // Greater than 30M km
    }
  });

  it("should convert Solar System bodies to topocentric horizontal ARObjects", () => {
    const arObjects = getSolarSystemARObjects(52.2297, 21.0122, testDate);
    expect(arObjects.length).toBe(6); // Moon, Venus, Mars, Jupiter, Saturn, Sun

    for (const obj of arObjects) {
      expect(obj.altitude).toBeGreaterThanOrEqual(-90);
      expect(obj.altitude).toBeLessThanOrEqual(90);
      expect(obj.azimuth).toBeGreaterThanOrEqual(0);
      expect(obj.azimuth).toBeLessThan(360);
    }
  });

  it("should compute dynamic horizontal and vertical FOV correctly", () => {
    // 65 deg vFov at 16:9 aspect ratio
    const fov = computeDynamicFov(65, 16 / 9);
    expect(fov.vFov).toBe(65);
    expect(fov.hFov).toBeGreaterThan(90);
    expect(fov.hFov).toBeLessThan(110);
  });
});
