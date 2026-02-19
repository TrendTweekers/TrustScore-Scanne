import { Monitor, Smartphone, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Screenshots = ({ screenshots, plan = "FREE", onUpgrade }) => {
  const [activeView, setActiveView] = useState("desktop");
  const isPro = plan === "PRO" || plan === "PLUS";

  const hasScreenshots = screenshots && (screenshots.desktop || screenshots.mobile);

  if (!hasScreenshots) return null;

  if (!isPro) {
    return (
      <div className="bg-card rounded-xl border border-border card-elevated p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Store Screenshots</h3>
        </div>
        <div className="relative">
          <div className="blur-md pointer-events-none select-none opacity-40 h-48 bg-muted rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1">Store Screenshots</p>
              <p className="text-xs text-muted-foreground mb-3">See what your customers see</p>
              <button
                onClick={onUpgrade}
                className="px-4 py-1.5 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-90 transition-opacity"
              >
                Upgrade to PRO
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">Store Screenshots</h3>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setActiveView("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeView === "desktop"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="w-3 h-3" /> Desktop
          </button>
          <button
            onClick={() => setActiveView("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeView === "mobile"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="w-3 h-3" /> Mobile
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
        {activeView === "desktop" && screenshots.desktop && (
          <img
            src={`data:image/png;base64,${screenshots.desktop}`}
            alt="Desktop view of your store"
            className="w-full h-auto"
          />
        )}
        {activeView === "mobile" && screenshots.mobile && (
          <div className="flex justify-center py-4">
            <img
              src={`data:image/png;base64,${screenshots.mobile}`}
              alt="Mobile view of your store"
              className="max-w-[375px] h-auto rounded-lg border border-border"
            />
          </div>
        )}
        {activeView === "desktop" && !screenshots.desktop && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Desktop screenshot not available for this scan.
          </div>
        )}
        {activeView === "mobile" && !screenshots.mobile && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Mobile screenshot not available for this scan.
          </div>
        )}
      </div>
    </div>
  );
};

export default Screenshots;
