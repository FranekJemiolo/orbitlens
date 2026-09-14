import React from "react";

interface ReticleProps {
  altitude: number;
  roll: number;
}

export const Reticle: React.FC<ReticleProps> = ({ altitude, roll }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      <div
        className="relative w-52 h-52 transition-transform duration-75"
        style={{ transform: `rotate(${-roll}deg)` }}
      >
        {/* Outer Circular Reticle Ring */}
        <div className="absolute inset-0 border border-astro-accent/25 rounded-full" />
        <div className="absolute inset-2 border border-dashed border-astro-accent/20 rounded-full animate-pulse-ring" />

        {/* Tactical Corner Brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-astro-accent" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-astro-accent" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-astro-accent" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-astro-accent" />

        {/* Center Crosshairs */}
        <div className="absolute top-1/2 left-4 right-4 h-px bg-astro-accent/30 -translate-y-1/2" />
        <div className="absolute left-1/2 top-4 bottom-4 w-px bg-astro-accent/30 -translate-x-1/2" />

        {/* Center Target Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-astro-accent bg-astro-accent/20 shadow-sm shadow-astro-accent" />

        {/* Pitch Angle Indicator Lines */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-4 flex items-center gap-1 font-mono text-[9px] text-astro-accent/70">
          <span>
            {altitude > 0
              ? `+${Math.round(altitude)}°`
              : `${Math.round(altitude)}°`}
          </span>
          <div className="w-2 h-px bg-astro-accent" />
        </div>

        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-4 flex items-center gap-1 font-mono text-[9px] text-astro-accent/70">
          <div className="w-2 h-px bg-astro-accent" />
          <span>
            {altitude > 0
              ? `+${Math.round(altitude)}°`
              : `${Math.round(altitude)}°`}
          </span>
        </div>
      </div>
    </div>
  );
};
