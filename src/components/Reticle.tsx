import React from "react";
import type { ARObject } from "../math/coordinates";
import { Target, Info } from "lucide-react";

interface ReticleProps {
  altitude: number;
  roll: number;
  lockedTarget?: ARObject | null;
  onSelectLockedTarget?: (target: ARObject) => void;
  isNightVision: boolean;
}

export const Reticle: React.FC<ReticleProps> = ({
  altitude,
  roll,
  lockedTarget,
  onSelectLockedTarget,
  isNightVision,
}) => {
  const isLocked = !!lockedTarget;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 select-none">
      <div
        className="relative w-56 h-56 transition-transform duration-75"
        style={{ transform: `rotate(${-roll}deg)` }}
      >
        {/* Outer Circular Reticle Ring */}
        <div
          className={`absolute inset-0 border rounded-full transition-colors duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500 shadow-md shadow-red-500/30"
                : "border-amber-400 shadow-md shadow-amber-400/30"
              : "border-astro-accent/25"
          }`}
        />
        <div
          className={`absolute inset-2 border border-dashed rounded-full animate-pulse-ring transition-colors duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500/40"
                : "border-amber-400/40"
              : "border-astro-accent/20"
          }`}
        />

        {/* Tactical Corner Brackets (contract closer when locked) */}
        <div
          className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 transition-all duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500 scale-95"
                : "border-amber-400 scale-95"
              : "border-astro-accent"
          }`}
        />
        <div
          className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 transition-all duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500 scale-95"
                : "border-amber-400 scale-95"
              : "border-astro-accent"
          }`}
        />
        <div
          className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 transition-all duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500 scale-95"
                : "border-amber-400 scale-95"
              : "border-astro-accent"
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 transition-all duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500 scale-95"
                : "border-amber-400 scale-95"
              : "border-astro-accent"
          }`}
        />

        {/* Center Crosshairs */}
        <div className="absolute top-1/2 left-5 right-5 h-px bg-astro-accent/30 -translate-y-1/2" />
        <div className="absolute left-1/2 top-5 bottom-5 w-px bg-astro-accent/30 -translate-x-1/2" />

        {/* Center Target Pip */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
            isLocked
              ? isNightVision
                ? "border-red-500 bg-red-500/40 shadow-md shadow-red-500"
                : "border-amber-400 bg-amber-400/40 shadow-md shadow-amber-400"
              : "border-astro-accent bg-astro-accent/20 shadow-sm shadow-astro-accent"
          }`}
        />

        {/* Pitch Ladder Indicators */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-4 flex items-center gap-1 font-mono text-[9px] text-astro-accent/80 font-bold">
          <span>
            {altitude > 0
              ? `+${Math.round(altitude)}°`
              : `${Math.round(altitude)}°`}
          </span>
          <div className="w-2.5 h-px bg-astro-accent" />
        </div>

        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-4 flex items-center gap-1 font-mono text-[9px] text-astro-accent/80 font-bold">
          <div className="w-2.5 h-px bg-astro-accent" />
          <span>
            {altitude > 0
              ? `+${Math.round(altitude)}°`
              : `${Math.round(altitude)}°`}
          </span>
        </div>
      </div>

      {/* Target Lock HUD Banner (Appears below reticle when target centered) */}
      {isLocked && lockedTarget && (
        <div className="absolute top-[calc(50%+7.5rem)] flex flex-col items-center pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
          <div
            onClick={() =>
              onSelectLockedTarget && onSelectLockedTarget(lockedTarget)
            }
            className={`cursor-pointer px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2 transition hover:scale-105 active:scale-95 ${
              isNightVision
                ? "bg-red-950/90 border-red-500 text-red-300"
                : "bg-astro-dark/90 border-amber-400 text-amber-300"
            }`}
          >
            <Target
              className="w-3.5 h-3.5 animate-spin"
              style={{ animationDuration: "4s" }}
            />
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span>{lockedTarget.label}</span>
                <span className="text-[9px] opacity-70">
                  [{lockedTarget.type}]
                </span>
              </div>
              <div className="text-[9px] opacity-80 flex gap-2">
                <span>ALT: {Math.round(lockedTarget.altitude)}°</span>
                <span>AZ: {Math.round(lockedTarget.azimuth)}°</span>
                {lockedTarget.distanceKm && (
                  <span>{lockedTarget.distanceKm} KM</span>
                )}
              </div>
            </div>
            <div className="ml-1 p-1 rounded-full bg-white/10 hover:bg-white/20">
              <Info className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
