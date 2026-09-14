import React from "react";
import type { OrientationTelemetry } from "../math/deviceOrientation";
import type { LocationState } from "../services/sensors";

interface CompassHUDProps {
  telemetry: OrientationTelemetry;
  location: LocationState;
}

export const CompassHUD: React.FC<CompassHUDProps> = ({
  telemetry,
  location,
}) => {
  const heading = Math.round(telemetry.azimuth);
  const altitude = Math.round(telemetry.altitude);
  const roll = Math.round(telemetry.roll);

  // Compass tape ticks around current heading (-40 to +40 degrees)
  const tapeTicks = [];
  const startAngle = heading - 40;
  for (let a = startAngle; a <= heading + 40; a += 5) {
    const normalized = ((a % 360) + 360) % 360;
    let label = "";
    if (normalized === 0) label = "N";
    else if (normalized === 45) label = "NE";
    else if (normalized === 90) label = "E";
    else if (normalized === 135) label = "SE";
    else if (normalized === 180) label = "S";
    else if (normalized === 225) label = "SW";
    else if (normalized === 270) label = "W";
    else if (normalized === 315) label = "NW";
    else if (normalized % 15 === 0) label = `${normalized}°`;

    const offsetPercent = ((a - startAngle) / 80) * 100;
    tapeTicks.push({
      angle: normalized,
      label,
      offsetPercent,
      isMajor: !!label,
    });
  }

  return (
    <div className="absolute top-0 left-0 right-0 pointer-events-none p-3 select-none z-20">
      {/* Top Bar: Telemetry Readouts */}
      <div className="flex justify-between items-start text-xs font-mono text-astro-accent">
        {/* Left: GPS Telemetry */}
        <div className="bg-astro-dark/70 backdrop-blur-sm border border-astro-accent/20 rounded px-2.5 py-1.5 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-astro-text/70">
              GPS FIX
            </span>
          </div>
          <div className="mt-0.5 text-astro-text font-bold">
            {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
          </div>
          <div className="text-[10px] text-astro-accent/80">
            ALT: {Math.round(location.altitudeMeters)}M | ACC: ±
            {Math.round(location.accuracy)}M
          </div>
        </div>

        {/* Center: Compass Heading Readout */}
        <div className="flex flex-col items-center">
          <div className="bg-astro-dark/80 backdrop-blur-md border border-astro-accent/40 rounded px-3 py-1 text-center shadow-lg shadow-astro-accent/10">
            <div className="text-xl font-bold tracking-widest text-astro-accent">
              {String(heading).padStart(3, "0")}°
            </div>
            <div className="text-[9px] uppercase tracking-wider text-astro-text/60">
              HEADING
            </div>
          </div>
        </div>

        {/* Right: Attitude (Pitch/Roll) */}
        <div className="bg-astro-dark/70 backdrop-blur-sm border border-astro-accent/20 rounded px-2.5 py-1.5 text-right shadow-lg">
          <div className="text-[10px] uppercase tracking-wider text-astro-text/70">
            ATTITUDE
          </div>
          <div className="mt-0.5 text-astro-text font-bold">
            PITCH: {altitude > 0 ? `+${altitude}` : altitude}°
          </div>
          <div className="text-[10px] text-astro-accent/80">ROLL: {roll}°</div>
        </div>
      </div>

      {/* Compass Tape Banner */}
      <div className="relative mt-2 h-7 w-full max-w-sm mx-auto overflow-hidden bg-astro-dark/60 backdrop-blur-sm border-x border-b border-astro-accent/30 rounded-b shadow-inner">
        {/* Center Indicator Needle */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-astro-alert z-10 shadow-sm shadow-astro-alert" />

        {/* Ticks */}
        <div className="relative w-full h-full">
          {tapeTicks.map((tick, idx) => (
            <div
              key={idx}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${tick.offsetPercent}%` }}
            >
              <div
                className={`w-px ${
                  tick.isMajor
                    ? "h-3 bg-astro-accent"
                    : "h-1.5 bg-astro-accent/40"
                }`}
              />
              {tick.label && (
                <span className="text-[9px] font-mono text-astro-accent font-semibold leading-tight">
                  {tick.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
