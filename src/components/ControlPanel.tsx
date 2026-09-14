import React, { useState, useEffect } from "react";
import {
  Eye,
  Sparkles,
  Satellite,
  Plane,
  Flame,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Volume2,
  VolumeX,
  Smartphone,
} from "lucide-react";
import { sensorService } from "../services/sensors";
import { soundService } from "../services/audio";

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
  const [isSoundOn, setIsSoundOn] = useState(soundService.enabled);
  const [installPrompt, setInstallPrompt] = useState<unknown | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleToggleSound = () => {
    soundService.enabled = !soundService.enabled;
    setIsSoundOn(soundService.enabled);
    if (soundService.enabled) soundService.playClickSound();
  };

  const handleRequestSensorPermission = async () => {
    soundService.playClickSound();
    const granted = await sensorService.requestOrientationPermission();
    setHasPermission(granted);
  };

  const handleInstallApp = async () => {
    if (
      installPrompt &&
      typeof (installPrompt as { prompt: () => Promise<void> }).prompt ===
        "function"
    ) {
      await (installPrompt as { prompt: () => Promise<void> }).prompt();
      setInstallPrompt(null);
    } else {
      alert(
        'To install OrbitLens: on iOS Safari tap Share -> "Add to Home Screen"; on Android tap the browser menu -> "Install App".',
      );
    }
  };

  return (
    <div className="absolute bottom-4 left-3 right-3 select-none z-30 pointer-events-auto">
      {/* Quick Action Dock */}
      <div className="flex items-center justify-between gap-2 bg-astro-dark/85 backdrop-blur-md border border-astro-accent/30 rounded-2xl p-2 shadow-2xl">
        {/* Night Vision Switch */}
        <button
          onClick={() => {
            soundService.playClickSound();
            onToggleNightVision();
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-200 border ${
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

        {/* Quick Toggles: Stars, Satellites, Aircraft */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundService.playClickSound();
              onToggleStars();
            }}
            className={`p-2 rounded-xl text-xs transition border ${
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
            onClick={() => {
              soundService.playClickSound();
              onToggleSatellites();
            }}
            className={`p-2 rounded-xl text-xs transition border ${
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
            onClick={() => {
              soundService.playClickSound();
              onToggleAircraft();
            }}
            className={`p-2 rounded-xl text-xs transition border ${
              showAircraft
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title="Toggle Aircraft"
            data-testid="toggle-aircraft"
          >
            <Plane className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl text-xs transition border ${
              isSoundOn
                ? "bg-astro-accent/15 border-astro-accent/40 text-astro-accent"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title={isSoundOn ? "Mute Tactical Audio" : "Unmute Tactical Audio"}
          >
            {isSoundOn ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Expand Menu Button */}
          <button
            onClick={() => {
              soundService.playClickSound();
              setIsOpen(!isOpen);
            }}
            className="p-2 rounded-xl text-xs bg-astro-dark/60 border border-astro-accent/30 text-astro-accent hover:bg-astro-accent/10 transition"
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
        <div className="mt-2 bg-astro-dark/95 backdrop-blur-xl border border-astro-accent/40 rounded-2xl p-3.5 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center text-xs font-mono border-b border-astro-accent/20 pb-2 text-astro-accent">
            <span className="font-bold tracking-wider">
              TACTICAL LAYERS & TELEMETRY
            </span>
            <span className="text-[10px] text-astro-text/60">
              ORBITLENS V1.0
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Stars */}
            <button
              onClick={() => {
                soundService.playClickSound();
                onToggleStars();
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                showStars
                  ? "bg-astro-accent/20 border-astro-accent text-astro-accent font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Stars (5,070)
              </span>
              <span className="text-[10px]">{showStars ? "ON" : "OFF"}</span>
            </button>

            {/* Constellations */}
            <button
              onClick={() => {
                soundService.playClickSound();
                onToggleConstellations();
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
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
              onClick={() => {
                soundService.playClickSound();
                onToggleSatellites();
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
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
              onClick={() => {
                soundService.playClickSound();
                onToggleAircraft();
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
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
              onClick={() => {
                soundService.playClickSound();
                onToggleMeteors();
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                showMeteors
                  ? "bg-amber-500/20 border-amber-400 text-amber-400 font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Meteor Radiants
              </span>
              <span className="text-[10px]">{showMeteors ? "ON" : "OFF"}</span>
            </button>

            {/* Sensor Calibration / iOS Permission */}
            <button
              onClick={handleRequestSensorPermission}
              className="flex items-center justify-between p-2.5 rounded-xl border border-astro-accent/30 bg-astro-accent/10 text-astro-accent font-semibold hover:bg-astro-accent/20 transition"
              title="Calibrate Gyroscope & Compass"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Sensor Calib
              </span>
              <span className="text-[10px]">
                {hasPermission ? "ACTIVE" : "GRANT"}
              </span>
            </button>
          </div>

          {/* Install PWA Button */}
          <button
            onClick={handleInstallApp}
            className="w-full py-2 px-3 rounded-xl border border-astro-accent/30 bg-astro-accent/10 hover:bg-astro-accent/20 text-astro-text font-mono text-xs flex items-center justify-center gap-2 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-astro-accent" />
            <span>Install OrbitLens PWA (Offline Dark-Sky Ready)</span>
          </button>
        </div>
      )}
    </div>
  );
};
