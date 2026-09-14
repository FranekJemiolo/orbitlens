import type { DeviceOrientationEuler } from "../math/deviceOrientation";

export interface LocationState {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  accuracy: number;
  isAvailable: boolean;
}

export type OrientationListener = (
  orientation: DeviceOrientationEuler,
  screenAngle: number,
) => void;
export type LocationListener = (location: LocationState) => void;

export class SensorService {
  private orientationListeners: Set<OrientationListener> = new Set();
  private locationListeners: Set<LocationListener> = new Set();
  private watchId: number | null = null;

  public currentLocation: LocationState = {
    latitude: 52.2297, // Default fallback (Warsaw)
    longitude: 21.0122,
    altitudeMeters: 100,
    accuracy: 10,
    isAvailable: false,
  };

  public currentOrientation: DeviceOrientationEuler = {
    alpha: 0,
    beta: 90, // Holding phone upright facing horizon
    gamma: 0,
  };

  private boundHandleOrientation = this.handleOrientation.bind(this);

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
    window.addEventListener(
      "deviceorientation",
      this.boundHandleOrientation,
      true,
    );
  }

  stopOrientationTracking(): void {
    window.removeEventListener(
      "deviceorientation",
      this.boundHandleOrientation,
      true,
    );
  }

  startGeolocationTracking(): void {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.currentLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitudeMeters: pos.coords.altitude ?? 0,
          accuracy: pos.coords.accuracy,
          isAvailable: true,
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
    return () => this.orientationListeners.delete(listener);
  }

  onLocation(listener: LocationListener): () => void {
    this.locationListeners.add(listener);
    listener(this.currentLocation);
    return () => this.locationListeners.delete(listener);
  }
}

export const sensorService = new SensorService();
