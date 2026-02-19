import { Search, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "competitor", label: "Competitive Trust Intelligence" },
  { id: "help", label: "Help & FAQ" },
];


const DashboardHeader = ({ activeTab, onTabChange, onRunScan, isScanning  }) => {
  return (
    <div className="space-y-0">
      {/* Top banner */}
      <div className="gradient-header rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/20">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground tracking-tight">
              Trust<span className="font-extrabold">Score</span>
            </h1>
            <p className="text-xs text-primary-foreground/70">Shopify Trust Optimization</p>
          </div>
        </div>
        <button
          onClick={onRunScan}
          disabled={isScanning}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all",
            "bg-primary-foreground text-foreground shadow-lg",
            "hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
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
      <div className="flex items-center gap-1 pt-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
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
