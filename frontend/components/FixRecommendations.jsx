import React, { useState } from 'react';
import { motion } from "framer-motion";
import { AlertTriangle, Clock, DollarSign, TrendingUp, ExternalLink, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { cn } from "../lib/utils";

const severityConfig = {
  HIGH: { icon: AlertTriangle, iconColor: "text-destructive", badge: "bg-destructive/10 text-destructive" },
  MEDIUM: { icon: AlertTriangle, iconColor: "text-warning", badge: "bg-warning/10 text-warning" },
  LOW: { icon: AlertTriangle, iconColor: "text-success", badge: "bg-success/10 text-success" },
};

// Helper to calculate impact (copied/adapted from TrustScore.jsx logic)
const getFixMetadata = (issueText, revenueBracket) => {
  const text = issueText.toLowerCase();
  
  // Revenue mapping
  const revMap = {
      '$0–$5k': 2500,
      '$5k–$20k': 12500,
      '$20k–$50k': 35000,
      '$50k–$200k': 125000,
      '$200k+': 250000
  };
  const monthlyRev = revMap[revenueBracket] || 2500; // Default conservative base

  let liftMin = 3, liftMax = 7;
  let time = '15 mins';

  if (text.includes('ssl') || text.includes('https')) { liftMin=12; liftMax=18; time='5 mins'; }
  else if (text.includes('favicon')) { liftMin=2; liftMax=5; time='2 mins'; }
  else if (text.includes('contact')) { liftMin=6; liftMax=11; time='10 mins'; }
  else if (text.includes('policy') || text.includes('refund')) { liftMin=5; liftMax=9; time='15 mins'; }
  else if (text.includes('about')) { liftMin=3; liftMax=6; time='20 mins'; }
  else if (text.includes('social')) { liftMin=2; liftMax=4; time='5 mins'; }
  else if (text.includes('broken link') || text.includes('404')) { liftMin=4; liftMax=8; time='10 mins'; }
  else if (text.includes('image') || text.includes('quality')) { liftMin=10; liftMax=14; time='30 mins'; }
  else if (text.includes('speed') || text.includes('performance')) { liftMin=8; liftMax=15; time='45 mins'; }
  else if (text.includes('review')) { liftMin=15; liftMax=22; time='15 mins'; }

  // Calculate impact
  const revMin = Math.round(monthlyRev * (liftMin / 100));
  const revMax = Math.round(monthlyRev * (liftMax / 100));

  const formatMoney = (val) => val >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${val}`;
  
  return { 
      time, 
      lift: `+${liftMin}–${liftMax}%`, 
      revenue: `${formatMoney(revMin)}–${formatMoney(revMax)}/mo` 
  };
};

const getAutoFixAction = (issueText) => {
  const text = issueText.toLowerCase();
  // Using window.shopOrigin or defaulting to empty
  const shopDomain = window.shopOrigin || ''; 
  const storeName = shopDomain.replace('.myshopify.com', '');
  const adminUrl = `https://admin.shopify.com/store/${storeName}`;

  if (text.includes('policy') || text.includes('refund') || text.includes('return')) {
      return { label: 'Edit Policies', url: `${adminUrl}/settings/legal` };
  }
  if (text.includes('page') || text.includes('about') || text.includes('contact')) {
      return { label: 'Manage Pages', url: `${adminUrl}/pages` };
  }
  if (text.includes('navigation') || text.includes('menu') || text.includes('link')) {
      return { label: 'Edit Navigation', url: `${adminUrl}/menus` };
  }
  if (text.includes('product') || text.includes('description')) {
      return { label: 'Edit Products', url: `${adminUrl}/products` };
  }
  if (text.includes('app') || text.includes('review') || text.includes('chat') || text.includes('badge')) {
      const query = text.includes('review') ? 'reviews' : text.includes('chat') ? 'chat' : 'trust badges';
      return { label: `Find ${query} App`, url: `https://apps.shopify.com/search?q=${query}` };
  }
  if (text.includes('speed') || text.includes('image')) {
       return { label: 'Optimize Theme', url: `${adminUrl}/themes` };
  }
  
  return { label: 'Learn More', url: 'https://help.shopify.com' };
};

const FixRecommendations = ({ recommendations, revenueBracket, plan }) => {
  const [expandedFix, setExpandedFix] = useState(0);

  if (!recommendations || recommendations.length === 0) return null;

  const fixes = recommendations.map(rec => {
    const meta = getFixMetadata(rec.issue, revenueBracket);
    const action = getAutoFixAction(rec.issue);
    return {
        severity: rec.priority ? rec.priority.toUpperCase() : 'MEDIUM',
        title: rec.issue,
        estimatedLift: meta.lift,
        revenueImpact: meta.revenue,
        fixTime: meta.time,
        description: rec.description || "No description available.",
        actionLabel: action.label,
        actionUrl: action.url,
        isPro: false // Assuming mostly available or derived from somewhere
    };
  });

  return (
    <div className="bg-card rounded-2xl border border-border card-elevated p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 text-destructive" />
          Fix These First
          <span className="text-xs text-muted-foreground font-normal ml-1">Highest Revenue Impact</span>
        </h3>
      </div>

      {/* Encouragement */}
      <motion.div
        className="bg-success/5 border border-success/10 rounded-xl p-3 mb-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-xs text-success font-semibold flex items-center gap-1.5">
          🚀 TrustScore improves FAST. Most stores reach 60+ within 7 days.
        </p>
      </motion.div>

      <div className="space-y-3">
        {fixes.map((fix, i) => {
          const config = severityConfig[fix.severity] || severityConfig.MEDIUM;
          const isExpanded = expandedFix === i;

          return (
            <motion.div
              key={i}
              className={cn(
                "rounded-xl overflow-hidden cursor-pointer transition-all",
                fix.severity === "HIGH" ? "priority-high" : fix.severity === "MEDIUM" ? "priority-medium" : "priority-low"
              )}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.2 }}
              onClick={() => setExpandedFix(isExpanded ? null : i)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide", config.badge)}>
                      {fix.severity}
                    </span>
                    <span className="text-sm font-semibold">{fix.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {fix.isPro && <span className="pro-badge">Pro</span>}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Est. Lift</p>
                      <p className="text-sm font-bold">{fix.estimatedLift}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Revenue</p>
                      <p className="text-sm font-bold">{fix.revenueImpact}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Fix Time</p>
                      <p className="text-sm font-bold">{fix.fixTime}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <motion.div
                    className="mt-4 pt-4 border-t border-border/30"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    <p className="text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">How to fix</p>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{fix.description}</p>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(fix.actionUrl, '_blank');
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {fix.actionLabel}
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FixRecommendations;
