import { motion } from "framer-motion";
import { Sparkles, Palette, Users, AlertCircle, CheckCircle2, Lock, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const AIAnalysis = ({ plan, aiUsageCount, aiUsageLimit, analysis, screenshots, onUpgrade }) => {
  const [activeScreenshotView, setActiveScreenshotView] = useState("desktop");
  const isPro = plan === "PRO" || plan === "PLUS";

  if (!isPro) {
    return (
      <div className="bg-card rounded-xl border border-border card-elevated p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">AI Qualitative Analysis</h3>
        </div>

        {/* Store screenshot proof (visible but blurred for FREE) */}
        {screenshots && (screenshots.desktop || screenshots.mobile) && (
          <div className="mb-4 relative rounded-lg border border-border overflow-hidden bg-muted/30">
            <div className="blur-md pointer-events-none select-none h-32 bg-muted/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Blurred analysis preview */}
        <div className="relative">
          <div className="blur-sm pointer-events-none select-none opacity-60">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Design Score</p>
                <span className="text-2xl font-bold font-mono">?/10</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Niche Comparison</p>
                <p className="text-sm">Upgrade to see how you compare...</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-4/5" />
              <div className="h-3 bg-muted rounded w-3/5" />
            </div>
          </div>

          {/* Upsell overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-1.5">Unlock AI-Powered Insights</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                Get specific, actionable trust recommendations from AI analysis of your store.
              </p>
              <button
                onClick={onUpgrade}
                className="px-5 py-2 rounded-lg bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Upgrade to PRO — $19/mo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parse AI analysis - handles string, object, or null
  const parsed = typeof analysis === 'string'
    ? { assessment: analysis }
    : analysis || {};

  const designScore = parsed.designScore || null;
  const nicheComparison = parsed.nicheComparison || null;
  const assessment = parsed.assessment || parsed.summary || null;
  const priorityFixes = parsed.priorityFixes || parsed.topFixes || [];
  const hasError = parsed.error;

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">AI Qualitative Analysis</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {aiUsageCount}/{aiUsageLimit} analyses used
        </span>
      </div>

      {/* Store screenshots - shows what AI actually scanned */}
      {screenshots && (screenshots.desktop || screenshots.mobile) && (
        <div className="mb-5 rounded-lg border border-border overflow-hidden bg-muted/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground">Scanned Pages</span>
            <div className="flex items-center gap-1 bg-muted rounded p-0.5">
              <button
                onClick={() => setActiveScreenshotView("desktop")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all",
                  activeScreenshotView === "desktop"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="w-3 h-3" /> Desktop
              </button>
              <button
                onClick={() => setActiveScreenshotView("mobile")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all",
                  activeScreenshotView === "mobile"
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Smartphone className="w-3 h-3" /> Mobile
              </button>
            </div>
          </div>
          <div className="relative">
            {activeScreenshotView === "desktop" && screenshots.desktop && (
              <img
                src={`data:image/png;base64,${screenshots.desktop}`}
                alt="Desktop view of scanned store"
                className="w-full h-auto max-h-64 object-cover"
              />
            )}
            {activeScreenshotView === "mobile" && screenshots.mobile && (
              <div className="flex justify-center py-4">
                <img
                  src={`data:image/png;base64,${screenshots.mobile}`}
                  alt="Mobile view of scanned store"
                  className="max-w-[280px] h-auto rounded border border-border"
                />
              </div>
            )}
            {activeScreenshotView === "desktop" && !screenshots.desktop && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Desktop screenshot not available
              </div>
            )}
            {activeScreenshotView === "mobile" && !screenshots.mobile && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Mobile screenshot not available
              </div>
            )}
          </div>
        </div>
      )}

      {hasError ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/10">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive mb-1">AI analysis unavailable</p>
            <p className="text-xs text-muted-foreground">
              The analysis could not be completed for this scan. Try running a new scan.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <motion.div
              className="bg-muted/50 rounded-lg p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Design Professionalism</span>
              </div>
              {designScore ? (
                <span className="text-2xl font-bold font-mono">
                  {designScore}<span className="text-sm text-muted-foreground font-normal">/10</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Included in next scan</span>
              )}
            </motion.div>
            <motion.div
              className="bg-muted/50 rounded-lg p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Niche Comparison</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {nicheComparison || "Run a scan to see how you compare to top stores in your niche."}
              </p>
            </motion.div>
          </div>

          {/* Assessment */}
          {assessment && (
            <motion.div
              className="mb-5 p-4 bg-muted/30 rounded-lg border border-border/50"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h4 className="text-sm font-semibold mb-2">Assessment</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{assessment}</p>
            </motion.div>
          )}

          {/* Top Priority Fixes */}
          {priorityFixes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h4 className="text-sm font-semibold mb-3">Top Priority Fixes</h4>
              <div className="space-y-2.5">
                {priorityFixes.slice(0, 5).map((fix, i) => {
                  const text = typeof fix === 'string' ? fix : fix.title || fix.text || '';
                  return (
                    <div key={i} className="flex items-start gap-3 pl-4 border-l-2 border-primary/30 py-1">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Fallback when analysis is a plain string */}
          {!assessment && !priorityFixes.length && typeof analysis === 'string' && analysis && (
            <motion.div
              className="p-4 bg-muted/30 rounded-lg"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{analysis}</p>
            </motion.div>
          )}

          {/* Empty state */}
          {!assessment && !priorityFixes.length && !analysis && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                AI analysis will appear here after your next scan.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIAnalysis;
