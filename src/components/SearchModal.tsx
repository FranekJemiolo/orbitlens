import React, { useState, useMemo } from "react";
import type { ARObject } from "../math/coordinates";
import {
  Search,
  X,
  Crosshair,
  Satellite,
  Plane,
  Flame,
  Sparkles,
  Globe2,
  Compass,
} from "lucide-react";
import { soundService } from "../services/audio";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: ARObject) => void;
  availableObjects: ARObject[];
  isNightVision: boolean;
}

type FilterCategory =
  "ALL" | "PLANET" | "STAR" | "SATELLITE" | "CONSTELLATION" | "AIRPLANE";

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTarget,
  availableObjects,
  isNightVision,
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FilterCategory>("ALL");

  const filteredObjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return availableObjects.filter((obj) => {
      const isConstellation = obj.id.startsWith("con-");

      // Category filter
      if (category === "PLANET" && obj.type !== "PLANET") return false;
      if (category === "STAR" && (obj.type !== "STAR" || isConstellation))
        return false;
      if (category === "SATELLITE" && obj.type !== "SATELLITE") return false;
      if (category === "CONSTELLATION" && !isConstellation) return false;
      if (category === "AIRPLANE" && obj.type !== "AIRPLANE") return false;

      // Text query filter
      if (!q) return true;
      const matchLabel = obj.label.toLowerCase().includes(q);
      const matchType = obj.type.toLowerCase().includes(q);
      const matchConstellation =
        typeof obj.metadata?.constellation === "string" &&
        obj.metadata.constellation.toLowerCase().includes(q);

      return matchLabel || matchType || matchConstellation;
    });
  }, [availableObjects, query, category]);

  if (!isOpen) return null;

  const handleSelect = (obj: ARObject) => {
    soundService.playClickSound();
    onSelectTarget(obj);
    onClose();
  };

  const renderIcon = (obj: ARObject) => {
    if (obj.id.startsWith("con-")) {
      return <Compass className="w-4 h-4 text-sky-400" />;
    }
    switch (obj.type) {
      case "PLANET":
        return <Globe2 className="w-4 h-4 text-amber-300" />;
      case "SATELLITE":
        return <Satellite className="w-4 h-4 text-red-400" />;
      case "AIRPLANE":
        return <Plane className="w-4 h-4 text-emerald-400" />;
      case "METEOR":
        return <Flame className="w-4 h-4 text-amber-400" />;
      case "STAR":
      default:
        return <Sparkles className="w-4 h-4 text-sky-300" />;
    }
  };

  const categories: { key: FilterCategory; label: string }[] = [
    { key: "ALL", label: "ALL" },
    { key: "PLANET", label: "PLANETS" },
    { key: "STAR", label: "STARS" },
    { key: "SATELLITE", label: "SATS" },
    { key: "CONSTELLATION", label: "CONSTEL" },
    { key: "AIRPLANE", label: "FLIGHTS" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/60 backdrop-blur-sm pointer-events-auto select-none">
      <div
        className={`w-full max-w-lg bg-astro-dark/95 border ${
          isNightVision
            ? "border-red-500/60 text-red-300 shadow-red-950/50"
            : "border-astro-accent/40 text-astro-text shadow-astro-accent/10"
        } rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150`}
        data-testid="search-modal"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-astro-accent/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-astro-accent font-mono text-sm font-bold tracking-wider">
            <Search className="w-4 h-4" />
            <span>CELESTIAL TARGET FINDER</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-astro-accent/20 hover:bg-astro-accent/10 transition text-astro-text/70 hover:text-astro-text"
            data-testid="close-search-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-astro-accent/15 bg-astro-dark/40">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-astro-accent/60 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search planets, stars, ISS, constellations..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-astro-dark/70 border border-astro-accent/30 text-xs font-mono text-astro-text placeholder:text-astro-text/40 focus:outline-hidden focus:border-astro-accent"
              autoFocus
              data-testid="search-input"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 p-1 text-astro-text/50 hover:text-astro-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  soundService.playClickSound();
                  setCategory(cat.key);
                }}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  category === cat.key
                    ? "bg-astro-accent/25 border-astro-accent text-astro-accent font-bold shadow-xs"
                    : "bg-astro-dark/40 border-astro-accent/15 text-astro-text/60 hover:text-astro-text"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs max-h-96">
          {filteredObjects.length === 0 ? (
            <div className="p-8 text-center text-astro-text/50 font-mono text-xs">
              No celestial bodies or satellites match "{query}".
            </div>
          ) : (
            filteredObjects.slice(0, 50).map((obj) => {
              const isAboveHorizon = obj.altitude >= 0;
              return (
                <div
                  key={obj.id}
                  onClick={() => handleSelect(obj)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-astro-accent/15 bg-astro-dark/50 hover:bg-astro-accent/15 hover:border-astro-accent/40 cursor-pointer transition group"
                  data-testid={`search-item-${obj.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-astro-dark/80 border border-astro-accent/25 shrink-0">
                      {renderIcon(obj)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold flex items-center gap-1.5 truncate">
                        <span>{obj.label}</span>
                        {obj.magnitude !== undefined && (
                          <span className="text-[10px] opacity-60 font-normal">
                            [{obj.magnitude.toFixed(1)} mag]
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-astro-text/60 flex items-center gap-2">
                        <span
                          className={
                            isAboveHorizon
                              ? "text-emerald-400 font-semibold"
                              : "text-amber-400"
                          }
                        >
                          {isAboveHorizon ? "VIS" : "SET"}:{" "}
                          {obj.altitude > 0
                            ? `+${Math.round(obj.altitude)}`
                            : Math.round(obj.altitude)}
                          °
                        </span>
                        <span>AZ: {Math.round(obj.azimuth)}°</span>
                        {obj.distanceKm && (
                          <span>{obj.distanceKm.toLocaleString()} km</span>
                        )}
                        {obj.metadata?.phase && (
                          <span className="text-amber-300">
                            {String(obj.metadata.phase)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-astro-accent/30 bg-astro-accent/10 group-hover:bg-astro-accent group-hover:text-astro-dark transition text-[10px] font-bold shrink-0 ml-2"
                    title="Track Target in AR"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>TRACK</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
