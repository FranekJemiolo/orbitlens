import { useState, useEffect, useRef, useMemo } from "react";
import { ARView } from "./components/ARView";
import { CompassHUD } from "./components/CompassHUD";
import { Reticle } from "./components/Reticle";
import { EntityOverlay } from "./components/EntityOverlay";
import { ControlPanel } from "./components/ControlPanel";
import { RecordingControls } from "./components/RecordingControls";
import { TelemetryModal } from "./components/TelemetryModal";
import { SearchModal } from "./components/SearchModal";
import { TargetGuide } from "./components/TargetGuide";
import { HelpModal } from "./components/HelpModal";
import type { OrientationTelemetry } from "./math/deviceOrientation";
import { sensorService } from "./services/sensors";
import type { LocationState } from "./services/sensors";
import type { ARObject } from "./math/coordinates";
import { equatorialToHorizontal, computeDynamicFov } from "./math/coordinates";
import {
  loadNamedStars,
  getNamedStarsARObjects,
  getSolarSystemARObjects,
} from "./services/starCatalog";
import type { NamedStarRecord } from "./services/starCatalog";
import { soundService } from "./services/audio";

const CONSTELLATION_CENTERS = [
  { id: "con-orion", name: "Orion", raRad: 1.44, decRad: 0.05 },
  { id: "con-uma", name: "Ursa Major", raRad: 3.14, decRad: 0.96 },
  { id: "con-cas", name: "Cassiopeia", raRad: 0.26, decRad: 1.05 },
  { id: "con-crux", name: "Crux", raRad: 3.27, decRad: -1.05 },
  { id: "con-cyg", name: "Cygnus", raRad: 5.39, decRad: 0.73 },
  { id: "con-sco", name: "Scorpius", raRad: 4.42, decRad: -0.52 },
  { id: "con-tau", name: "Taurus", raRad: 1.18, decRad: 0.26 },
  { id: "con-leo", name: "Leo", raRad: 2.8, decRad: 0.26 },
  { id: "con-lyr", name: "Lyra", raRad: 4.9, decRad: 0.63 },
  { id: "con-peg", name: "Pegasus", raRad: 5.94, decRad: 0.35 },
];

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
  const [cameraFov, setCameraFov] = useState(65);

  // Layer toggles
  const [showPlanets, setShowPlanets] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showAircraft, setShowAircraft] = useState(true);
  const [showMeteors, setShowMeteors] = useState(true);

  // Dynamic telemetry objects
  const [satellites, setSatellites] = useState<ARObject[]>([]);
  const [airplanes, setAirplanes] = useState<ARObject[]>([]);
  const [meteors, setMeteors] = useState<ARObject[]>([]);
  const [namedStarsRaw, setNamedStarsRaw] = useState<NamedStarRecord[]>([]);

  // Selection, search, and target tracking states
  const [selectedEntity, setSelectedEntity] = useState<ARObject | null>(null);
  const [activeTrackingTarget, setActiveTrackingTarget] =
    useState<ARObject | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Target lock sound state
  const prevLockedTargetIdRef = useRef<string | null>(null);

  // Elements for recorder
  const [webglCanvas, setWebglCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );

  const workerRef = useRef<Worker | null>(null);

  // Load named benchmark stars catalog
  useEffect(() => {
    loadNamedStars()
      .then((stars) => setNamedStarsRaw(stars))
      .catch((err) => console.warn("Failed to load named stars:", err));
  }, []);

  // Compute named stars ARObjects based on location and date
  const namedStarsAR = useMemo(() => {
    if (namedStarsRaw.length === 0) return [];
    return getNamedStarsARObjects(
      namedStarsRaw,
      location.latitude,
      location.longitude,
      new Date(),
    );
  }, [namedStarsRaw, location.latitude, location.longitude]);

  // Compute real-time Solar System bodies (Moon, Venus, Mars, Jupiter, Saturn, Sun)
  const solarSystemAR = useMemo(() => {
    return getSolarSystemARObjects(
      location.latitude,
      location.longitude,
      new Date(),
    );
  }, [location.latitude, location.longitude]);

  // Compute floating constellation labels
  const constellationLabels = useMemo(() => {
    const now = new Date();
    return CONSTELLATION_CENTERS.map((c) => {
      const { altitude, azimuth } = equatorialToHorizontal(
        c.raRad,
        c.decRad,
        location.latitude,
        location.longitude,
        now,
      );
      return {
        id: c.id,
        type: "STAR" as const,
        label: c.name,
        altitude,
        azimuth,
      };
    });
  }, [location.latitude, location.longitude]);

  // Compute dynamic frustum FOV matching current window and camera zoom
  const { hFov, vFov } = useMemo(() => {
    const aspect =
      typeof window !== "undefined"
        ? window.innerWidth / window.innerHeight
        : 16 / 9;
    return computeDynamicFov(cameraFov, aspect);
  }, [cameraFov]);

  // All available objects for searching and target guidance
  const allAvailableObjects = useMemo(() => {
    return [
      ...solarSystemAR,
      ...satellites,
      ...namedStarsAR,
      ...constellationLabels,
      ...airplanes,
      ...meteors,
    ];
  }, [
    solarSystemAR,
    satellites,
    namedStarsAR,
    constellationLabels,
    airplanes,
    meteors,
  ]);

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

  // Auto-targeting: Detect which celestial or orbital object is centered in the crosshairs
  const lockedTarget = useMemo(() => {
    const activeObjects: ARObject[] = [];
    if (showPlanets) activeObjects.push(...solarSystemAR);
    if (showSatellites) activeObjects.push(...satellites);
    if (showAircraft) activeObjects.push(...airplanes);
    if (showMeteors) activeObjects.push(...meteors);
    if (showStars) activeObjects.push(...namedStarsAR);

    let closest: ARObject | null = null;
    let minAngularDist = 4.5; // Lock window in degrees

    for (const obj of activeObjects) {
      let dAz = Math.abs(obj.azimuth - telemetry.azimuth);
      if (dAz > 180) dAz = 360 - dAz;
      const dAlt = Math.abs(obj.altitude - telemetry.altitude);
      const dist = Math.sqrt(dAz * dAz + dAlt * dAlt);

      if (dist < minAngularDist) {
        minAngularDist = dist;
        closest = obj;
      }
    }
    return closest;
  }, [
    showPlanets,
    showSatellites,
    showAircraft,
    showMeteors,
    showStars,
    solarSystemAR,
    satellites,
    airplanes,
    meteors,
    namedStarsAR,
    telemetry.azimuth,
    telemetry.altitude,
  ]);

  // Audio chirp upon new target acquisition
  useEffect(() => {
    const currentId = lockedTarget?.id ?? null;
    if (currentId && currentId !== prevLockedTargetIdRef.current) {
      soundService.playLockSound();
    }
    prevLockedTargetIdRef.current = currentId;
  }, [lockedTarget]);

  // Keyboard shortcut handlers (Cmd+K or / for search, ? for help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "?" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handleSelectTrackingTarget = (target: ARObject) => {
    setActiveTrackingTarget(target);
    soundService.playLockSound();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-astro-dark select-none">
      {/* 1. AR WebGL + Camera Layer */}
      <ARView
        onTelemetryUpdate={setTelemetry}
        onLocationUpdate={setLocation}
        onFovUpdate={setCameraFov}
        showStars={showStars}
        showConstellations={showConstellations}
        isNightVision={isNightVision}
        onCanvasReady={handleCanvasReady}
      />

      {/* 2. Top Compass & Attitude HUD */}
      <CompassHUD telemetry={telemetry} location={location} />

      {/* 3. Off-screen Target Guidance Indicator */}
      <TargetGuide
        target={activeTrackingTarget}
        telemetry={telemetry}
        hFov={hFov}
        vFov={vFov}
        isNightVision={isNightVision}
        onClearTarget={() => setActiveTrackingTarget(null)}
      />

      {/* 4. Central Tactical Reticle with Target Auto-Lock */}
      <Reticle
        altitude={telemetry.altitude}
        roll={telemetry.roll}
        lockedTarget={lockedTarget}
        onSelectLockedTarget={setSelectedEntity}
        isNightVision={isNightVision}
      />

      {/* 5. Dynamic Celestial, Orbital, & Aeronautical Projection Layer */}
      <EntityOverlay
        telemetry={telemetry}
        satellites={satellites}
        airplanes={airplanes}
        meteors={meteors}
        planets={solarSystemAR}
        namedStars={namedStarsAR}
        constellationLabels={constellationLabels}
        showSatellites={showSatellites}
        showAirplanes={showAircraft}
        showMeteors={showMeteors}
        showPlanets={showPlanets}
        showStars={showStars}
        showConstellations={showConstellations}
        hFov={hFov}
        vFov={vFov}
        isNightVision={isNightVision}
        onSelectEntity={setSelectedEntity}
      />

      {/* 6. In-Browser Video Recording Controls */}
      <RecordingControls
        videoElement={videoElement}
        webglCanvas={webglCanvas}
        isNightVision={isNightVision}
      />

      {/* 7. Tactical Bottom Control Dock */}
      <ControlPanel
        isNightVision={isNightVision}
        onToggleNightVision={handleToggleNightVision}
        showPlanets={showPlanets}
        onTogglePlanets={() => setShowPlanets((prev) => !prev)}
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
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* 8. Detailed Entity Inspector Modal */}
      <TelemetryModal
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        isNightVision={isNightVision}
      />

      {/* 9. Celestial Target Finder Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTarget={handleSelectTrackingTarget}
        availableObjects={allAvailableObjects}
        isNightVision={isNightVision}
      />

      {/* 10. AR User Guide & Symbol Legend Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        isNightVision={isNightVision}
      />
    </main>
  );
}

export default App;
