import { Bell, Mail, ShieldAlert, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const MonitoringCard = ({ plan, onUpgrade }) => {
  const isPro = plan === "PRO" || plan === "PLUS";

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Monitoring & Alerts</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Weekly Trust Report</p>
              <p className="text-xs text-muted-foreground">Email summary of score changes</p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold",
            isPro ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            {isPro ? "Active" : "PRO"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Score Drop Alerts</p>
              <p className="text-xs text-muted-foreground">Instant email if score drops 5+</p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold",
            isPro ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            {isPro ? "Active" : "PRO"}
          </span>
        </div>

        {isPro && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Alerts sent this month</span>
              <span className="font-mono">0</span>
            </div>
          </div>
        )}
      </div>

      {!isPro ? (
        <button
          onClick={onUpgrade}
          className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Lock className="w-3 h-3" />
          Unlock Monitoring — PRO
        </button>
      ) : (
        <button className="w-full mt-4 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          Preview Sample Report
        </button>
      )}
    </div>
  );
};

export default MonitoringCard;
