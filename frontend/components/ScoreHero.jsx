import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Clock, BarChart3, Crown } from "lucide-react";
import { cn } from "@/lib/utils";


const ScoreHero = ({ score, maxScore, lastScanTime, trend, plan, estimatedConversionLoss  }) => {
  const percentage = (score / maxScore) * 100;

  const scoreColor = useMemo(() => {
    if (percentage < 40) return "score-critical";
    if (percentage < 60) return "score-warning";
    if (percentage < 80) return "score-good";
    return "score-excellent";
  }, [percentage]);

  const riskLevel = useMemo(() => {
    if (percentage < 40) return { label: "At Risk", color: "bg-destructive/10 text-destructive border-destructive/20" };
    if (percentage < 60) return { label: "Needs Work", color: "bg-warning/10 text-warning border-warning/20" };
    if (percentage < 80) return { label: "Good", color: "bg-success/10 text-success border-success/20" };
    return { label: "Excellent", color: "bg-success/10 text-success border-success/20" };
  }, [percentage]);

  // SVG donut chart
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const strokeColor = percentage < 40
    ? "hsl(var(--score-critical))"
    : percentage < 60
    ? "hsl(var(--score-warning))"
    : "hsl(var(--score-good))";

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      {/* Top status bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold">{score}/{maxScore}</span>
          <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", riskLevel.color)}>
            {riskLevel.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {estimatedConversionLoss > 0 && (
            <div className="flex items-center gap-1.5 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Losing ~{estimatedConversionLoss}% conversions</span>
            </div>
          )}
        </div>
      </div>

      {/* Score circle & stats */}
      <div className="flex items-center gap-10">
        {/* Donut */}
        <motion.div
          className="relative flex-shrink-0 animate-score-in"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg width="200" height="200" viewBox="0 0 200 200" className={percentage < 40 ? "score-ring" : "score-ring-good"}>
            {/* Background ring */}
            <circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="14"
            />
            {/* Score ring */}
            <motion.circle
              cx="100" cy="100" r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-4xl font-extrabold font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score}
            </motion.span>
            <span className="text-sm text-muted-foreground">/ {maxScore}</span>
          </div>
        </motion.div>

        {/* Meta stats */}
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Last Scan</p>
            <p className="text-sm font-semibold">{lastScanTime}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <BarChart3 className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Trend</p>
            <div className="flex items-center justify-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : trend < 0 ? (
                <TrendingDown className="w-4 h-4 text-destructive" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={cn(
                "text-sm font-semibold",
                trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {trend > 0 ? `+${trend}` : trend === 0 ? "--" : trend}
              </span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Crown className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Plan</p>
            <span className={cn(
              "inline-block px-3 py-0.5 rounded-full text-xs font-bold",
              plan === "PLUS" ? "bg-primary text-primary-foreground" :
              plan === "PRO" ? "bg-foreground text-background" :
              "bg-muted text-muted-foreground"
            )}>
              {plan}
            </span>
          </div>
        </div>
      </div>

      {/* Framing text */}
      <motion.div
        className="mt-5 p-3 bg-primary/5 border border-primary/10 rounded-lg"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          💡 Most new stores score 15–35 on their first scan. Scores improve fast after fixing top issues.
        </p>
      </motion.div>
    </div>
  );
};

export default ScoreHero;
