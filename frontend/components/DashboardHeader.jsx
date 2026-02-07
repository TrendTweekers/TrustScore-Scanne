import React from "react";
import { Shield, Search, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "competitors", label: "Competitive Intelligence" },
  { id: "help", label: "Help & FAQ" },
];

const DashboardHeader = ({ activeTab, onTabChange, onRunScan, isScanning }) => {
  return (
    <div className="space-y-0 mb-6">
      {/* Top banner */}
      <div className="gradient-header gradient-header-glow rounded-2xl p-5 flex items-center justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/10">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-primary-foreground tracking-tight">TrustScore</h1>
            <p className="text-xs text-primary-foreground/60 font-medium">Shopify Trust Optimization</p>
          </div>
        </div>
        <button
          onClick={onRunScan}
          disabled={isScanning}
          className={cn(
            "relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            "bg-primary-foreground text-foreground",
            "shadow-lg shadow-primary/20",
            "hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]",
            "active:scale-[0.98]",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          {isScanning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {isScanning ? "Scanning..." : "Run Trust Audit"}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 pt-3 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm border border-border font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardHeader;
