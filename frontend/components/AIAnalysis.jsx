import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Palette, Store, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { trackEvent } from '../utils/analytics';

const AIAnalysis = ({ analysis, plan, aiUsageCount, onUpgrade }) => {
  const isFree = plan === 'FREE';

  if (isFree) {
    return (
      <motion.div 
        className="bg-card rounded-2xl border border-border card-elevated overflow-hidden mb-6 relative group cursor-pointer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => {
            trackEvent('upgrade_clicked', { from_plan: plan, source: 'ai_gating_card' });
            onUpgrade();
        }}
      >
        {/* Blurred Background Content */}
        <div className="p-6 filter blur-sm opacity-50 select-none pointer-events-none">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-magic/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-magic" />
                </div>
                <h3 className="text-lg font-bold">AI Conversion Intelligence</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted p-4 rounded-xl">
                    <h4 className="text-sm font-semibold mb-2">Design Score</h4>
                    <div className="text-3xl font-bold">8.5/10</div>
                </div>
                <div className="bg-muted p-4 rounded-xl">
                    <h4 className="text-sm font-semibold mb-2">Comparison</h4>
                    <div className="text-sm">Better than 85% of stores</div>
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center transition-colors group-hover:bg-background/50">
            <div className="w-12 h-12 rounded-full bg-magic/10 flex items-center justify-center mb-4 shadow-lg ring-4 ring-background">
                <Lock className="w-6 h-6 text-magic" />
            </div>
            <h3 className="text-xl font-bold mb-2">Unlock AI Intelligence</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                See exactly why visitors don't trust your store. Discover hidden friction points and get revenue-weighted fixes.
            </p>
            <button className="bg-magic text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-magic/20 hover:shadow-lg hover:shadow-magic/30 transition-all transform group-hover:scale-105">
                Upgrade to Unlock
            </button>
        </div>
      </motion.div>
    );
  }

  // Helper to parse if analysis is string or object
  // Sometimes it comes as a string JSON from backend if not parsed correctly
  let data = analysis;
  
  if (!data) {
    // Fallback for Pro users if AI failed or data missing
    return (
        <div className="bg-card rounded-2xl border border-border card-elevated p-6 mb-6">
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-magic/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-magic" />
                </div>
                <h3 className="text-lg font-bold">AI Qualitative Analysis</h3>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-border text-center text-muted-foreground text-sm">
                AI analysis is pending or unavailable for this scan. Try running the audit again.
            </div>
        </div>
    );
  }

  if (typeof analysis === 'string') {
      try {
          data = JSON.parse(analysis);
      } catch (e) {
          console.error("Failed to parse AI analysis", e);
          // If plain string text
          data = { assessment: analysis };
      }
  }

  return (
    <div className="bg-card rounded-2xl border border-border card-elevated p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-magic/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-magic" />
            </div>
            <div>
                <h3 className="text-lg font-bold">AI Qualitative Analysis</h3>
                <p className="text-[10px] text-muted-foreground">
                    {aiUsageCount}/10 analyses used this month
                </p>
            </div>
        </div>
        <div className="px-2 py-1 rounded-md bg-magic/10 text-magic text-xs font-bold border border-magic/20">
            AI Powered
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div 
            className="bg-muted/30 rounded-xl p-4 border border-border"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Design Professionalism</span>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-foreground">{data?.designScore || '-'}<span className="text-lg text-muted-foreground font-medium">/10</span></span>
            </div>
        </motion.div>

        <motion.div 
            className="bg-muted/30 rounded-xl p-4 border border-border"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
        >
            <div className="flex items-center gap-2 mb-2">
                <Store className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Niche Comparison</span>
            </div>
            <p className="text-sm font-medium leading-tight">
                {data?.nicheComparison || 'Pending analysis...'}
            </p>
        </motion.div>
      </div>

      {/* Assessment Text */}
      <div className="mb-6">
        <h4 className="text-sm font-bold mb-2">Assessment</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
            {data?.assessment || 'Analysis will appear here after your next audit.'}
        </p>
      </div>

      {/* Priority Fixes */}
      {data?.priorityFixes && data.priorityFixes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Top Priority Fixes
            </h4>
            <div className="space-y-2">
                {data.priorityFixes.map((fix, i) => (
                    <motion.div 
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-colors"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                    >
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                            {i + 1}
                        </div>
                        <span className="text-sm text-foreground/90">{fix}</span>
                    </motion.div>
                ))}
            </div>
          </div>
      )}
    </div>
  );
};

export default AIAnalysis;
