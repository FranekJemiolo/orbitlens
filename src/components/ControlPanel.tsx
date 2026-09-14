import React, { useState, useEffect } from "react";
import {
  Eye,
  Sparkles,
  Globe2,
  Satellite,
  Plane,
  Flame,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Volume2,
  VolumeX,
  Smartphone,
  Search,
  HelpCircle,
  Compass,
  Moon,
} from "lucide-react";
import { sensorService } from "../services/sensors";
import { soundService } from "../services/audio";

interface ControlPanelProps {
  isNightVision: boolean;
  onToggleNightVision: () => void;
  showPlanets: boolean;
  onTogglePlanets: () => void;
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
  isSkyMapMode?: boolean;
  onToggleSkyMapMode?: () => void;
  isRadarOpen?: boolean;
  onToggleRadar?: () => void;
  onOpenSearch: () => void;
  onOpenHelp: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isNightVision,
  onToggleNightVision,
  showPlanets,
  onTogglePlanets,
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
  isSkyMapMode = false,
  onToggleSkyMapMode,
  isRadarOpen = true,
  onToggleRadar,
  onOpenSearch,
  onOpenHelp,
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
    <div className="absolute bottom-3 left-2.5 right-2.5 select-none z-30 pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]">
      {/* Quick Action Dock */}
      <div className="flex items-center justify-between gap-1.5 bg-astro-dark/90 backdrop-blur-md border border-astro-accent/30 rounded-2xl p-1.5 shadow-2xl">
        {/* Night Vision Switch */}
        <button
          onClick={() => {
            soundService.playClickSound();
            onToggleNightVision();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all duration-200 border shrink-0 ${
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

        {/* Action Buttons: Search, Planets, Stars, Sats, Flights, Sound, Help, Settings */}
        <div className="flex items-center gap-1">
          {/* Search Trigger */}
          <button
            onClick={() => {
              soundService.playClickSound();
              onOpenSearch();
            }}
            className="p-2 rounded-xl text-xs bg-astro-accent/15 border border-astro-accent/40 text-astro-accent hover:bg-astro-accent/25 transition"
            title="Celestial Target Finder (Search)"
            data-testid="open-search-button"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Planets Toggle */}
          <button
            onClick={() => {
              soundService.playClickSound();
              onTogglePlanets();
            }}
            className={`p-2 rounded-xl text-xs transition border ${
              showPlanets
                ? "bg-amber-400/20 border-amber-400 text-amber-300 font-bold"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title="Toggle Planets & Moon"
            data-testid="toggle-planets"
          >
            <Globe2 className="w-4 h-4" />
          </button>

          {/* Stars Toggle */}
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

          {/* Satellites Toggle */}
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

          {/* Aircraft Toggle */}
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

          {/* Radar Mini-Map Toggle */}
          {onToggleRadar && (
            <button
              onClick={() => {
                soundService.playClickSound();
                onToggleRadar();
              }}
              className={`p-2 rounded-xl text-xs transition border ${
                isRadarOpen
                  ? "bg-astro-accent/25 border-astro-accent text-astro-accent font-bold"
                  : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
              }`}
              title={isRadarOpen ? "Hide All-Sky Radar" : "Show All-Sky Radar"}
              data-testid="toggle-radar"
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          {/* 360 Sky Map / Camera Mode Toggle */}
          {onToggleSkyMapMode && (
            <button
              onClick={() => {
                soundService.playClickSound();
                onToggleSkyMapMode();
              }}
              className={`p-2 rounded-xl text-xs transition border ${
                isSkyMapMode
                  ? "bg-sky-400/25 border-sky-400 text-sky-300 font-bold shadow-md shadow-sky-400/20"
                  : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
              }`}
              title={
                isSkyMapMode
                  ? "Switch to Live Camera AR"
                  : "Switch to 360° Sky Map (Daytime Stargazing / Drag Explore)"
              }
              data-testid="toggle-skymap"
            >
              <Moon className="w-4 h-4" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl text-xs transition border ${
              isSoundOn
                ? "bg-astro-accent/15 border-astro-accent/40 text-astro-accent"
                : "bg-astro-dark/40 border-astro-accent/20 text-astro-text/40"
            }`}
            title={isSoundOn ? "Mute Audio Feedback" : "Unmute Audio Feedback"}
          >
            {isSoundOn ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Quick Help / Legend */}
          <button
            onClick={() => {
              soundService.playClickSound();
              onOpenHelp();
            }}
            className="p-2 rounded-xl text-xs bg-astro-dark/60 border border-astro-accent/30 text-astro-text/70 hover:text-astro-accent hover:border-astro-accent transition"
            title="AR User Guide & Symbols"
            data-testid="open-help-button"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Expand Menu Drawer Button */}
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
            {/* Planets & Moon */}
            <button
              onClick={() => {
                soundService.playClickSound();
                onTogglePlanets();
              }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                showPlanets
                  ? "bg-amber-400/20 border-amber-400 text-amber-300 font-semibold"
                  : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
              }`}
              data-testid="drawer-toggle-planets"
            >
              <span className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5" /> Planets & Moon
              </span>
              <span className="text-[10px]">{showPlanets ? "ON" : "OFF"}</span>
            </button>

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
              data-testid="drawer-toggle-stars"
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
              data-testid="drawer-toggle-constellations"
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
              data-testid="drawer-toggle-satellites"
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
              data-testid="drawer-toggle-aircraft"
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
              data-testid="drawer-toggle-meteors"
            >
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Meteor Radiants
              </span>
              <span className="text-[10px]">{showMeteors ? "ON" : "OFF"}</span>
            </button>

            {/* All-Sky Radar */}
            {onToggleRadar && (
              <button
                onClick={() => {
                  soundService.playClickSound();
                  onToggleRadar();
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  isRadarOpen
                    ? "bg-astro-accent/25 border-astro-accent text-astro-accent font-semibold"
                    : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
                }`}
                data-testid="drawer-toggle-radar"
              >
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> All-Sky Radar
                </span>
                <span className="text-[10px]">
                  {isRadarOpen ? "ON" : "OFF"}
                </span>
              </button>
            )}

            {/* 360 Sky Map Mode */}
            {onToggleSkyMapMode && (
              <button
                onClick={() => {
                  soundService.playClickSound();
                  onToggleSkyMapMode();
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  isSkyMapMode
                    ? "bg-sky-400/25 border-sky-400 text-sky-300 font-semibold"
                    : "bg-astro-dark/50 border-astro-accent/20 text-astro-text/50"
                }`}
                data-testid="drawer-toggle-skymap"
              >
                <span className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" /> 360° Sky Map Mode
                </span>
                <span className="text-[10px]">
                  {isSkyMapMode ? "ON" : "OFF"}
                </span>
              </button>
            )}

            {/* Sensor Calibration / iOS Permission */}
            <button
              onClick={handleRequestSensorPermission}
              className="flex items-center justify-between p-2.5 rounded-xl border border-astro-accent/30 bg-astro-accent/10 text-astro-accent font-semibold hover:bg-astro-accent/20 transition col-span-2"
              title="Calibrate Gyroscope & Compass"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Gyro / Compass Sensor
                Calibration
              </span>
              <span className="text-[10px]">
                {hasPermission ? "CALIBRATED" : "GRANT PERMISSION"}
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
