import React from "react";
import {
  X,
  HelpCircle,
  Sparkles,
  Globe2,
  Satellite,
  Plane,
  Flame,
  Target,
  Smartphone,
  Eye,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNightVision: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  isNightVision,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/60 backdrop-blur-sm pointer-events-auto select-none">
      <div
        className={`w-full max-w-lg bg-astro-dark/95 border ${
          isNightVision
            ? "border-red-500/60 text-red-300 shadow-red-950/50"
            : "border-astro-accent/40 text-astro-text shadow-astro-accent/10"
        } rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150`}
        data-testid="help-modal"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-astro-accent/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-astro-accent font-mono text-sm font-bold tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>AR USER GUIDE & TACTICAL LEGEND</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-astro-accent/20 hover:bg-astro-accent/10 transition text-astro-text/70 hover:text-astro-text"
            data-testid="close-help-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs max-h-[70vh]">
          {/* Section 1: Object Symbols & Reticle Colors */}
          <div>
            <div className="text-[11px] font-bold text-astro-accent tracking-wider uppercase mb-2">
              1. Tactical Object Reticles
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-astro-dark/60 border border-astro-accent/20 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-300 shrink-0" />
                <div>
                  <div className="font-bold text-amber-300">Planets & Moon</div>
                  <div className="text-[10px] text-astro-text/60">
                    Venus, Mars, Jupiter, Moon
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-astro-dark/60 border border-astro-accent/20 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
                <div>
                  <div className="font-bold text-sky-300">Stars & Centers</div>
                  <div className="text-[10px] text-astro-text/60">
                    5,070 HYG Stars + Constellations
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-astro-dark/60 border border-astro-accent/20 flex items-center gap-2">
                <Satellite className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <div className="font-bold text-red-400">Satellites</div>
                  <div className="text-[10px] text-astro-text/60">
                    ISS (Zarya), Starlink TLEs
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-astro-dark/60 border border-astro-accent/20 flex items-center gap-2">
                <Plane className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-400">Aircraft</div>
                  <div className="text-[10px] text-astro-text/60">
                    OpenSky ADS-B live flights
                  </div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-astro-dark/60 border border-astro-accent/20 flex items-center gap-2 col-span-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-amber-400">
                    Meteor Radiants
                  </div>
                  <div className="text-[10px] text-astro-text/60">
                    Perseids, Geminids, Quadrantids radiants
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Gestures & Controls */}
          <div>
            <div className="text-[11px] font-bold text-astro-accent tracking-wider uppercase mb-2">
              2. Navigation & Gestures
            </div>
            <div className="space-y-1.5 text-astro-text/80 text-[11px]">
              <div className="flex items-start gap-2">
                <Target className="w-3.5 h-3.5 text-astro-accent mt-0.5 shrink-0" />
                <span>
                  <strong>Center Reticle Lock:</strong> Point your device at any
                  object to automatically lock and display instant range,
                  bearing, and altitude. Tap the badge to inspect.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Smartphone className="w-3.5 h-3.5 text-astro-accent mt-0.5 shrink-0" />
                <span>
                  <strong>Zoom:</strong> Pinch with 2 fingers (or scroll mouse
                  wheel) to smoothly zoom between 25° (telephoto) and 85° (wide
                  angle).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-astro-accent mt-0.5 shrink-0" />
                <span>
                  <strong>Night Vision:</strong> Tap "Night Vision" to switch
                  the HUD into Astro-Red monochromatic mode, preserving rod
                  cells and dark-adaptation under dark skies.
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Sensor Calibration */}
          <div>
            <div className="text-[11px] font-bold text-astro-accent tracking-wider uppercase mb-2">
              3. Sensor Calibration
            </div>
            <p className="text-astro-text/70 text-[11px] leading-relaxed">
              If the compass or altitude appears offset, move your device in a
              smooth <strong>figure-8 motion</strong> in the air for 3 seconds.
              On iOS Safari, tap "Sensor Calib" in the drawer to grant
              orientation permissions if prompted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
