import React, { useState } from "react";
import { Search, Compass, MapPin, Settings, Sun, Moon } from "lucide-react";

interface NavbarProps {
  onSearch: (city: string) => void;
  onUseMyLocation: () => void;
  isCelsius: boolean;
  setIsCelsius: (val: boolean) => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  activeCity: string;
}

export default function Navbar({
  onSearch,
  onUseMyLocation,
  isCelsius,
  setIsCelsius,
  onOpenSettings,
  isLoading,
  activeCity,
}: NavbarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <header id="top-navbar" className="sticky top-0 z-20 bg-background/80 backdrop-blur-md flex flex-col md:flex-row gap-3 md:gap-8 justify-between items-stretch md:items-center w-full px-4 md:px-12 py-3 md:py-4 max-w-[1400px] mx-auto border-b border-primary-container/20">
      {/* Mobile brand header & actions */}
      <div className="flex md:hidden items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-container rounded-full flex items-center justify-center text-primary">
            <span className="text-lg">☁️</span>
          </div>
          <div>
            <h1 className="bubbly-text text-primary font-black text-base tracking-tight leading-none">
              AetherWeather
            </h1>
            <p className="text-on-surface-variant text-[10px] font-bold mt-0.5">Stay Cozy!</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="settings-navbar-btn-mobile"
            onClick={onOpenSettings}
            className="p-2 text-primary hover:bg-surface-container-high rounded-full transition-all bg-white shadow-sm border border-primary-container/20"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            id="unit-toggle-btn-mobile"
            onClick={() => setIsCelsius(!isCelsius)}
            className="text-primary font-black text-xs px-2.5 py-1.5 bg-surface-container-high rounded-lg hover:brightness-95 active:scale-95 transition-all shadow-sm bubbly-text"
          >
            {isCelsius ? "°C" : "°F"}
          </button>

          <div id="user-avatar-pill-mobile" className="w-8 h-8 bg-secondary-fixed-dim rounded-full flex items-center justify-center overflow-hidden border border-white shadow-sm">
            <span className="text-base">👩‍🎨</span>
          </div>
        </div>
      </div>

      {/* Search Input and Location Service */}
      <form
        id="search-weather-form"
        onSubmit={handleSubmit}
        className="flex items-center gap-2 md:gap-4 w-full md:max-w-2xl"
      >
        <div className="relative w-full group">
          <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4 md:w-5 md:h-5 transition-transform group-focus-within:scale-110" />
          <input
            id="search-city-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-surface-container-highest border-none rounded-full text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary/30 transition-all font-sans font-semibold shadow-inner outline-none text-sm md:text-base"
            placeholder="Search city or zip code..."
          />
          {query && (
            <button
              type="button"
              id="clear-query-btn"
              onClick={() => setQuery("")}
              className="absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary font-bold text-xs"
            >
              Clear
            </button>
          )}
        </div>
        
        <button
          type="button"
          id="use-my-location-btn"
          onClick={onUseMyLocation}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 md:px-5 py-2.5 md:py-3.5 bg-tertiary-container text-on-tertiary-container rounded-full hover:brightness-105 active:scale-95 transition-all flex-shrink-0 font-bold text-xs md:text-sm bubbly-text shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Compass className="w-4 h-4 md:w-5 md:h-5 animate-spin-slow" />
          <span className="hidden sm:block">USE LOCATION</span>
        </button>
      </form>

      {/* Top Navbar Actions - Desktop Only */}
      <div id="top-navbar-actions" className="hidden md:flex items-center gap-3">
        {/* Active City indicator pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-white/70 rounded-full border border-primary-container text-primary text-xs font-bold">
          <MapPin className="w-3.5 h-3.5" />
          <span>{activeCity || "Loading..."}</span>
        </div>

        {/* Settings button */}
        <button
          id="settings-navbar-btn"
          onClick={onOpenSettings}
          className="p-2.5 text-primary hover:bg-surface-container-high rounded-full transition-all cursor-pointer shadow-sm bg-white"
          title="Aether Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="h-6 w-[2px] bg-primary-container"></div>

        {/* Unit switch button */}
        <button
          id="unit-toggle-btn"
          onClick={() => setIsCelsius(!isCelsius)}
          className="text-primary font-black text-sm px-4 py-2 bg-surface-container-high rounded-xl hover:brightness-95 active:scale-95 transition-all cursor-pointer shadow-sm bubbly-text"
        >
          {isCelsius ? "Celsius (°C)" : "Fahrenheit (°F)"}
        </button>

        {/* User avatar indicator */}
        <div id="user-avatar-pill" className="w-10 h-10 bg-secondary-fixed-dim rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm cursor-pointer">
          <span className="text-xl">👩‍🎨</span>
        </div>
      </div>
    </header>
  );
}
