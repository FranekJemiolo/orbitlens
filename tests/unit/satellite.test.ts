import { describe, it, expect } from "vitest";
import {
  propagateSatellite,
  satelliteToARObject,
  propagateSatelliteOrbitTrack,
} from "../../src/math/satellite";
import type { SatelliteTLE } from "../../src/math/satellite";

describe("SGP4 Satellite Orbit Propagator", () => {
  // Official historical ISS (ZARYA) TLE
  const issTLE: SatelliteTLE = {
    name: "ISS (ZARYA)",
    line1:
      "1 25544U 98067A   23257.54583333  .00016717  00000-0  10270-3 0  9002",
    line2:
      "2 25544  51.6416 182.9085 0005244  43.2796  80.2845 15.49815042415178",
    type: "ISS",
  };

  it("should propagate ISS position at epoch without errors", () => {
    // Epoch timestamp for 23257.54583333 is approximately 2023-09-14 13:06:00 UTC
    const date = new Date(Date.UTC(2023, 8, 14, 13, 6, 0));
    const observerLat = 51.5074; // London, UK
    const observerLon = -0.1278;
    const observerAlt = 35; // 35m

    const angles = propagateSatellite(
      issTLE,
      observerLat,
      observerLon,
      observerAlt,
      date,
    );
    expect(angles).not.toBeNull();
    if (angles) {
      expect(angles.altitude).toBeGreaterThanOrEqual(-90);
      expect(angles.altitude).toBeLessThanOrEqual(90);
      expect(angles.azimuth).toBeGreaterThanOrEqual(0);
      expect(angles.azimuth).toBeLessThanOrEqual(360);
      // ISS orbital height is typically 400 - 430 km
      expect(angles.heightKm).toBeGreaterThan(400);
      expect(angles.heightKm).toBeLessThan(440);
      // Orbital speed of ISS in LEO is approx 27,600 km/h (7.66 km/s)
      expect(angles.velocityKmh).toBeGreaterThan(27000);
      expect(angles.velocityKmh).toBeLessThan(28500);
    }
  });

  it("should convert satellite into ARObject entity structure", () => {
    const date = new Date(Date.UTC(2023, 8, 14, 13, 6, 0));
    const obj = satelliteToARObject(issTLE, 0, 0, 0, date);

    expect(obj).not.toBeNull();
    if (obj) {
      expect(obj.type).toBe("SATELLITE");
      expect(obj.label).toBe("ISS (ZARYA)");
      expect(obj.id).toBe("sat-iss-(zarya)");
      expect(obj.magnitude).toBe(-2.5); // ISS is bright
      expect(typeof obj.distanceKm).toBe("number");
      expect(typeof obj.velocityKmh).toBe("number");
    }
  });

  it("should compute multi-point satellite orbital trajectory track", () => {
    const date = new Date(Date.UTC(2023, 8, 14, 13, 6, 0));
    const track = propagateSatelliteOrbitTrack(
      issTLE,
      51.5074,
      -0.1278,
      35,
      date,
      60,
      5,
    );

    expect(track.length).toBeGreaterThan(5);
    for (const pt of track) {
      expect(pt.altitude).toBeGreaterThanOrEqual(-90);
      expect(pt.altitude).toBeLessThanOrEqual(90);
      expect(pt.azimuth).toBeGreaterThanOrEqual(0);
      expect(pt.azimuth).toBeLessThanOrEqual(360);
    }
  });

  it("should gracefully handle malformed TLE lines without throwing exceptions", () => {
    const brokenTLE: SatelliteTLE = {
      name: "INVALID",
      line1: "1 00000 INVALID TLE LINE 1",
      line2: "2 00000 INVALID TLE LINE 2",
    };
    const date = new Date();
    const result = propagateSatellite(brokenTLE, 0, 0, 0, date);
    expect(result).toBeNull();
  });
});
