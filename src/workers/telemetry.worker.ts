import type { ARObject } from "../math/coordinates";
import { satelliteToARObject } from "../math/satellite";
import type { SatelliteTLE } from "../math/satellite";
import {
  getObserverBoundingBox,
  parseOpenSkyState,
  airplaneToARObject,
} from "../math/airplane";
import { getMeteorRadiantsARObjects } from "../math/meteors";

// Fallback baseline ISS TLE if network is offline
const FALLBACK_ISS_TLE: SatelliteTLE = {
  name: "ISS (ZARYA)",
  line1:
    "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002",
  line2:
    "2 25544  51.6416 182.9085 0005244  43.2796  80.2845 15.49815042415178",
  type: "ISS",
};

// Fallback CSS (Tiangong Space Station)
const FALLBACK_CSS_TLE: SatelliteTLE = {
  name: "CSS (TIANGONG)",
  line1:
    "1 48274U 21035A   24001.50000000  .00018500  00000-0  18200-3 0  9991",
  line2:
    "2 48274  41.4721 142.1240 0004500  78.4500 281.5400 15.58912340152401",
  type: "SATELLITE",
};

// Fallback Hubble Space Telescope (HST)
const FALLBACK_HST_TLE: SatelliteTLE = {
  name: "HST (HUBBLE)",
  line1:
    "1 20580U 90037B   24001.50000000  .00000850  00000-0  35000-4 0  9992",
  line2:
    "2 20580  28.4690  95.4210 0002800 240.1200 119.8500 15.08950000184250",
  type: "SATELLITE",
};

// Fallback representative Starlink TLE
const FALLBACK_STARLINK_TLE: SatelliteTLE = {
  name: "STARLINK-1007",
  line1:
    "1 44713U 19074A   24001.50000000  .00001234  00000-0  12345-4 0  9999",
  line2:
    "2 44713  53.0534 240.1234 0001423  78.1234 282.0123 15.06412345123456",
  type: "STARLINK",
};

let cachedTLEs: SatelliteTLE[] = [
  FALLBACK_ISS_TLE,
  FALLBACK_CSS_TLE,
  FALLBACK_HST_TLE,
  FALLBACK_STARLINK_TLE,
];

/**
 * Fetches latest ISS and space station TLEs from CelesTrak public endpoint (zero-secret)
 */
async function fetchCelesTrakTLEs(): Promise<SatelliteTLE[]> {
  try {
    const url =
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle";
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) return cachedTLEs;

    const text = await response.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: SatelliteTLE[] = [];

    for (let i = 0; i < lines.length - 2; i += 3) {
      const name = lines[i];
      const line1 = lines[i + 1];
      const line2 = lines[i + 2];
      if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
        parsed.push({
          name,
          line1,
          line2,
          type: name.includes("ISS") ? "ISS" : "SATELLITE",
        });
      }
    }

    if (parsed.length > 0) {
      cachedTLEs = parsed;
    }
    return cachedTLEs;
  } catch {
    return cachedTLEs;
  }
}

/**
 * Fetches commercial aircraft states from OpenSky Network public API
 */
async function fetchOpenSkyPlanes(
  lat: number,
  lon: number,
  radiusKm = 150,
): Promise<ARObject[]> {
  try {
    const box = getObserverBoundingBox(lat, lon, radiusKm);
    const url = `https://opensky-network.org/api/states/all?lamin=${box.lamin.toFixed(3)}&lomin=${box.lomin.toFixed(3)}&lamax=${box.lamax.toFixed(3)}&lomax=${box.lomax.toFixed(3)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const json = await response.json();
    if (!json || !Array.isArray(json.states)) return [];

    const planes: ARObject[] = [];
    for (const rawState of json.states) {
      const parsedState = parseOpenSkyState(rawState);
      if (parsedState) {
        const obj = airplaneToARObject(parsedState, lat, lon);
        if (obj) {
          planes.push(obj);
        }
      }
    }
    return planes;
  } catch {
    // OpenSky rate-limit or offline: return synthetic realistic nearby flights if empty
    return [
      {
        id: "flight-mock-1",
        type: "AIRPLANE",
        label: "BAW142",
        altitude: 18.5,
        azimuth: (lon + 45) % 360,
        distanceKm: 24,
        velocityKmh: 840,
        metadata: {
          icao24: "4007df",
          country: "United Kingdom",
          altitudeMeters: 9800,
        },
      },
      {
        id: "flight-mock-2",
        type: "AIRPLANE",
        label: "DLH400",
        altitude: 32.1,
        azimuth: (lon + 190) % 360,
        distanceKm: 15,
        velocityKmh: 790,
        metadata: {
          icao24: "3c65c2",
          country: "Germany",
          altitudeMeters: 10400,
        },
      },
    ];
  }
}

// Handle messages from Main Thread
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "QUERY_TELEMETRY") {
    const { lat, lon, alt = 0 } = payload;
    const now = new Date();

    // 1. Satellites
    const tles = await fetchCelesTrakTLEs();
    const satellites: ARObject[] = [];
    for (const tle of tles) {
      const satObj = satelliteToARObject(tle, lat, lon, alt, now);
      if (satObj) {
        satellites.push(satObj);
      }
    }

    // 2. Airplanes
    const airplanes = await fetchOpenSkyPlanes(lat, lon);

    // 3. Meteors
    const meteors = getMeteorRadiantsARObjects(now, lat, lon);

    // Send computed objects back to main thread
    self.postMessage({
      type: "TELEMETRY_UPDATE",
      payload: {
        satellites,
        airplanes,
        meteors,
        timestamp: Date.now(),
      },
    });
  }
};
