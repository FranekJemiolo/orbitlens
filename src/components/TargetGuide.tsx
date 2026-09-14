import React from "react";
import type { ARObject } from "../math/coordinates";
import type { OrientationTelemetry } from "../math/deviceOrientation";
import { Navigation, X } from "lucide-react";
import { soundService } from "../services/audio";

interface TargetGuideProps {
  target: ARObject | null;
  telemetry: OrientationTelemetry;
  hFov: number;
  vFov: number;
  isNightVision: boolean;
  onClearTarget: () => void;
}

export const TargetGuide: React.FC<TargetGuideProps> = ({
  target,
  telemetry,
  hFov,
  vFov,
  isNightVision,
  onClearTarget,
}) => {
  if (!target) return null;

  let deltaAz = target.azimuth - telemetry.azimuth;
  while (deltaAz > 180) deltaAz -= 360;
  while (deltaAz < -180) deltaAz += 360;

  const deltaAlt = target.altitude - telemetry.altitude;

  // Check if target is already inside camera FOV
  const isInsideFov =
    Math.abs(deltaAz) <= hFov / 2 && Math.abs(deltaAlt) <= vFov / 2;

  // Compute direction angle on screen: 0 is Right, 90 is Down, -90 is Up, 180 is Left
  // In screen coords: X is deltaAz, Y is -deltaAlt
  const screenAngleRad = Math.atan2(-deltaAlt, deltaAz);
  const arrowRotationDeg = (screenAngleRad * 180) / Math.PI;

  // Bearing directions
  const horizTurn =
    Math.abs(deltaAz) < 5
      ? ""
      : deltaAz > 0
        ? `TURN RIGHT ${Math.round(deltaAz)}°`
        : `TURN LEFT ${Math.round(Math.abs(deltaAz))}°`;

  const vertPitch =
    Math.abs(deltaAlt) < 5
      ? ""
      : deltaAlt > 0
        ? `PITCH UP ${Math.round(deltaAlt)}°`
        : `PITCH DOWN ${Math.round(Math.abs(deltaAlt))}°`;

  const instruction = [horizTurn, vertPitch].filter(Boolean).join(" • ");

  return (
    <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden select-none">
      {/* Off-screen guidance chevron (only when target is outside FOV) */}
      {!isInsideFov && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(-50%, -50%) rotate(${arrowRotationDeg}deg) translate(min(42vw, 42vh))`,
          }}
        >
          <div
            className={`p-2.5 rounded-full border shadow-2xl backdrop-blur-md animate-pulse pointer-events-auto ${
              isNightVision
                ? "bg-red-950/90 border-red-500 text-red-400 shadow-red-500/40"
                : "bg-astro-dark/90 border-amber-400 text-amber-300 shadow-amber-400/30"
            }`}
          >
            <Navigation className="w-5 h-5 transform rotate-90 fill-current" />
          </div>
        </div>
      )}

      {/* Top Floating Target Tracking HUD Banner */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-2xl transition ${
            isNightVision
              ? "bg-red-950/90 border-red-500 text-red-300"
              : isInsideFov
                ? "bg-emerald-950/80 border-emerald-400 text-emerald-300"
                : "bg-astro-dark/90 border-amber-400 text-amber-300"
          }`}
          data-testid="target-guide-hud"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isInsideFov
                ? "bg-emerald-400 animate-ping"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <div className="font-mono text-xs">
            <div className="flex items-center gap-1.5 font-bold">
              <span>TRACKING: {target.label}</span>
              <span className="text-[10px] opacity-70">[{target.type}]</span>
            </div>
            <div className="text-[10px] opacity-80">
              {isInsideFov ? (
                <span className="text-emerald-400 font-bold">
                  TARGET IN SIGHT • CENTER IN RETICLE
                </span>
              ) : (
                instruction || "ALIGNED"
              )}
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClickSound();
              onClearTarget();
            }}
            className="p-1 rounded-lg border border-current/20 hover:bg-white/10 transition ml-1"
            title="Cancel Tracking"
            data-testid="clear-tracking-target"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
