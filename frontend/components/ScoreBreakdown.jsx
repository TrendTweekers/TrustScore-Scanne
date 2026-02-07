import React from 'react';
import { motion } from "framer-motion";
import { Check, X, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

const ScoreBreakdown = ({ breakdown }) => {
  // If no breakdown data, don't render or render placeholder
  if (!breakdown) return null;

  // Adapt input breakdown to array if it's an object
  // Assuming breakdown might be { categoryName: { score, maxScore, passed } }
  // Or it might already be an array.
  // Let's assume standard format from scanner:
  // [{ name: "Trust Badges", score: 0, maxScore: 25, passed: false, category: "Visual Trust" }, ...]
  
  // If it comes as an object (common in some scanner backends), convert it:
  let items = [];
  if (Array.isArray(breakdown)) {
    items = breakdown;
  } else if (typeof breakdown === 'object') {
    items = Object.keys(breakdown).map(key => ({
      name: key,
      ...breakdown[key]
    }));
  }

  // Calculate totals
  const totalScore = items.reduce((sum, item) => sum + (item.score || 0), 0);
  const totalMax = items.reduce((sum, item) => sum + (item.maxScore || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-border card-elevated p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold">Score Breakdown</h3>
        <span className="text-xs text-muted-foreground font-mono">{totalScore}/{totalMax} total</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => {
          const score = item.score || 0;
          const maxScore = item.maxScore || 10; // Default max if missing
          const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
          const passed = item.passed ?? (pct > 50); // Fallback passed logic

          return (
            <motion.div
              key={item.name || i}
              className="flex items-center justify-between py-3.5 px-3 -mx-3 rounded-xl hover:bg-muted/30 transition-colors group cursor-default"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 + 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                  passed ? "bg-success/10" : "bg-destructive/10"
                )}>
                  {passed ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-destructive" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{item.category || "General"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      pct >= 100 ? "bg-success" :
                      pct <= 0 ? "bg-destructive/30" : "bg-warning"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 + 0.4 }}
                  />
                </div>
                <span className="text-sm font-mono font-semibold text-muted-foreground w-16 text-right">
                  {score}/{maxScore}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreBreakdown;
