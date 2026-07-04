import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { WeatherReport, FavoriteCity, SearchHistoryItem } from "./types";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  Snowflake, 
  CloudLightning, 
  Compass, 
  Eye, 
  Gauge, 
  Droplets, 
  HelpCircle, 
  Sparkles, 
  CheckCircle, 
  ChevronRight, 
  Heart, 
  History,
  Info,
  Calendar,
  Layers,
  Search,
  Plus,
  Trash2,
  X,
  Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Initial list of pre-configured favorite cities
const INITIAL_FAVORITES: FavoriteCity[] = [
  { city: "New York", country: "USA", tempCelsius: 24, condition: "Sunny" },
  { city: "Kyoto", country: "Japan", tempCelsius: 18, condition: "Cloudy" },
  { city: "Paris", country: "France", tempCelsius: 16, condition: "Rainy" },
  { city: "Reykjavik", country: "Iceland", tempCelsius: 3, condition: "Snowy" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [isCelsius, setIsCelsius] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteCity[]>(INITIAL_FAVORITES);
  const [hourlyView, setHourlyView] = useState<"hourly" | "precip">("hourly");
  
  // Custom dialogs
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>("");

  // Map settings
  const [mapLayer, setMapLayer] = useState<"precipitation" | "temperature" | "wind">("precipitation");
  const [zoomLevel, setZoomLevel] = useState<number>(3);

  // Load from local storage
  useEffect(() => {
    const savedHistory = localStorage.getItem("aether_history");
    if (savedHistory) {
      try { setSearchHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
    const savedFavorites = localStorage.getItem("aether_favorites");
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch (e) {}
    }
  }, []);

  // Fetch initial weather for Phnom Penh
  useEffect(() => {
    fetchWeatherByCity("Phnom Penh");
  }, []);

  // Sync to local storage helper
  const updateHistory = (item: SearchHistoryItem) => {
    const updated = [item, ...searchHistory.filter(h => h.city.toLowerCase() !== item.city.toLowerCase())].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem("aether_history", JSON.stringify(updated));
  };

  const fetchWeatherByCity = async (city: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (!response.ok) {
        throw new Error("Could not retrieve weather data for that city.");
      }
      const data: WeatherReport = await response.json();
      setWeather(data);

      // Add to search history
      updateHistory({
        id: Math.random().toString(36).substring(2, 9),
        city: data.city,
        country: data.country,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tempCelsius: data.tempCelsius,
        condition: data.condition
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/weather/by-location?lat=${lat}&lon=${lon}`);
      if (!response.ok) {
        throw new Error("Could not locate weather data for your area.");
      }
      const data: WeatherReport = await response.json();
      setWeather(data);

      updateHistory({
        id: Math.random().toString(36).substring(2, 9),
        city: data.city,
        country: data.country,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tempCelsius: data.tempCelsius,
        condition: data.condition
      });
    } catch (err: any) {
      setError(err.message || "Unable to acquire geolocation weather.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setIsLoading(false);
        setError("Location permission denied. Defaulting to Phnom Penh weather.");
        fetchWeatherByCity("Phnom Penh");
      },
      { timeout: 10000 }
    );
  };

  // Convert celsius to fahrenheit
  const formatTemp = (celsius: number) => {
    if (isCelsius) {
      return `${Math.round(celsius)}°C`;
    }
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  };

  const formatRawTempNum = (celsius: number) => {
    if (isCelsius) return celsius;
    return Math.round((celsius * 9) / 5 + 32);
  };

  // Condition icons and background colors mapping
  const getWeatherIcon = (cond: string, className = "w-12 h-12") => {
    switch (cond) {
      case "Sunny":
        return <Sun className={`${className} text-amber-500 animate-spin-slow`} />;
      case "Cloudy":
        return <Cloud className={`${className} text-indigo-400`} />;
      case "Rainy":
        return <CloudRain className={`${className} text-teal-400`} />;
      case "Snowy":
        return <Snowflake className={`${className} text-sky-400`} />;
      case "Stormy":
        return <CloudLightning className={`${className} text-purple-500`} />;
      default:
        return <Sun className={`${className} text-amber-500`} />;
    }
  };

  const toggleFavorite = (cityName: string, countryName: string) => {
    const exists = favorites.some(f => f.city.toLowerCase() === cityName.toLowerCase());
    let updated;
    if (exists) {
      updated = favorites.filter(f => f.city.toLowerCase() !== cityName.toLowerCase());
    } else {
      updated = [...favorites, {
        city: cityName,
        country: countryName,
        tempCelsius: weather?.tempCelsius || 20,
        condition: weather?.condition || "Sunny"
      }];
    }
    setFavorites(updated);
    localStorage.setItem("aether_favorites", JSON.stringify(updated));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.filter(h => h.id !== id);
    setSearchHistory(updated);
    localStorage.setItem("aether_history", JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("aether_history");
  };

  return (
    <div id="aether-app-wrapper" className="flex min-h-screen text-on-surface antialiased relative">
      
      {/* SIDEBAR NAVIGATION - DESKTOP */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenPremium={() => setShowPremiumModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onLogout={() => alert("AetherWeather logged you out safely. Stay Cozy!")}
      />

      {/* MAIN CONTAINER */}
      <main id="main-scroller" className="flex-1 flex flex-col h-screen overflow-y-auto hide-scrollbar pb-24 md:pb-6">
        
        {/* NAVBAR */}
        <Navbar 
          onSearch={fetchWeatherByCity}
          onUseMyLocation={handleUseMyLocation}
          isCelsius={isCelsius}
          setIsCelsius={setIsCelsius}
          onOpenSettings={() => setShowSettingsModal(true)}
          isLoading={isLoading}
          activeCity={weather ? `${weather.city}, ${weather.country}` : "Searching..."}
        />

        {/* LOADING & ERROR BANNER */}
        {error && (
          <div id="error-alert-banner" className="mx-6 md:mx-12 my-4 p-4 bg-error-container text-on-error-container rounded-2xl flex items-center justify-between border-2 border-red-200">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="font-semibold text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-on-error-container/70 hover:text-on-error-container font-black text-xs px-2 py-1 bg-white/45 rounded-lg"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading && (
          <div id="aether-loading-screen" className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-primary-container border-t-primary rounded-full animate-spin"></div>
              <Cloud className="w-10 h-10 text-primary/70 animate-bounce" />
            </div>
            <h3 className="bubbly-text text-primary text-xl font-bold mt-6">Brewing Cozy Weather...</h3>
            <p className="text-on-surface-variant text-xs mt-1">Sipping tea while fetching coordinates</p>
          </div>
        )}

        {/* SCREENS ROUTING */}
        {!isLoading && weather && (
          <AnimatePresence mode="wait">
            
            {/* TAB 1: DASHBOARD VIEW */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="p-6 md:p-12 max-w-[1400px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8"
              >
                {/* 1. MAIN COZY CARD */}
                <section id="hero-weather-card" className="md:col-span-8 kawaii-card p-6 md:p-10 flex flex-col md:flex-row items-center justify-between overflow-hidden relative">
                  <div className="absolute -top-12 -right-12 w-56 h-56 bg-primary-container/30 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-secondary-container/20 rounded-full blur-2xl"></div>
                  
                  <div className="flex flex-col z-10 text-center md:text-left">
                    <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                      <h2 className="bubbly-text text-3xl font-black text-on-surface">{weather.city}, {weather.country}</h2>
                      <button 
                        onClick={() => toggleFavorite(weather.city, weather.country)}
                        id="favorite-toggle-btn"
                        className="text-primary hover:scale-110 active:scale-95 transition-all p-1.5 bg-primary-container/20 rounded-full cursor-pointer"
                        title="Pin this location"
                      >
                        <Heart 
                          className={`w-6 h-6 ${favorites.some(f => f.city.toLowerCase() === weather.city.toLowerCase()) ? "fill-primary text-primary" : "text-primary"}`} 
                        />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mb-6 justify-center md:justify-start">
                      <p className="font-sans text-base text-on-surface-variant font-bold">
                        {weather.dateText} | {weather.timeText}
                      </p>
                      {weather.isFallback && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-500/20">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                          Local Cozy Fallback Mode
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <span className="bubbly-text text-7xl md:text-8xl text-primary font-black tracking-tighter">
                        {formatTemp(weather.tempCelsius)}
                      </span>
                      <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-2">
                          {getWeatherIcon(weather.condition, "w-8 h-8")}
                          <span className="bubbly-text text-xl text-primary font-bold">{weather.condition}</span>
                        </div>
                        <span className="text-sm font-semibold text-on-surface-variant/80 mt-1">
                          Feels like {formatTemp(weather.feelsLikeCelsius)}
                        </span>
                      </div>
                    </div>

                    {/* Cozy Advice snippet */}
                    <div className="mt-8 p-4 bg-primary-container/30 rounded-2xl border border-primary-container/50 flex gap-3 max-w-xl">
                      <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="text-xs uppercase font-bold tracking-wider text-primary">Aether Cozy Tip</p>
                        <p className="text-sm font-semibold text-on-primary-fixed-variant/90 mt-0.5">
                          {weather.cozyAdvice}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-48 h-48 z-10 mt-6 md:mt-0 flex items-center justify-center bg-primary-container/20 rounded-full border border-primary-container/30 relative">
                    <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-inner">
                      {getWeatherIcon(weather.condition, "w-28 h-28 animate-pulse")}
                    </div>
                  </div>
                </section>

                {/* 2. 7-DAY FORECAST */}
                <section id="forecast-sidebar-section" className="md:col-span-4 kawaii-card p-6 md:p-8 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="bubbly-text font-black text-on-surface-variant tracking-wide flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>7-DAY FORECAST</span>
                    </h3>
                    <Info className="w-4 h-4 text-on-surface-variant/50 cursor-help" title="Weekly temperature slider highlights general range" />
                  </div>

                  <div className="space-y-5 flex-1 justify-center flex flex-col">
                    {weather.forecast7Days.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <p className="w-14 font-black text-sm text-on-surface-variant">{f.day}</p>
                        <div className="flex-shrink-0" title={f.condition}>
                          {getWeatherIcon(f.condition, "w-7 h-7")}
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-xs w-6 text-right text-on-surface">
                            {formatRawTempNum(f.high)}°
                          </span>
                          
                          {/* Range slider gauge */}
                          <div className="w-20 h-2.5 bg-surface-container-highest rounded-full relative overflow-hidden">
                            <div 
                              className="absolute h-full bg-primary rounded-full"
                              style={{ 
                                left: `${Math.max(5, (f.low + 10) * 2.5)}%`, 
                                width: `${Math.max(20, (f.high - f.low) * 4)}%` 
                              }}
                            />
                          </div>
                          
                          <span className="font-bold text-xs w-6 text-on-surface-variant">
                            {formatRawTempNum(f.low)}°
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. 24-HOUR FORECAST CAROUSEL */}
                <section id="hourly-forecast-section" className="md:col-span-12 kawaii-card p-6 md:p-8 overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="bubbly-text font-black text-on-surface-variant tracking-wide">
                        24-HOUR FORECAST
                      </h3>
                      <p className="text-xs font-semibold text-on-surface-variant/60 mt-0.5">
                        Cozy forecast intervals of local region temperature and humidity
                      </p>
                    </div>
                    
                    {/* Hourly view togglers */}
                    <div className="flex bg-surface-container-high rounded-full p-1 border border-primary-container/25">
                      <button 
                        id="toggle-hourly-btn"
                        onClick={() => setHourlyView("hourly")}
                        className={`px-5 py-1.5 rounded-full font-bold text-xs bubbly-text transition-all ${
                          hourlyView === "hourly" 
                            ? "bg-white text-primary shadow-sm" 
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                      >
                        HOURLY TEMP
                      </button>
                      <button 
                        id="toggle-precip-btn"
                        onClick={() => setHourlyView("precip")}
                        className={`px-5 py-1.5 rounded-full font-bold text-xs bubbly-text transition-all ${
                          hourlyView === "precip" 
                            ? "bg-white text-primary shadow-sm" 
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                      >
                        PRECIPITATION
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between gap-4 overflow-x-auto pb-4 hide-scrollbar">
                    {weather.forecast24Hours.map((h, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col items-center min-w-[90px] gap-3 p-4 rounded-[2rem] border transition-all ${
                          idx === 0 
                            ? "bg-primary-container/20 border-primary-container" 
                            : "border-transparent hover:bg-surface-container-high"
                        }`}
                      >
                        <span className="font-bold text-xs text-on-surface-variant">{h.time}</span>
                        {getWeatherIcon(h.condition, "w-8 h-8")}
                        
                        {hourlyView === "hourly" ? (
                          <span className="bubbly-text font-black text-base text-primary">
                            {formatTemp(h.temp)}
                          </span>
                        ) : (
                          <span className="bubbly-text font-black text-xs text-teal-600">
                            {h.precipProb || 10}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. DETAILED METRICS GRID */}
                <section id="metrics-grid-section" className="md:col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-6">
                  
                  {/* UV Index */}
                  <div className="kawaii-card p-6 flex flex-col justify-between aspect-square">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Sun className="w-5 h-5 text-amber-500" />
                      <h4 className="bubbly-text text-xs font-black tracking-wide">UV INDEX</h4>
                    </div>
                    <div>
                      <p className="bubbly-text text-4xl md:text-5xl font-black text-primary leading-none">
                        {weather.metrics.uvIndex.value}
                      </p>
                      <p className="text-sm font-bold text-tertiary mt-2">
                        {weather.metrics.uvIndex.label}
                      </p>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container-high rounded-full relative overflow-hidden">
                      <div 
                        className="absolute h-full bg-primary rounded-full"
                        style={{ width: `${(weather.metrics.uvIndex.value / 11) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="kawaii-card p-6 flex flex-col justify-between aspect-square">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Droplets className="w-5 h-5 text-teal-500 animate-pulse" />
                      <h4 className="bubbly-text text-xs font-black tracking-wide">HUMIDITY</h4>
                    </div>
                    <div>
                      <p className="bubbly-text text-4xl md:text-5xl font-black text-primary leading-none">
                        {weather.metrics.humidity.value}%
                      </p>
                      <p className="text-xs font-bold text-on-surface-variant/70 mt-2">
                        Dew point {formatTemp(weather.metrics.humidity.dewPoint)}
                      </p>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container-high rounded-full relative overflow-hidden">
                      <div 
                        className="absolute h-full bg-teal-400 rounded-full"
                        style={{ width: `${weather.metrics.humidity.value}%` }}
                      />
                    </div>
                  </div>

                  {/* Wind Direction & Speed */}
                  <div className="kawaii-card p-6 flex flex-col justify-between aspect-square">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Compass className="w-5 h-5 text-indigo-500 animate-spin-slow" />
                      <h4 className="bubbly-text text-xs font-black tracking-wide">WIND</h4>
                    </div>
                    <div className="text-center flex flex-col items-center">
                      <p className="bubbly-text text-3xl font-black text-primary leading-none">
                        {weather.metrics.wind.speed} <span className="text-sm font-semibold">km/h</span>
                      </p>
                      
                      {/* Wind Dial Visualizer */}
                      <div className="w-14 h-14 mt-3 border-2 border-primary-container/60 rounded-full relative flex items-center justify-center bg-primary-container/10">
                        <Navigation 
                          className="w-5 h-5 text-primary transition-transform"
                          style={{ transform: `rotate(${weather.metrics.wind.direction}deg)` }}
                        />
                        <span className="absolute top-0.5 text-[8px] font-black">N</span>
                      </div>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="kawaii-card p-6 flex flex-col justify-between aspect-square">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Eye className="w-5 h-5 text-emerald-500" />
                      <h4 className="bubbly-text text-xs font-black tracking-wide">VISIBILITY</h4>
                    </div>
                    <div>
                      <p className="bubbly-text text-4xl md:text-5xl font-black text-primary leading-none">
                        {weather.metrics.visibility.value} <span className="text-sm font-semibold">km</span>
                      </p>
                      <p className="text-sm font-bold text-tertiary mt-2">
                        {weather.metrics.visibility.description}
                      </p>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container-high rounded-full relative overflow-hidden">
                      <div 
                        className="absolute h-full bg-emerald-400 rounded-full"
                        style={{ width: `${(weather.metrics.visibility.value / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Barometric Pressure */}
                  <div className="kawaii-card p-6 flex flex-col justify-between aspect-square">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Gauge className="w-5 h-5 text-rose-500" />
                      <h4 className="bubbly-text text-xs font-black tracking-wide">PRESSURE</h4>
                    </div>
                    <div>
                      <p className="bubbly-text text-3xl md:text-4xl font-black text-primary leading-none">
                        {weather.metrics.pressure.value} <span className="text-xs font-semibold">mb</span>
                      </p>
                      <p className="text-sm font-bold text-primary mt-2">
                        {weather.metrics.pressure.trend} Trend
                      </p>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container-high rounded-full relative overflow-hidden">
                      <div 
                        className="absolute h-full bg-rose-400 rounded-full"
                        style={{ width: `${Math.max(10, Math.min(100, (weather.metrics.pressure.value - 950) * 1.5))}%` }}
                      />
                    </div>
                  </div>

                </section>



              </motion.div>
            )}

            {/* TAB 2: MAP TAB (FULLSCREEN RADAR MAP) */}
            {activeTab === "map" && (
              <motion.div
                key="map-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="p-6 md:p-12 max-w-[1400px] mx-auto w-full"
              >
                <div className="kawaii-card p-6 overflow-hidden flex flex-col min-h-[650px] relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h2 className="bubbly-text text-2xl font-black text-primary">Aether Weather Radar Map</h2>
                      <p className="text-xs font-bold text-on-surface-variant/70 mt-0.5">Explore satellite layers, temperature systems, and wind streams</p>
                    </div>
                    
                    {/* Map Layers Toggles */}
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setMapLayer("precipitation")}
                        className={`px-4 py-2 rounded-xl font-bold text-xs bubbly-text transition-all ${
                          mapLayer === "precipitation" 
                            ? "bg-secondary-container text-on-secondary-container" 
                            : "bg-surface-container-high text-on-surface-variant hover:bg-white/50"
                        }`}
                      >
                        🌧️ Precipitation
                      </button>
                      <button 
                        onClick={() => setMapLayer("temperature")}
                        className={`px-4 py-2 rounded-xl font-bold text-xs bubbly-text transition-all ${
                          mapLayer === "temperature" 
                            ? "bg-secondary-container text-on-secondary-container" 
                            : "bg-surface-container-high text-on-surface-variant hover:bg-white/50"
                        }`}
                      >
                        🌡️ Temperature
                      </button>
                      <button 
                        onClick={() => setMapLayer("wind")}
                        className={`px-4 py-2 rounded-xl font-bold text-xs bubbly-text transition-all ${
                          mapLayer === "wind" 
                            ? "bg-secondary-container text-on-secondary-container" 
                            : "bg-surface-container-high text-on-surface-variant hover:bg-white/50"
                        }`}
                      >
                        💨 Wind Streams
                      </button>
                    </div>
                  </div>

                  {/* Simulated Radar Map Canvas Frame */}
                  <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden relative min-h-[450px]">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-all duration-300" 
                      style={{ 
                        backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAVPP0Jl0L51OVokq6TCaFY5NzP61U4UrlUuub-PiYx97SqaYo4fyfDM_LlzwkH1R3VbHseKqljd3zd_2Ks0t63JJwPnmMp5m7WwGTwMDCoWbLfeHP287sPCqQklCSaC1-UegF7I-ajyBNDpzUBMUGlwDTlBipJTjfUT0PHhFhmjUqZalhfawnBdHuZLXe-SxKwwzwun8I_RKcHoVQWwiztcLlNhxlKfWGtaAbcSMOUo3k-TV9fTDXFYhwz21F68zkf_ujg8TfX')`,
                        filter: mapLayer === "precipitation" ? "hue-rotate(180deg) saturate(1.5)" : mapLayer === "temperature" ? "hue-rotate(340deg) saturate(1.8)" : "contrast(1.2) brightness(0.9)"
                      }}
                    ></div>

                    {/* Kawaii Weather Elements Toggled on map */}
                    <div className="absolute inset-0 bg-black/20 pointer-events-none">
                      {mapLayer === "precipitation" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="w-72 h-72 rounded-full border border-teal-400 bg-teal-400/20 animate-ping duration-1000"></span>
                          <span className="absolute w-44 h-44 rounded-full border border-indigo-400 bg-indigo-400/20 animate-ping"></span>
                        </div>
                      )}
                      
                      {mapLayer === "temperature" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="absolute top-1/4 left-1/3 bg-red-500/40 text-white font-bold px-3 py-1 rounded-full text-xs blur-sm animate-pulse">Hot System</span>
                          <span className="absolute bottom-1/4 right-1/4 bg-blue-500/40 text-white font-bold px-3 py-1 rounded-full text-xs blur-sm animate-pulse">Cold Front</span>
                        </div>
                      )}

                      {mapLayer === "wind" && (
                        <div className="absolute inset-0 flex flex-col justify-around overflow-hidden text-white opacity-40 font-black tracking-widest text-9xl">
                          <div className="animate-marquee select-none">💨 💨 💨</div>
                          <div className="animate-marquee-reverse select-none">💨 💨 💨</div>
                        </div>
                      )}
                    </div>

                    {/* Zoom / Navigation controls inside map */}
                    <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                      <button 
                        onClick={() => setZoomLevel(prev => Math.min(10, prev + 1))}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-primary hover:bg-primary-container transition-all font-bold text-xl cursor-pointer"
                      >
                        +
                      </button>
                      <button 
                        onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-primary hover:bg-primary-container transition-all font-bold text-xl cursor-pointer"
                      >
                        -
                      </button>
                    </div>

                    <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full border border-primary-container/40 text-xs font-bold text-primary shadow-md">
                      Center: {weather.city} | Radar Zoom: x{zoomLevel}
                    </div>

                    {/* Mock pinned city indicators on the radar map */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative group cursor-pointer">
                        <span className="w-4 h-4 bg-primary border-2 border-white rounded-full flex animate-bounce"></span>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-xl text-xs font-bold shadow-md whitespace-nowrap">
                          {weather.city}: {formatTemp(weather.tempCelsius)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: SEARCH HISTORY VIEW */}
            {activeTab === "history" && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-12 max-w-[1400px] mx-auto w-full"
              >
                <div className="kawaii-card p-6 md:p-8">
                  <div className="flex justify-between items-center mb-8 border-b border-primary-container/30 pb-4">
                    <div>
                      <h2 className="bubbly-text text-2xl font-black text-primary flex items-center gap-3">
                        <History className="w-7 h-7 text-primary" />
                        <span>Recent Cozy Travels</span>
                      </h2>
                      <p className="text-xs font-bold text-on-surface-variant/70 mt-0.5">Explore cities you've visited or queried recently</p>
                    </div>
                    {searchHistory.length > 0 && (
                      <button 
                        onClick={clearAllHistory}
                        className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear All
                      </button>
                    )}
                  </div>

                  {searchHistory.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center">
                      <div className="w-20 h-20 bg-primary-container/30 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="bubbly-text text-lg font-bold text-primary">No cozy travels yet</h3>
                      <p className="text-sm text-on-surface-variant max-w-sm mt-1">Search for different cities in the header navigation to build your history log!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchHistory.map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => fetchWeatherByCity(item.city)}
                          className="p-6 bg-white border-2 border-surface-container rounded-3xl hover:border-primary-container/80 hover:translate-y-[-2px] active:scale-98 transition-all cursor-pointer flex justify-between items-center shadow-sm relative group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary-container/20 flex items-center justify-center">
                              {getWeatherIcon(item.condition, "w-8 h-8")}
                            </div>
                            <div>
                              <h4 className="bubbly-text font-black text-lg text-primary">{item.city}</h4>
                              <p className="text-xs font-bold text-on-surface-variant/80">{item.country} • {item.timestamp}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="bubbly-text text-xl font-black text-primary">
                              {formatTemp(item.tempCelsius)}
                            </span>
                            <button 
                              onClick={(e) => deleteHistoryItem(item.id, e)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-rose-200"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 4: FAVORITE CITIES */}
            {activeTab === "favorites" && (
              <motion.div
                key="favorites-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-12 max-w-[1400px] mx-auto w-full"
              >
                <div className="kawaii-card p-6 md:p-8">
                  <div className="flex justify-between items-center mb-8 border-b border-primary-container/30 pb-4">
                    <div>
                      <h2 className="bubbly-text text-2xl font-black text-primary flex items-center gap-3">
                        <Heart className="w-7 h-7 text-primary fill-primary" />
                        <span>Pinned Weather Havens</span>
                      </h2>
                      <p className="text-xs font-bold text-on-surface-variant/70 mt-0.5">Quick-jump shortcuts to your favorite cozy cities globally</p>
                    </div>
                  </div>

                  {favorites.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center">
                      <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mb-4 border-2 border-pink-100">
                        <Heart className="w-10 h-10 text-pink-400" />
                      </div>
                      <h3 className="bubbly-text text-lg font-bold text-primary">Your favorite chest is empty</h3>
                      <p className="text-sm text-on-surface-variant max-w-sm mt-1">Tap the heart button on any city dashboard to pin it here!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {favorites.map((fav, idx) => (
                        <div 
                          key={idx}
                          onClick={() => fetchWeatherByCity(fav.city)}
                          className="p-6 bg-white border border-pink-100 rounded-[2rem] hover:shadow-md hover:translate-y-[-3px] transition-all cursor-pointer flex flex-col justify-between min-h-[180px]"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="bubbly-text font-black text-xl text-primary">{fav.city}</h4>
                              <p className="text-xs font-bold text-on-surface-variant/70">{fav.country}</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(fav.city, fav.country);
                              }}
                              className="p-1 text-rose-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                              title="Unpin location"
                            >
                              <Heart className="w-5 h-5 fill-rose-500" />
                            </button>
                          </div>

                          <div className="flex items-end justify-between mt-6">
                            <span className="bubbly-text text-3xl font-black text-primary">
                              {formatTemp(fav.tempCelsius)}
                            </span>
                            <div className="flex flex-col items-end">
                              {getWeatherIcon(fav.condition, "w-8 h-8")}
                              <span className="text-[10px] font-bold text-on-surface-variant uppercase mt-1">{fav.condition}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

      {/* MOBILE BOTTOM NAVBAR */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 border-primary-container flex justify-around items-center h-20 px-4 z-40 rounded-t-3xl shadow-lg">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "dashboard" ? "text-primary scale-105" : "text-on-surface-variant/80"}`}
        >
          <Compass className="w-6 h-6" />
          <span className="text-[10px] font-black bubbly-text">HOME</span>
        </button>

        <button 
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "history" ? "text-primary scale-105" : "text-on-surface-variant/80"}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-black bubbly-text">HISTORY</span>
        </button>
        <button 
          onClick={() => setActiveTab("favorites")}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === "favorites" ? "text-primary scale-105" : "text-on-surface-variant/80"}`}
        >
          <Heart className="w-6 h-6" />
          <span className="text-[10px] font-black bubbly-text">PINNED</span>
        </button>
      </nav>

      {/* 1. PREMIUM UPGRADE MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 md:p-10 max-w-md w-full relative border-2 border-primary-container"
          >
            <button 
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary cursor-pointer p-1.5 bg-surface-container-high rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <span className="text-5xl">☕👑</span>
              <h3 className="bubbly-text text-2xl font-black text-primary mt-4">Aether Premium</h3>
              <p className="text-sm font-bold text-on-surface-variant/80 mt-2">Unlimited Gemini Cozy weather tips and ad-free offline map downloads.</p>
              
              <div className="my-6 space-y-3.5 text-left border-t border-b border-primary-container/30 py-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-semibold text-on-surface-variant">Real-time LLM-tailored styling advices</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-semibold text-on-surface-variant">Full-resolution weather radar maps</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-semibold text-on-surface-variant">Access to cozy offline widgets & wear suggestions</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    alert("Thank you for supporting AetherWeather! Subscription activated mockup.");
                    setShowPremiumModal(false);
                  }}
                  className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-full hover:brightness-105 transition-all text-sm bubbly-text cursor-pointer"
                >
                  SUBSCRIBE FOR $1.99/MO
                </button>
                <button 
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full py-3 bg-surface-container-high text-on-surface-variant font-bold rounded-full hover:bg-surface-container-high/80 transition-all text-xs bubbly-text cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. HELP & WEATHER TIPS FAQ MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto relative border-2 border-primary-container"
          >
            <button 
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary cursor-pointer p-1.5 bg-surface-container-high rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="bubbly-text text-xl font-black text-primary flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5" />
              <span>AetherWeather Help Center</span>
            </h3>

            <div className="space-y-4 text-sm font-semibold text-on-surface-variant leading-relaxed">
              <div className="p-4 bg-primary-container/20 rounded-2xl">
                <p className="text-primary font-bold">What is AetherWeather?</p>
                <p className="text-xs text-on-surface-variant mt-1 font-medium">AetherWeather is an aesthetic weather dashboard providing snuggly styling recommendations, real-time Gemini-powered localized forecasts, and detailed atmospheric metrics.</p>
              </div>

              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                <p className="text-teal-700 font-bold">How are Cozy Tips generated?</p>
                <p className="text-xs text-on-surface-variant mt-1 font-medium">When you search for any city, AetherWeather consults the local season, wind, and cloud conditions, combining them with a sweet advice engine for dynamic styling tips!</p>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <p className="text-indigo-700 font-bold">How do I switch units?</p>
                <p className="text-xs text-on-surface-variant mt-1 font-medium">Click the unit indicator button at the top-right of your navigation header to toggle between Celsius (°C) and Fahrenheit (°F) instantly.</p>
              </div>

              <button 
                onClick={() => setShowHelpModal(false)}
                className="w-full py-3 mt-4 bg-primary text-on-primary font-bold rounded-full hover:brightness-105 transition-all text-sm bubbly-text cursor-pointer"
              >
                Close Help
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full relative border-2 border-primary-container"
          >
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary cursor-pointer p-1.5 bg-surface-container-high rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="bubbly-text text-xl font-black text-primary mb-2">Aether Customizer</h3>
            <p className="text-xs text-on-surface-variant/80 font-semibold mb-6">Manage API configurations and theme defaults below.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-primary block mb-1.5">PREFERRED THEME</label>
                <div className="p-3 bg-surface-container-high text-on-surface-variant rounded-2xl text-xs font-bold flex justify-between items-center">
                  <span>Cozy Twilight Pink</span>
                  <span className="text-[10px] uppercase tracking-wider bg-primary/20 text-primary px-2.5 py-1 rounded-full">Primary</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  alert("Settings saved successfully.");
                  setShowSettingsModal(false);
                }}
                className="w-full py-3.5 mt-6 bg-primary text-on-primary font-bold rounded-full hover:brightness-105 transition-all text-sm bubbly-text cursor-pointer"
              >
                SAVE CONFIGURATION
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
