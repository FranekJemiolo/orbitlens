import type { DeviceOrientationEuler } from "../math/deviceOrientation";

export interface LocationState {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  accuracy: number;
  isAvailable: boolean;
  isManual?: boolean;
  name?: string;
}

export interface WorldLocationPreset {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  description: string;
}

export const WORLD_PRESETS: WorldLocationPreset[] = [
  {
    id: "london",
    name: "London, UK",
    region: "Northern Europe (51.5°N)",
    latitude: 51.5074,
    longitude: -0.1278,
    altitudeMeters: 35,
    description: "Prime Meridian reference, high northern latitude.",
  },
  {
    id: "new-york",
    name: "New York, USA",
    region: "North America (40.7°N)",
    latitude: 40.7128,
    longitude: -74.006,
    altitudeMeters: 10,
    description: "Mid-northern latitude observer.",
  },
  {
    id: "tokyo",
    name: "Tokyo, Japan",
    region: "East Asia (35.7°N)",
    latitude: 35.6762,
    longitude: 139.6503,
    altitudeMeters: 40,
    description: "Eastern hemisphere night sky.",
  },
  {
    id: "sydney",
    name: "Sydney, Australia",
    region: "Southern Hemisphere (33.9°S)",
    latitude: -33.8688,
    longitude: 151.2093,
    altitudeMeters: 25,
    description: "Southern Cross & Magellanic Clouds visible.",
  },
  {
    id: "mauna-kea",
    name: "Mauna Kea, Hawaii",
    region: "Dark Sky Reserve (19.8°N)",
    latitude: 19.8206,
    longitude: -155.4681,
    altitudeMeters: 4205,
    description: "Premier astronomical observatory high altitude summit.",
  },
  {
    id: "warsaw",
    name: "Warsaw, Poland",
    region: "Central Europe (52.2°N)",
    latitude: 52.2297,
    longitude: 21.0122,
    altitudeMeters: 100,
    description: "Central European observatory baseline.",
  },
  {
    id: "atacama",
    name: "Atacama Desert, Chile",
    region: "Dark Sky Reserve (23.8°S)",
    latitude: -23.8634,
    longitude: -69.1328,
    altitudeMeters: 2400,
    description:
      "World's clearest dark skies with crisp southern celestial sphere.",
  },
];

export type OrientationListener = (
  orientation: DeviceOrientationEuler,
  screenAngle: number,
) => void;
export type LocationListener = (location: LocationState) => void;

export class SensorService {
  private orientationListeners: Set<OrientationListener> = new Set();
  private locationListeners: Set<LocationListener> = new Set();
  private watchId: number | null = null;
  public isManualLocation = false;

  public currentLocation: LocationState = {
    latitude: 52.2297, // Default fallback (Warsaw)
    longitude: 21.0122,
    altitudeMeters: 100,
    accuracy: 10,
    isAvailable: false,
    name: "Warsaw (Default)",
  };

  public currentOrientation: DeviceOrientationEuler = {
    alpha: 0,
    beta: 90, // Holding phone upright facing horizon
    gamma: 0,
  };

  private boundHandleOrientation = this.handleOrientation.bind(this);

  private isTracking = false;

  /**
   * Requests DeviceOrientation permission on iOS 13+ devices
   */
  async requestOrientationPermission(): Promise<boolean> {
    const DeviceOrientationEventAny =
      window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

    if (typeof DeviceOrientationEventAny?.requestPermission === "function") {
      try {
        const response = await DeviceOrientationEventAny.requestPermission();
        if (response === "granted") {
          this.startOrientationTracking();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    } else {
      // Android and non-iOS standard browsers do not require permission prompt
      this.startOrientationTracking();
      return true;
    }
  }

  startOrientationTracking(): void {
    if (this.isTracking || typeof window === "undefined") return;
    this.isTracking = true;

    // Prefer deviceorientationabsolute on Android Chrome if available
    if ("ondeviceorientationabsolute" in window) {
      window.addEventListener(
        "deviceorientationabsolute" as unknown as "deviceorientation",
        this.boundHandleOrientation,
        true,
      );
    }
    window.addEventListener(
      "deviceorientation",
      this.boundHandleOrientation,
      true,
    );
  }

  stopOrientationTracking(): void {
    if (!this.isTracking || typeof window === "undefined") return;
    this.isTracking = false;

    if ("ondeviceorientationabsolute" in window) {
      window.removeEventListener(
        "deviceorientationabsolute" as unknown as "deviceorientation",
        this.boundHandleOrientation,
        true,
      );
    }
    window.removeEventListener(
      "deviceorientation",
      this.boundHandleOrientation,
      true,
    );
  }

  setManualLocation(
    latitude: number,
    longitude: number,
    altitudeMeters = 50,
    name = "Custom Location",
  ): void {
    this.isManualLocation = true;
    this.currentLocation = {
      latitude,
      longitude,
      altitudeMeters,
      accuracy: 1,
      isAvailable: true,
      isManual: true,
      name,
    };
    this.notifyLocationListeners();
  }

  resetToDeviceGPS(): void {
    this.isManualLocation = false;
    this.startGeolocationTracking();
  }

  startGeolocationTracking(): void {
    if (!navigator.geolocation) return;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (this.isManualLocation) return;
        this.currentLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitudeMeters: pos.coords.altitude ?? 0,
          accuracy: pos.coords.accuracy,
          isAvailable: true,
          isManual: false,
          name: "GPS Lock",
        };
        this.notifyLocationListeners();
      },
      (err) => {
        console.warn("Geolocation error / fallback active:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );
  }

  stopGeolocationTracking(): void {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private handleOrientation(event: DeviceOrientationEvent): void {
    const screenAngle =
      window.screen?.orientation?.angle ??
      (typeof window.orientation === "number" ? window.orientation : 0);

    // iOS webkitCompassHeading is absolute true north if available
    const webkitHeading = (
      event as unknown as { webkitCompassHeading?: number }
    ).webkitCompassHeading;

    this.currentOrientation = {
      alpha: webkitHeading ?? event.alpha ?? 0,
      beta: event.beta ?? 90,
      gamma: event.gamma ?? 0,
      compassHeading: webkitHeading ?? null,
    };

    this.orientationListeners.forEach((listener) =>
      listener(this.currentOrientation, screenAngle),
    );
  }

  private notifyLocationListeners(): void {
    this.locationListeners.forEach((listener) =>
      listener(this.currentLocation),
    );
  }

  onOrientation(listener: OrientationListener): () => void {
    this.orientationListeners.add(listener);

    // If permission prompt is not required (e.g. Android/Chrome/Desktop), start tracking immediately
    const DeviceOrientationEventAny =
      typeof window !== "undefined"
        ? (window.DeviceOrientationEvent as unknown as {
            requestPermission?: unknown;
          })
        : null;

    if (
      !DeviceOrientationEventAny ||
      typeof DeviceOrientationEventAny.requestPermission !== "function"
    ) {
      this.startOrientationTracking();
    }

    return () => this.orientationListeners.delete(listener);
  }

  onLocation(listener: LocationListener): () => void {
    this.locationListeners.add(listener);
    listener(this.currentLocation);
    return () => this.locationListeners.delete(listener);
  }
}

export const sensorService = new SensorService();
