import { useState, useEffect, useRef } from "react";
import { ARView } from "./components/ARView";
import { CompassHUD } from "./components/CompassHUD";
import { Reticle } from "./components/Reticle";
import { EntityOverlay } from "./components/EntityOverlay";
import { ControlPanel } from "./components/ControlPanel";
import { RecordingControls } from "./components/RecordingControls";
import { TelemetryModal } from "./components/TelemetryModal";
import type { OrientationTelemetry } from "./math/deviceOrientation";
import { sensorService } from "./services/sensors";
import type { LocationState } from "./services/sensors";
import type { ARObject } from "./math/coordinates";

export function App() {
  const [telemetry, setTelemetry] = useState<OrientationTelemetry>({
    azimuth: 0,
    altitude: 0,
    roll: 0,
  });

  const [location, setLocation] = useState<LocationState>(
    sensorService.currentLocation,
  );
  const [isNightVision, setIsNightVision] = useState(false);

  // Layer toggles
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showAircraft, setShowAircraft] = useState(true);
  const [showMeteors, setShowMeteors] = useState(true);

  // Dynamic telemetry objects
  const [satellites, setSatellites] = useState<ARObject[]>([]);
  const [airplanes, setAirplanes] = useState<ARObject[]>([]);
  const [meteors, setMeteors] = useState<ARObject[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<ARObject | null>(null);

  // Elements for recorder
  const [webglCanvas, setWebglCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker for background telemetry
  useEffect(() => {
    try {
      const worker = new Worker(
        new URL("./workers/telemetry.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const { type, payload } = e.data;
        if (type === "TELEMETRY_UPDATE") {
          if (payload.satellites) setSatellites(payload.satellites);
          if (payload.airplanes) setAirplanes(payload.airplanes);
          if (payload.meteors) setMeteors(payload.meteors);
        }
      };

      // Periodic query every 5 seconds
      const queryWorker = () => {
        worker.postMessage({
          type: "QUERY_TELEMETRY",
          payload: {
            lat: location.latitude,
            lon: location.longitude,
            alt: location.altitudeMeters,
          },
        });
      };

      queryWorker();
      const interval = window.setInterval(queryWorker, 5000);

      return () => {
        clearInterval(interval);
        worker.terminate();
      };
    } catch (err) {
      console.warn("Web Worker not supported or failed to start:", err);
    }
  }, [location.latitude, location.longitude, location.altitudeMeters]);

  // Sync Night Vision Class on <body>
  const handleToggleNightVision = () => {
    setIsNightVision((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add("night-vision-active");
      } else {
        document.body.classList.remove("night-vision-active");
      }
      return next;
    });
  };

  const handleCanvasReady = (
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
  ) => {
    setWebglCanvas(canvas);
    setVideoElement(video);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-astro-dark">
      {/* 1. AR WebGL + Camera Layer */}
      <ARView
        onTelemetryUpdate={setTelemetry}
        onLocationUpdate={setLocation}
        showStars={showStars}
        showConstellations={showConstellations}
        isNightVision={isNightVision}
        onCanvasReady={handleCanvasReady}
      />

      {/* 2. Top Compass & Attitude HUD */}
      <CompassHUD telemetry={telemetry} location={location} />

      {/* 3. Central Tactical Reticle */}
      <Reticle altitude={telemetry.altitude} roll={telemetry.roll} />

      {/* 4. Dynamic Satellites, Aircraft, Meteors Projection Layer */}
      <EntityOverlay
        telemetry={telemetry}
        satellites={satellites}
        airplanes={airplanes}
        meteors={meteors}
        showSatellites={showSatellites}
        showAirplanes={showAircraft}
        showMeteors={showMeteors}
        isNightVision={isNightVision}
        onSelectEntity={setSelectedEntity}
      />

      {/* 5. In-Browser Video Recording Controls */}
      <RecordingControls
        videoElement={videoElement}
        webglCanvas={webglCanvas}
        isNightVision={isNightVision}
      />

      {/* 6. Tactical Bottom Control Dock */}
      <ControlPanel
        isNightVision={isNightVision}
        onToggleNightVision={handleToggleNightVision}
        showStars={showStars}
        onToggleStars={() => setShowStars((prev) => !prev)}
        showConstellations={showConstellations}
        onToggleConstellations={() => setShowConstellations((prev) => !prev)}
        showSatellites={showSatellites}
        onToggleSatellites={() => setShowSatellites((prev) => !prev)}
        showAircraft={showAircraft}
        onToggleAircraft={() => setShowAircraft((prev) => !prev)}
        showMeteors={showMeteors}
        onToggleMeteors={() => setShowMeteors((prev) => !prev)}
      />

      {/* 7. Detailed Entity Inspector Modal */}
      <TelemetryModal
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        isNightVision={isNightVision}
      />
    </main>
  );
}

export default App;
