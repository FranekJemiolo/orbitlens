import React from "react";
import type { ARObject } from "../math/coordinates";
import { X, Satellite, Plane, Flame, Sparkles } from "lucide-react";

interface TelemetryModalProps {
  entity: ARObject | null;
  onClose: () => void;
  isNightVision: boolean;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({
  entity,
  onClose,
  isNightVision,
}) => {
  if (!entity) return null;

  const isSat = entity.type === "SATELLITE";
  const isPlane = entity.type === "AIRPLANE";
  const isMeteor = entity.type === "METEOR";

  const icon = isSat ? (
    <Satellite className="w-5 h-5 text-red-400" />
  ) : isPlane ? (
    <Plane className="w-5 h-5 text-emerald-400" />
  ) : isMeteor ? (
    <Flame className="w-5 h-5 text-amber-400" />
  ) : (
    <Sparkles className="w-5 h-5 text-astro-accent" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 pointer-events-auto bg-black/40 backdrop-blur-xs">
      <div
        className={`w-full max-w-md bg-astro-dark/95 border ${
          isNightVision
            ? "border-red-500 text-red-400"
            : "border-astro-accent/40 text-astro-text"
        } rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200`}
        data-testid="telemetry-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-astro-accent/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-astro-accent/10 border border-astro-accent/30">
              {icon}
            </div>
            <div>
              <div className="text-sm font-bold font-mono tracking-wide">
                {entity.label}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">
                {entity.type} TELEMETRY
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-astro-accent/20 hover:bg-astro-accent/10 transition"
            data-testid="close-telemetry-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-astro-dark/60 border border-astro-accent/20">
            <div className="text-[10px] opacity-60">AZIMUTH (BEARING)</div>
            <div className="text-sm font-bold text-astro-accent mt-0.5">
              {Math.round(entity.azimuth)}°
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-astro-dark/60 border border-astro-accent/20">
            <div className="text-[10px] opacity-60">ALTITUDE (ELEVATION)</div>
            <div className="text-sm font-bold text-astro-accent mt-0.5">
              {entity.altitude > 0
                ? `+${Math.round(entity.altitude)}`
                : Math.round(entity.altitude)}
              °
            </div>
          </div>

          {entity.distanceKm !== undefined && (
            <div className="p-2.5 rounded-lg bg-astro-dark/60 border border-astro-accent/20">
              <div className="text-[10px] opacity-60">SLANT RANGE</div>
              <div className="text-sm font-bold mt-0.5">
                {entity.distanceKm.toLocaleString()} KM
              </div>
            </div>
          )}

          {entity.velocityKmh !== undefined && (
            <div className="p-2.5 rounded-lg bg-astro-dark/60 border border-astro-accent/20">
              <div className="text-[10px] opacity-60">GROUND VELOCITY</div>
              <div className="text-sm font-bold mt-0.5">
                {entity.velocityKmh.toLocaleString()} KM/H
              </div>
            </div>
          )}

          {entity.magnitude !== undefined && (
            <div className="p-2.5 rounded-lg bg-astro-dark/60 border border-astro-accent/20">
              <div className="text-[10px] opacity-60">MAGNITUDE</div>
              <div className="text-sm font-bold mt-0.5">
                {entity.magnitude.toFixed(1)} mag
              </div>
            </div>
          )}

          {/* Dynamic Extra Metadata */}
          {entity.metadata &&
            Object.entries(entity.metadata).map(([key, val]) => (
              <div
                key={key}
                className="p-2.5 rounded-lg bg-astro-dark/60 border border-astro-accent/20"
              >
                <div className="text-[10px] uppercase opacity-60">{key}</div>
                <div className="text-xs font-semibold mt-0.5 truncate">
                  {String(val)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
