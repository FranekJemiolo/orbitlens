import React, { useRef, useCallback } from "react";
import type { ARObject } from "../math/coordinates";
import type { OrientationTelemetry } from "../math/deviceOrientation";
import { DEG2RAD, RAD2DEG } from "../math/astronomy";
import { Compass, Minimize2 } from "lucide-react";

interface AllSkyRadarProps {
  telemetry: OrientationTelemetry;
  objects: ARObject[];
  hFov: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSteer: (azimuth: number, altitude: number) => void;
  isNightVision: boolean;
}

export const AllSkyRadar: React.FC<AllSkyRadarProps> = ({
  telemetry,
  objects,
  hFov,
  isOpen,
  onToggleOpen,
  onSteer,
  isNightVision,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const radius = 70; // Map radius in SVG units
  const size = 160;
  const center = size / 2;

  // Converts (altitude, azimuth) to (x, y) coordinates inside polar radar
  const getRadarCoords = useCallback(
    (altDeg: number, azDeg: number) => {
      const clampedAlt = Math.max(0, Math.min(90, altDeg));
      const r = radius * (1.0 - clampedAlt / 90.0);
      const theta = azDeg * DEG2RAD;
      const x = center + r * Math.sin(theta);
      const y = center - r * Math.cos(theta);
      return { x, y };
    },
    [center, radius],
  );

  // Handle click or drag on the radar to steer the sky
  const handlePointerAction = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale to SVG viewBox
    const scale = size / rect.width;
    const svgX = clickX * scale;
    const svgY = clickY * scale;

    const dx = svgX - center;
    const dy = svgY - center;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Altitude: center is 90 deg (zenith), edge is 0 deg (horizon)
    const altitude = Math.max(0, Math.min(90, 90.0 * (1.0 - dist / radius)));

    // Azimuth: dx is sin, -dy is cos
    let azRad = Math.atan2(dx, -dy);
    if (azRad < 0) azRad += 2 * Math.PI;
    const azimuth = azRad * RAD2DEG;

    onSteer(azimuth, altitude);
  };

  if (!isOpen) return null;

  // Current camera viewing direction on radar
  const camCoords = getRadarCoords(telemetry.altitude, telemetry.azimuth);

  // Compute viewing cone fan points
  const leftConeAz = (telemetry.azimuth - hFov / 2 + 360) % 360;
  const rightConeAz = (telemetry.azimuth + hFov / 2) % 360;
  const leftConePt = getRadarCoords(0, leftConeAz);
  const rightConePt = getRadarCoords(0, rightConeAz);

  // Filter visible objects above horizon
  const visibleObjects = objects.filter((o) => o.altitude >= -5);

  return (
    <div
      className="absolute top-20 left-3 z-30 pointer-events-auto select-none"
      data-testid="all-sky-radar-container"
    >
      <div
        className={`bg-astro-dark/90 backdrop-blur-md border ${
          isNightVision
            ? "border-red-500/50 text-red-300 shadow-red-950/40"
            : "border-astro-accent/40 text-astro-text shadow-astro-accent/15"
        } rounded-2xl p-2.5 shadow-2xl transition duration-200`}
      >
        {/* Radar Header */}
        <div className="flex items-center justify-between gap-1 border-b border-astro-accent/20 pb-1.5 mb-1.5 font-mono text-[10px]">
          <div className="flex items-center gap-1 font-bold text-astro-accent">
            <Compass className="w-3.5 h-3.5" />
            <span>ALL-SKY RADAR</span>
          </div>
          <button
            onClick={onToggleOpen}
            className="p-1 hover:bg-white/10 rounded transition text-astro-text/60 hover:text-astro-text"
            title="Minimize Radar Map"
            data-testid="close-radar-button"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>

        {/* Polar Azimuthal SVG Dome Map */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          className="w-36 h-36 cursor-crosshair touch-none"
          onPointerDown={handlePointerAction}
          onPointerMove={(e) => {
            if (e.buttons === 1) handlePointerAction(e);
          }}
          data-testid="all-sky-radar-svg"
        >
          {/* Outer Horizon Circle (Alt = 0°) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            className={
              isNightVision
                ? "fill-red-950/40 stroke-red-500/50"
                : "fill-astro-dark/80 stroke-astro-accent/40"
            }
            strokeWidth="1.5"
          />

          {/* 30° and 60° Elevation Concentric Rings */}
          <circle
            cx={center}
            cy={center}
            r={radius * (2 / 3)}
            className="fill-none stroke-current opacity-15"
            strokeDasharray="2 2"
          />
          <circle
            cx={center}
            cy={center}
            r={radius * (1 / 3)}
            className="fill-none stroke-current opacity-20"
            strokeDasharray="2 2"
          />

          {/* Crosshairs: North-South & East-West */}
          <line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center + radius}
            className="stroke-current opacity-15"
          />
          <line
            x1={center - radius}
            y1={center}
            x2={center + radius}
            y2={center}
            className="stroke-current opacity-15"
          />

          {/* Cardinal Directions */}
          <text
            x={center}
            y={center - radius + 9}
            textAnchor="middle"
            className="fill-current font-mono font-bold text-[8px] opacity-80"
          >
            N
          </text>
          <text
            x={center + radius - 7}
            y={center + 3}
            textAnchor="middle"
            className="fill-current font-mono font-bold text-[8px] opacity-80"
          >
            E
          </text>
          <text
            x={center}
            y={center + radius - 3}
            textAnchor="middle"
            className="fill-current font-mono font-bold text-[8px] opacity-80"
          >
            S
          </text>
          <text
            x={center - radius + 7}
            y={center + 3}
            textAnchor="middle"
            className="fill-current font-mono font-bold text-[8px] opacity-80"
          >
            W
          </text>

          {/* Camera Field of View Cone */}
          <polygon
            points={`${center},${center} ${leftConePt.x},${leftConePt.y} ${rightConePt.x},${rightConePt.y}`}
            className={
              isNightVision
                ? "fill-red-500/20 stroke-red-400/40"
                : "fill-astro-accent/20 stroke-astro-accent/40"
            }
            strokeWidth="0.8"
          />

          {/* Celestial & Orbital Objects */}
          {visibleObjects.map((obj) => {
            const { x, y } = getRadarCoords(obj.altitude, obj.azimuth);
            const isSun = obj.label === "Sun";
            const isMoon = obj.label === "Moon";
            const isPlanet = obj.type === "PLANET" && !isMoon;
            const isSat = obj.type === "SATELLITE";

            const fillColor = isNightVision
              ? "#f87171"
              : isSun
                ? "#fbbf24"
                : isMoon
                  ? "#f1f5f9"
                  : isPlanet
                    ? "#f59e0b"
                    : isSat
                      ? "#ef4444"
                      : "#38bdf8";

            const rDot = isSun ? 3.5 : isMoon ? 3 : isSat ? 2.5 : 2;

            return (
              <g key={obj.id} className="cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r={rDot}
                  fill={fillColor}
                  className={isSat ? "animate-ping" : ""}
                />
                <circle cx={x} cy={y} r={rDot} fill={fillColor} />
              </g>
            );
          })}

          {/* Camera Center Reticle Pointer */}
          <circle
            cx={camCoords.x}
            cy={camCoords.y}
            r="3"
            className="fill-white stroke-red-500"
            strokeWidth="1.2"
            data-testid="radar-cam-cursor"
          />
        </svg>

        <div className="mt-1 text-center font-mono text-[9px] text-astro-text/60">
          Tap or drag radar to steer sky
        </div>
      </div>
    </div>
  );
};
