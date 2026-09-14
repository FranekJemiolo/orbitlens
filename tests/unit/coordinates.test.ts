import { describe, it, expect } from "vitest";
import {
  equatorialToHorizontal,
  horizontalToCartesian,
  project3DToScreen,
} from "../../src/math/coordinates";
import { getGMSTDegrees, getJulianDate } from "../../src/math/astronomy";

describe("Celestial Astronomy & Coordinates Math", () => {
  it("should accurately compute Julian Date for J2000.0 epoch", () => {
    // 2000-01-01 12:00:00 UTC corresponds to JD 2451545.0
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const jd = getJulianDate(j2000);
    expect(jd).toBeCloseTo(2451545.0, 4);
  });

  it("should compute Greenwich Mean Sidereal Time within astronomical accuracy", () => {
    // At J2000.0 epoch, GMST is approximately 280.4606 degrees (18.697 hours)
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const gmst = getGMSTDegrees(j2000);
    expect(gmst).toBeCloseTo(280.4606, 2);
  });

  it("should assert Polaris resolves to Altitude approximately equal to observer Latitude and Azimuth near North", () => {
    // Polaris: RA ≈ 2.53h (0.662 rad), Dec ≈ +89.26° (1.5579 rad)
    const polarisRa = 0.662;
    const polarisDec = 1.5579;

    const observerLat = 52.2297; // Warsaw, Poland (~52° N)
    const observerLon = 21.0122;
    const testDate = new Date(Date.UTC(2026, 8, 14, 22, 0, 0));

    const { altitude, azimuth } = equatorialToHorizontal(
      polarisRa,
      polarisDec,
      observerLat,
      observerLon,
      testDate,
    );

    // Altitude of Polaris must be within 1.5 degrees of observer's latitude
    expect(Math.abs(altitude - observerLat)).toBeLessThan(1.5);

    // Azimuth must be within ~2.5 degrees of True North (0 or 360)
    const northDeviation = Math.min(azimuth, 360 - azimuth);
    expect(northDeviation).toBeLessThan(2.5);
  });

  it("should accurately convert horizontal coordinates to 3D Cartesian coordinates", () => {
    // Zenith (Alt = 90°, Az = 0°) -> (0, r, 0)
    const zenith = horizontalToCartesian(90, 0, 1000);
    expect(zenith.x).toBeCloseTo(0, 1);
    expect(zenith.y).toBeCloseTo(1000, 1);
    expect(zenith.z).toBeCloseTo(0, 1);

    // True North on Horizon (Alt = 0°, Az = 0°) -> (0, 0, -r)
    const north = horizontalToCartesian(0, 0, 1000);
    expect(north.x).toBeCloseTo(0, 1);
    expect(north.y).toBeCloseTo(0, 1);
    expect(north.z).toBeCloseTo(-1000, 1);

    // True East on Horizon (Alt = 0°, Az = 90°) -> (r, 0, 0)
    const east = horizontalToCartesian(0, 90, 1000);
    expect(east.x).toBeCloseTo(1000, 1);
    expect(east.y).toBeCloseTo(0, 1);
    expect(east.z).toBeCloseTo(0, 1);
  });

  it("should project a point in front of camera onto screen coordinates", () => {
    // Identity view, standard projection
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    // Simple projection matrix where z=-1 maps forward
    const proj = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -2, 0];

    const screen = project3DToScreen(
      { x: 0, y: 0, z: -10 },
      identity,
      proj,
      800,
      600,
    );
    expect(screen.visible).toBe(true);
    expect(screen.x).toBeCloseTo(400, 1); // Center X
    expect(screen.y).toBeCloseTo(300, 1); // Center Y
  });
});
