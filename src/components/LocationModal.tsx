import React, { useState } from "react";
import { MapPin, X, Navigation, Compass, Check, Globe2 } from "lucide-react";
import { sensorService, WORLD_PRESETS } from "../services/sensors";
import type { LocationState, WorldLocationPreset } from "../services/sensors";
import { soundService } from "../services/audio";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationState;
  onSelectLocation: (
    lat: number,
    lon: number,
    alt?: number,
    name?: string,
  ) => void;
  isNightVision: boolean;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  isNightVision,
}) => {
  const [customLat, setCustomLat] = useState(
    currentLocation.latitude.toFixed(4),
  );
  const [customLon, setCustomLon] = useState(
    currentLocation.longitude.toFixed(4),
  );
  const [customAlt, setCustomAlt] = useState(
    Math.round(currentLocation.altitudeMeters).toString(),
  );

  if (!isOpen) return null;

  const handleSelectPreset = (preset: WorldLocationPreset) => {
    soundService.playClickSound();
    onSelectLocation(
      preset.latitude,
      preset.longitude,
      preset.altitudeMeters,
      preset.name,
    );
    onClose();
  };

  const handleUseDeviceGPS = () => {
    soundService.playClickSound();
    sensorService.resetToDeviceGPS();
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    const alt = parseFloat(customAlt) || 50;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert("Please enter a valid latitude between -90 and +90 degrees.");
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      alert("Please enter a valid longitude between -180 and +180 degrees.");
      return;
    }

    soundService.playClickSound();
    onSelectLocation(
      lat,
      lon,
      alt,
      `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/60 backdrop-blur-sm pointer-events-auto select-none">
      <div
        className={`w-full max-w-lg bg-astro-dark/95 border ${
          isNightVision
            ? "border-red-500/60 text-red-300 shadow-red-950/50"
            : "border-astro-accent/40 text-astro-text shadow-astro-accent/10"
        } rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150`}
        data-testid="location-modal"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-astro-accent/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-astro-accent font-mono text-sm font-bold tracking-wider">
            <MapPin className="w-4 h-4" />
            <span>OBSERVER GEOLOCATION</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-astro-accent/20 hover:bg-astro-accent/10 transition text-astro-text/70 hover:text-astro-text"
            data-testid="close-location-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs max-h-[70vh]">
          {/* Active Location Card */}
          <div className="p-3 rounded-xl bg-astro-dark/70 border border-astro-accent/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-astro-text/60 uppercase">
                Active Observer Coordinates
              </div>
              <div className="text-sm font-bold text-astro-accent mt-0.5 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>
                  {currentLocation.latitude.toFixed(4)}°N,{" "}
                  {currentLocation.longitude.toFixed(4)}°E
                </span>
              </div>
              <div className="text-[10px] text-astro-text/70 mt-0.5">
                Altitude: {Math.round(currentLocation.altitudeMeters)}m • Mode:{" "}
                {currentLocation.isManual ? "Manual Override" : "Live GPS Lock"}
              </div>
            </div>

            <button
              onClick={handleUseDeviceGPS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold text-[11px] transition shrink-0"
              title="Detect Current GPS Location"
              data-testid="use-gps-button"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" />
              <span>AUTO GPS</span>
            </button>
          </div>

          {/* Section: World Observation Presets */}
          <div>
            <div className="text-[11px] font-bold text-astro-accent tracking-wider uppercase mb-2 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5" />
              <span>World Observation Presets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WORLD_PRESETS.map((preset) => {
                const isSelected =
                  Math.abs(preset.latitude - currentLocation.latitude) < 0.05 &&
                  Math.abs(preset.longitude - currentLocation.longitude) < 0.05;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? "bg-astro-accent/25 border-astro-accent text-astro-accent font-semibold"
                        : "bg-astro-dark/50 border-astro-accent/20 hover:bg-astro-accent/15 hover:border-astro-accent/40"
                    }`}
                    data-testid={`preset-${preset.id}`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1">
                        <span>{preset.name}</span>
                        {isSelected && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-astro-text/60">
                        {preset.region}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-astro-dark/80 border border-astro-accent/30 text-astro-accent">
                      {preset.altitudeMeters}m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Custom Coordinate Input */}
          <form
            onSubmit={handleApplyCustom}
            className="p-3 rounded-xl bg-astro-dark/60 border border-astro-accent/25 space-y-2.5"
          >
            <div className="text-[11px] font-bold text-astro-accent uppercase">
              Custom Geographical Coordinates
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-astro-text/60 block mb-1">
                  Latitude (-90 to +90)
                </label>
                <input
                  type="number"
                  step="any"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-astro-dark/80 border border-astro-accent/30 text-astro-text focus:outline-hidden focus:border-astro-accent text-xs font-mono"
                  data-testid="custom-lat-input"
                />
              </div>

              <div>
                <label className="text-[10px] text-astro-text/60 block mb-1">
                  Longitude (-180 to +180)
                </label>
                <input
                  type="number"
                  step="any"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-astro-dark/80 border border-astro-accent/30 text-astro-text focus:outline-hidden focus:border-astro-accent text-xs font-mono"
                  data-testid="custom-lon-input"
                />
              </div>

              <div>
                <label className="text-[10px] text-astro-text/60 block mb-1">
                  Altitude (m)
                </label>
                <input
                  type="number"
                  value={customAlt}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-astro-dark/80 border border-astro-accent/30 text-astro-text focus:outline-hidden focus:border-astro-accent text-xs font-mono"
                  data-testid="custom-alt-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl border border-astro-accent/40 bg-astro-accent/15 hover:bg-astro-accent/30 text-astro-accent font-bold transition flex items-center justify-center gap-1.5"
              data-testid="apply-custom-location-button"
            >
              <span>SET OBSERVER COORDINATES</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
