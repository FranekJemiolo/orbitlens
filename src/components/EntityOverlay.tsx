import React from "react";
import type { ARObject } from "../math/coordinates";
import type { OrientationTelemetry } from "../math/deviceOrientation";
import { Satellite, Plane, Flame } from "lucide-react";

interface EntityOverlayProps {
  telemetry: OrientationTelemetry;
  satellites: ARObject[];
  airplanes: ARObject[];
  meteors: ARObject[];
  showSatellites: boolean;
  showAirplanes: boolean;
  showMeteors: boolean;
  isNightVision: boolean;
  onSelectEntity: (entity: ARObject) => void;
}

export const EntityOverlay: React.FC<EntityOverlayProps> = ({
  telemetry,
  satellites,
  airplanes,
  meteors,
  showSatellites,
  showAirplanes,
  showMeteors,
  isNightVision,
  onSelectEntity,
}) => {
  const visibleEntities: {
    entity: ARObject;
    screenX: number;
    screenY: number;
  }[] = [];

  // Approximate camera horizontal FOV ~60 degrees, vertical ~75 degrees
  const hFov = 60;
  const vFov = 75;

  const allObjects: ARObject[] = [];
  if (showSatellites) allObjects.push(...satellites);
  if (showAirplanes) allObjects.push(...airplanes);
  if (showMeteors) allObjects.push(...meteors);

  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 390;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 844;

  for (const obj of allObjects) {
    let deltaAz = obj.azimuth - telemetry.azimuth;
    while (deltaAz > 180) deltaAz -= 360;
    while (deltaAz < -180) deltaAz += 360;

    const deltaAlt = obj.altitude - telemetry.altitude;

    // Check if within camera viewport frustum
    if (Math.abs(deltaAz) <= hFov / 2 && Math.abs(deltaAlt) <= vFov / 2) {
      const screenX = (0.5 + deltaAz / hFov) * windowWidth;
      const screenY = (0.5 - deltaAlt / vFov) * windowHeight;

      visibleEntities.push({ entity: obj, screenX, screenY });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {visibleEntities.map(({ entity, screenX, screenY }) => {
        const isSat = entity.type === "SATELLITE";
        const isPlane = entity.type === "AIRPLANE";
        const isMeteor = entity.type === "METEOR";

        // Night vision forces pure red tones
        const themeColor = isNightVision
          ? "border-red-500 text-red-500 shadow-red-500/30"
          : isSat
            ? "border-red-500 text-red-400 shadow-red-500/20"
            : isPlane
              ? "border-emerald-400 text-emerald-400 shadow-emerald-400/20"
              : "border-amber-400 text-amber-400 shadow-amber-400/20";

        return (
          <div
            key={entity.id}
            onClick={() => onSelectEntity(entity)}
            style={{
              transform: `translate(${screenX}px, ${screenY}px) translate(-50%, -50%)`,
            }}
            className="absolute pointer-events-auto cursor-pointer group transition-transform duration-100 ease-out"
            data-testid={`entity-${entity.id}`}
          >
            {/* Satellite Reticle */}
            {isSat && (
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full border-2 ${themeColor} border-dashed animate-spin flex items-center justify-center`}
                  style={{ animationDuration: "6s" }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Satellite className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 bg-astro-dark/90 border border-red-500/40 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
                  <span className="font-bold text-red-400">{entity.label}</span>
                  {entity.distanceKm && (
                    <span className="text-astro-text/70 ml-1">
                      [{entity.distanceKm} km]
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Airplane Bounding Box */}
            {isPlane && (
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-9 h-9 border-2 ${themeColor} flex items-center justify-center bg-emerald-500/5`}
                >
                  <Plane className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 bg-astro-dark/90 border border-emerald-500/40 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
                  <span className="font-bold text-emerald-400">
                    {entity.label}
                  </span>
                  {entity.velocityKmh && (
                    <span className="text-astro-text/70 ml-1">
                      {entity.velocityKmh} km/h
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Meteor Radiant Marker */}
            {isMeteor && (
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full border-2 ${themeColor} flex items-center justify-center animate-pulse`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="mt-1 px-1.5 py-0.5 bg-astro-dark/90 border border-amber-500/40 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
                  <span className="font-bold text-amber-400">
                    {entity.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
