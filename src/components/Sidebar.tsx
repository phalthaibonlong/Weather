import { LayoutDashboard, Map, History, Heart, HelpCircle, LogOut, CloudSun } from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenPremium: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenPremium,
  onOpenHelp,
  onLogout,
}: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "history", label: "History", icon: History },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <aside id="sidebar-container" className="hidden md:flex flex-col h-screen w-64 bg-surface-container-low border-r-2 border-primary-container p-6 z-30 shadow-sm shadow-primary/10">
      {/* Brand Logo */}
      <div id="brand-logo" className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-primary">
          <CloudSun className="w-7 h-7" />
        </div>
        <div>
          <h1 className="bubbly-text text-primary font-black text-xl tracking-tight leading-none">
            AetherWeather
          </h1>
          <p className="text-on-surface-variant text-xs font-semibold mt-0.5">
            Stay Cozy!
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav id="sidebar-nav" className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-full font-bold transition-all relative overflow-hidden ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container shadow-sm"
                  : "text-on-surface-variant hover:bg-white/60 hover:text-secondary"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-secondary-container -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-5 h-5 ${isActive ? "text-secondary" : ""}`} />
              <span className="bubbly-text text-base">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div id="sidebar-footer" className="mt-auto space-y-4">
        <button
          id="upgrade-premium-btn"
          onClick={onOpenPremium}
          className="w-full py-4 bg-primary text-on-primary rounded-full font-bold bubbly-text hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-md shadow-primary/20"
        >
          Upgrade to Premium
        </button>

        <div id="utility-links" className="pt-4 border-t border-primary-container flex flex-col gap-2">
          <button
            id="help-link-btn"
            onClick={onOpenHelp}
            className="flex items-center gap-3 text-on-surface-variant px-6 py-1.5 hover:text-secondary transition-all text-sm font-semibold text-left"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help</span>
          </button>
          <button
            id="logout-link-btn"
            onClick={onLogout}
            className="flex items-center gap-3 text-on-surface-variant px-6 py-1.5 hover:text-error transition-all text-sm font-semibold text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
