import { describe, it, expect } from "vitest";
import {
  parseOpenSkyState,
  airplaneToARObject,
  getObserverBoundingBox,
  getGroundDistanceAndBearing,
} from "../../src/math/airplane";
import {
  getActiveMeteorShowers,
  getMeteorRadiantsARObjects,
} from "../../src/math/meteors";

describe("Telemetry Adapters (OpenSky, Meteors)", () => {
  describe("OpenSky Network Adapter", () => {
    it("should compute observer bounding box with correct geographic deltas", () => {
      const box = getObserverBoundingBox(40.0, -74.0, 111.32); // 111.32 km ~ 1 deg lat
      expect(box.lamin).toBeCloseTo(39.0, 1);
      expect(box.lamax).toBeCloseTo(41.0, 1);
      expect(box.lomin).toBeLessThan(-74.0);
      expect(box.lomax).toBeGreaterThan(-74.0);
    });

    it("should parse raw OpenSky state vector array correctly", () => {
      // Mock OpenSky state vector
      const raw = [
        "484bb8", // 0: icao24
        "LOT3805 ", // 1: callsign
        "Poland", // 2: origin_country
        1694697600, // 3: time_position
        1694697601, // 4: last_contact
        21.0122, // 5: longitude
        52.2297, // 6: latitude
        10668, // 7: baro_altitude (meters)
        false, // 8: on_ground
        230.5, // 9: velocity (m/s)
        185.0, // 10: true_track
        -1.5, // 11: vertical_rate
        null, // 12: sensors
        10800, // 13: geo_altitude
      ];

      const plane = parseOpenSkyState(raw);
      expect(plane).not.toBeNull();
      expect(plane?.icao24).toBe("484bb8");
      expect(plane?.callsign).toBe("LOT3805");
      expect(plane?.originCountry).toBe("Poland");
      expect(plane?.latitude).toBe(52.2297);
      expect(plane?.longitude).toBe(21.0122);
      expect(plane?.baroAltitudeMeters).toBe(10668);
      expect(plane?.onGround).toBe(false);
    });

    it("should convert aircraft state into ARObject relative to observer", () => {
      const plane = {
        icao24: "484bb8",
        callsign: "LOT3805",
        originCountry: "Poland",
        timePosition: 1694697600,
        lastContact: 1694697601,
        longitude: 21.0122,
        latitude: 52.3297, // ~11 km North of observer
        baroAltitudeMeters: 10000,
        onGround: false,
        velocityMps: 250, // 900 km/h
        trueTrackDeg: 180,
        verticalRateMps: 0,
        geoAltitudeMeters: 10000,
      };

      const observerLat = 52.2297;
      const observerLon = 21.0122;

      const obj = airplaneToARObject(plane, observerLat, observerLon, 0);
      expect(obj).not.toBeNull();
      if (obj) {
        expect(obj.type).toBe("AIRPLANE");
        expect(obj.label).toBe("LOT3805");
        expect(obj.distanceKm).toBeGreaterThan(5);
        expect(obj.velocityKmh).toBe(900);
        // Plane is directly north of observer, so azimuth should be near 0/360
        expect(Math.min(obj.azimuth, 360 - obj.azimuth)).toBeLessThan(5);
      }
    });

    it("should calculate ground distance and bearing accurately", () => {
      // From Equator (0,0) to 1 degree North (1,0): distance ~ 111 km, bearing = 0°
      const { distanceKm, bearingDeg } = getGroundDistanceAndBearing(
        0,
        0,
        1,
        0,
      );
      expect(distanceKm).toBeCloseTo(111.2, 0);
      expect(bearingDeg).toBeCloseTo(0, 1);
    });
  });

  describe("Meteor Shower Adapter", () => {
    it("should identify Perseids as active during August", () => {
      const augustDate = new Date(Date.UTC(2026, 7, 12, 22, 0, 0)); // Month index 7 = August
      const showers = getActiveMeteorShowers(augustDate);
      const perseids = showers.find((s) => s.name === "Perseids");
      expect(perseids).toBeDefined();
      expect(perseids?.zhr).toBe(100);
    });

    it("should generate ARObject radiant coordinates for an observer", () => {
      const testDate = new Date(Date.UTC(2026, 7, 12, 22, 0, 0));
      const radiants = getMeteorRadiantsARObjects(testDate, 45, 0);
      expect(radiants.length).toBeGreaterThan(0);
      const radiant = radiants[0];
      expect(radiant.type).toBe("METEOR");
      expect(typeof radiant.altitude).toBe("number");
      expect(typeof radiant.azimuth).toBe("number");
    });
  });
});
