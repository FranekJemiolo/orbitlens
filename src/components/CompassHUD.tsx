import React, { useState, useEffect } from "react";
import type { OrientationTelemetry } from "../math/deviceOrientation";
import type { LocationState } from "../services/sensors";
import { getLMSTRadians, RAD2DEG } from "../math/astronomy";
import { Compass, Clock, MapPin } from "lucide-react";

interface CompassHUDProps {
  telemetry: OrientationTelemetry;
  location: LocationState;
  onOpenLocation?: () => void;
}

export const CompassHUD: React.FC<CompassHUDProps> = ({
  telemetry,
  location,
  onOpenLocation,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const heading = Math.round(telemetry.azimuth);
  const altitude = Math.round(telemetry.altitude);
  const roll = Math.round(telemetry.roll);

  // UTC and Local Sidereal Time (LST)
  const utcHours = String(now.getUTCHours()).padStart(2, "0");
  const utcMins = String(now.getUTCMinutes()).padStart(2, "0");
  const utcSecs = String(now.getUTCSeconds()).padStart(2, "0");

  // LST in hours
  const lmstHours = (getLMSTRadians(now, location.longitude) * RAD2DEG) / 15.0;
  const lstH = Math.floor(lmstHours);
  const lstM = Math.floor((lmstHours - lstH) * 60);
  const lstStr = `${String(lstH).padStart(2, "0")}:${String(lstM).padStart(2, "0")}`;

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
    <div className="absolute top-0 left-0 right-0 pointer-events-none px-3 pt-[max(0.75rem,env(safe-area-inset-top))] select-none z-20">
      {/* Top Bar: Telemetry Readouts */}
      <div className="flex justify-between items-start text-xs font-mono text-astro-accent gap-2">
        {/* Left: GPS Telemetry (Clickable to change location) */}
        <div
          onClick={onOpenLocation}
          className="bg-astro-dark/80 backdrop-blur-md border border-astro-accent/25 hover:border-astro-accent/60 rounded-xl px-2.5 py-1.5 shadow-xl pointer-events-auto cursor-pointer transition active:scale-95 group"
          title="Click to change observer location or detect GPS"
          data-testid="location-status-badge"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                location.isManual
                  ? "bg-amber-400"
                  : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span className="text-[10px] uppercase tracking-wider text-astro-text/70 group-hover:text-astro-accent flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 inline" />{" "}
              {location.isManual
                ? location.name || "MANUAL PRESET"
                : "GPS LOCK"}
            </span>
          </div>
          <div
            className="mt-0.5 text-astro-text font-bold text-[11px] group-hover:text-astro-accent"
            data-testid="hud-observer-coords"
          >
            {location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E
          </div>
          <div className="text-[9px] text-astro-accent/80 flex gap-2">
            <span>ALT: {Math.round(location.altitudeMeters)}M</span>
            <span>
              {location.isManual
                ? "MANUAL"
                : `ACC: ±${Math.round(location.accuracy)}M`}
            </span>
          </div>
        </div>

        {/* Center: Compass Heading Readout */}
        <div className="flex flex-col items-center">
          <div className="bg-astro-dark/90 backdrop-blur-md border border-astro-accent/40 rounded-xl px-3.5 py-1.5 text-center shadow-xl shadow-astro-accent/10">
            <div className="text-xl font-bold tracking-widest text-astro-accent flex items-center justify-center gap-1">
              <Compass className="w-4 h-4 text-astro-accent/80" />
              <span>{String(heading).padStart(3, "0")}°</span>
            </div>
            <div className="text-[9px] uppercase tracking-wider text-astro-text/60 font-semibold">
              {heading >= 338 || heading < 23
                ? "NORTH"
                : heading < 68
                  ? "NORTH-EAST"
                  : heading < 113
                    ? "EAST"
                    : heading < 158
                      ? "SOUTH-EAST"
                      : heading < 203
                        ? "SOUTH"
                        : heading < 248
                          ? "SOUTH-WEST"
                          : heading < 293
                            ? "WEST"
                            : "NORTH-WEST"}
            </div>
          </div>
        </div>

        {/* Right: Attitude (Pitch/Roll) & Sidereal Clock */}
        <div className="bg-astro-dark/80 backdrop-blur-md border border-astro-accent/25 rounded-xl px-2.5 py-1.5 text-right shadow-xl">
          <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-astro-text/70">
            <Clock className="w-2.5 h-2.5" />
            <span>
              {utcHours}:{utcMins}:{utcSecs} UTC
            </span>
          </div>
          <div className="mt-0.5 text-astro-text font-bold text-[11px]">
            LST: {lstStr} | PITCH: {altitude > 0 ? `+${altitude}` : altitude}°
          </div>
          <div className="text-[9px] text-astro-accent/80">ROLL: {roll}°</div>
        </div>
      </div>

      {/* Compass Tape Banner */}
      <div className="relative mt-2 h-7 w-full max-w-sm mx-auto overflow-hidden bg-astro-dark/70 backdrop-blur-md border-x border-b border-astro-accent/30 rounded-b-xl shadow-inner">
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
