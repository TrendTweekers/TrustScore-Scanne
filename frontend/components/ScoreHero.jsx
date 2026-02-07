import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Clock, Crown, DollarSign } from "lucide-react";
import { cn } from "../lib/utils";

const ScoreHero = ({ score, maxScore, lastScanTime, trend, plan, estimatedConversionLoss }) => {
  const percentage = (score / maxScore) * 100;
  const [monthlyRevenue, setMonthlyRevenue] = useState("5000");

  const revenueNum = parseFloat(monthlyRevenue) || 0;
  const lostLow = Math.round(revenueNum * (estimatedConversionLoss * 0.6) / 100);
  const lostHigh = Math.round(revenueNum * (estimatedConversionLoss * 1.2) / 100);

  const riskLevel = useMemo(() => {
    if (percentage < 40) return { label: "At Risk", color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" };
    if (percentage < 60) return { label: "Needs Work", color: "bg-warning/10 text-warning border-warning/20", dot: "bg-warning" };
    if (percentage < 80) return { label: "Good", color: "bg-success/10 text-success border-success/20", dot: "bg-success" };
    return { label: "Excellent", color: "bg-score-excellent/10 text-score-excellent border-score-excellent/20", dot: "bg-score-excellent" };
  }, [percentage]);

  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const gradientId = "scoreGradient";

  return (
    <div className="bg-card rounded-2xl border border-border card-elevated overflow-hidden mb-6">
      {/* Vibrant header strip */}
      <div className="gradient-header gradient-header-glow px-6 py-4">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary-foreground tracking-tight">Your TrustScore</h2>
            <p className="text-xs text-primary-foreground/70">How trustworthy your store appears to visitors</p>
          </div>
          <div className="flex items-center gap-2">
            {plan !== "FREE" && (
              <span className="pro-badge flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {plan}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Score + Gauge */}
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Donut */}
          <motion.div
            className="relative flex-shrink-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <svg width="200" height="200" viewBox="0 0 200 200" className={percentage < 40 ? "score-ring" : "score-ring-good"}>
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  {percentage < 40 ? (
                    <>
                      <stop offset="0%" stopColor="hsl(0, 72%, 51%)" />
                      <stop offset="100%" stopColor="hsl(20, 80%, 50%)" />
                    </>
                  ) : percentage < 60 ? (
                    <>
                      <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
                      <stop offset="100%" stopColor="hsl(45, 93%, 47%)" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="hsl(160, 100%, 36%)" />
                      <stop offset="100%" stopColor="hsl(152, 76%, 36%)" />
                    </>
                  )}
                </linearGradient>
              </defs>
              <circle
                cx="100" cy="100" r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
                opacity="0.5"
              />
              <motion.circle
                cx="100" cy="100" r={radius}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="12"
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
                className="text-5xl font-black font-mono tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score}
              </motion.span>
              <span className="text-sm text-muted-foreground font-medium">/ {maxScore}</span>
              <span className={cn("mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5", riskLevel.color)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", riskLevel.dot)} />
                {riskLevel.label}
              </span>
            </div>
          </motion.div>

          {/* Right side: Revenue calculator + stats */}
          <div className="flex-1 w-full space-y-4">
            {/* Revenue calculator */}
            <motion.div
              className="bg-destructive/5 border border-destructive/10 rounded-xl p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Estimated Lost Sales</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Monthly revenue:</label>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="5000"
                  />
                </div>
              </div>
              {revenueNum > 0 && (
                <motion.div
                  className="flex items-baseline gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="text-xs text-muted-foreground">You're losing approximately</span>
                  <span className="text-lg font-bold font-mono text-destructive">
                    ${lostLow.toLocaleString()}–${lostHigh.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </motion.div>
              )}
            </motion.div>

            {/* Mini stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div
                className="bg-muted/40 rounded-xl p-3 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-[10px] text-muted-foreground mb-0.5">Last Scan</p>
                <p className="text-xs font-semibold">{lastScanTime}</p>
              </motion.div>
              <motion.div
                className="bg-muted/40 rounded-xl p-3 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <div className="w-4 h-4 mx-auto mb-1.5 flex items-center justify-center">
                  {trend > 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : trend < 0 ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Trend</p>
                <p className={cn(
                  "text-xs font-bold font-mono",
                  trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {trend > 0 ? `+${trend}` : trend === 0 ? "--" : trend}
                </p>
              </motion.div>
              <motion.div
                className="bg-muted/40 rounded-xl p-3 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <TrendingUp className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-[10px] text-muted-foreground mb-0.5">Potential Lift</p>
                <p className="text-xs font-bold font-mono text-success">+{estimatedConversionLoss}%</p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Contextual framing */}
        <motion.div
          className="mt-5 px-4 py-3 bg-primary/5 border border-primary/10 rounded-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 Most new stores score <strong className="text-foreground">15–35</strong> on their first scan. Scores improve fast after fixing top issues — most reach 60+ within a week.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ScoreHero;
