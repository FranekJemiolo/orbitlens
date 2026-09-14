import React, { useState } from "react";
import {
  Eye,
  Sparkles,
  Satellite,
  Plane,
  Flame,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { sensorService } from "../services/sensors";

interface ControlPanelProps {
  isNightVision: boolean;
  onToggleNightVision: () => void;
  showStars: boolean;
  onToggleStars: () => void;
  showConstellations: boolean;
  onToggleConstellations: () => void;
  showSatellites: boolean;
  onToggleSatellites: () => void;
  showAircraft: boolean;
  onToggleAircraft: () => void;
  showMeteors: boolean;
  onToggleMeteors: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isNightVision,
  onToggleNightVision,
  showStars,
  onToggleStars,
  showConstellations,
  onToggleConstellations,
  showSatellites,
  onToggleSatellites,
  showAircraft,
  onToggleAircraft,
  showMeteors,
  onToggleMeteors,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  const handleRequestSensorPermission = async () => {
    const granted = await sensorService.requestOrientationPermission();
    setHasPermission(granted);
  };

  return (
    <div className="absolute bottom-4 left-3 right-3 select-none z-30 pointer-events-auto">
      {/* Quick Action Dock */}
      <div className="flex items-center justify-between gap-2 bg-astro-dark/85 backdrop-blur-md border border-astro-accent/30 rounded-xl p-2 shadow-2xl">
        {/* Night Vision Switch */}
        <button
          onClick={onToggleNightVision}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold transition-all duration-200 border ${
            isNightVision
              ? "bg-red-600/30 border-red-500 text-red-400 shadow-md shadow-red-500/20"
              : "bg-astro-dark/50 border-astro-accent/30 text-astro-text/80 hover:border-astro-accent hover:text-astro-accent"
          }`}
          data-testid="night-vision-toggle"
          title="Toggle Astro-Red Tactical Night Vision"
        >
          <Eye
            className={`w-4 h-4 ${isNightVision ? "text-red-400 animate-pulse" : ""}`}
          />
          <span>{isNightVision ? "NV ACTIVE" : "NIGHT VISION"}</span>
        </button>

        {/* Quick Toggles: Stars & Constellations */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStars}
            className={`p-2 rounded-lg text-xs transition border ${
              showStars
                ? "bg-astro-accent/20 border-astro-accent text-astro-accent"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title="Toggle Stars"
            data-testid="toggle-stars"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleSatellites}
            className={`p-2 rounded-lg text-xs transition border ${
              showSatellites
                ? "bg-red-500/20 border-red-400 text-red-400"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title="Toggle Satellites"
            data-testid="toggle-satellites"
          >
            <Satellite className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleAircraft}
            className={`p-2 rounded-lg text-xs transition border ${
              showAircraft
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title="Toggle Aircraft"
            data-testid="toggle-aircraft"
          >
            <Plane className="w-4 h-4" />
          </button>

          {/* Expand Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg text-xs bg-astro-dark/60 border border-astro-accent/30 text-astro-accent hover:bg-astro-accent/10 transition"
            title="Layer Settings"
            data-testid="layer-settings-toggle"
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <SlidersHorizontal className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Controls Drawer */}
      {isOpen && (
        <div className="mt-2 bg-astro-dark/95 backdrop-blur-lg border border-astro-accent/40 rounded-xl p-3 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center text-xs font-mono border-b border-astro-accent/20 pb-1.5 text-astro-accent">
            <span className="font-bold tracking-wider">TACTICAL LAYERS</span>
            <span className="text-[10px] text-astro-text/60">
              ORBITLENS TELEMETRY
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Stars */}
            <button
              onClick={onToggleStars}
              className={`flex items-center justify-between p-2 rounded border transition ${
                showStars
                  ? "bg-astro-accent/20 border-astro-accent text-astro-accent font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Stars (5k)
              </span>
              <span className="text-[10px]">{showStars ? "ON" : "OFF"}</span>
            </button>

            {/* Constellations */}
            <button
              onClick={onToggleConstellations}
              className={`flex items-center justify-between p-2 rounded border transition ${
                showConstellations
                  ? "bg-astro-accent/20 border-astro-accent text-astro-accent font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Constellations
              </span>
              <span className="text-[10px]">
                {showConstellations ? "ON" : "OFF"}
              </span>
            </button>

            {/* Satellites */}
            <button
              onClick={onToggleSatellites}
              className={`flex items-center justify-between p-2 rounded border transition ${
                showSatellites
                  ? "bg-red-500/20 border-red-400 text-red-400 font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5" /> Satellites (ISS)
              </span>
              <span className="text-[10px]">
                {showSatellites ? "ON" : "OFF"}
              </span>
            </button>

            {/* Aircraft */}
            <button
              onClick={onToggleAircraft}
              className={`flex items-center justify-between p-2 rounded border transition ${
                showAircraft
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5" /> Aircraft (ADS-B)
              </span>
              <span className="text-[10px]">{showAircraft ? "ON" : "OFF"}</span>
            </button>

            {/* Meteors */}
            <button
              onClick={onToggleMeteors}
              className={`flex items-center justify-between p-2 rounded border transition ${
                showMeteors
                  ? "bg-amber-500/20 border-amber-400 text-amber-400 font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Meteors (Radiants)
              </span>
              <span className="text-[10px]">{showMeteors ? "ON" : "OFF"}</span>
            </button>

            {/* Sensor Calibration / iOS Permission */}
            <button
              onClick={handleRequestSensorPermission}
              className="flex items-center justify-between p-2 rounded border border-astro-accent/30 bg-astro-accent/10 text-astro-accent font-semibold hover:bg-astro-accent/20 transition"
              title="Calibrate Gyroscope & Compass"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Calibrate Sensors
              </span>
              <span className="text-[10px]">
                {hasPermission ? "ACTIVE" : "GRANT"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
