import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Search, Loader2, Lock, Clock, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

const CompetitorView = ({ yourScore, plan, auditsUsed, auditsLimit, onUpgrade }) => {
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [history, setHistory] = useState([]);
  const authenticatedFetch = useAuthenticatedFetch();
  const isPro = plan === "PRO" || plan === "PLUS";

  // Load competitor history on mount
  useEffect(() => {
    if (isPro) {
      loadHistory();
    }
  }, [isPro]);

  const loadHistory = async () => {
    try {
      const response = await authenticatedFetch('/api/competitors');
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load competitor history:', err);
    }
  };

  const handleScan = async () => {
    if (!competitorUrl.trim() || !isPro) return;

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const response = await authenticatedFetch('/api/scanner/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: competitorUrl.trim() }),
      });

      const data = await response.json();
      setScanResult(data);
      await loadHistory();
    } catch (err) {
      console.error('Competitor scan failed:', err);
      setScanError(err.message || 'Scan failed. The site may block automated scanning.');
    } finally {
      setIsScanning(false);
    }
  };

  const competitorScore = scanResult?.score || 0;
  const gap = competitorScore - yourScore;

  // Build category comparison from scan result breakdown
  const buildCategories = () => {
    if (!scanResult?.result) return [];
    const breakdown = scanResult.result.breakdown || scanResult.result.homepage?.breakdown || [];
    return breakdown.map((item) => ({
      name: item.category || item.label || "Unknown",
      you: 0, // We don't have your breakdown here, show competitor only
      them: item.points || 0,
      max: item.maxPoints || 10,
    }));
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* PRO gate overlay for FREE users */}
      {!isPro && (
        <div className="bg-card rounded-xl border border-border card-elevated p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Unlock Competitor Intelligence</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">
            See exactly how your trust signals compare to any competitor. Find the gaps costing you sales
            and get a prioritized action plan.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onUpgrade}
              className="px-6 py-2.5 rounded-lg bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Upgrade to PRO — $19/mo
            </button>
            <p className="text-xs text-muted-foreground">
              PRO: 5 competitor audits/mo | PLUS: 20 competitor audits/mo
            </p>
          </div>
        </div>
      )}

      {/* Input section (PRO users) */}
      {isPro && (
        <>
          <div className="bg-card rounded-xl border border-border card-elevated p-6">
            <h3 className="text-base font-semibold mb-1">Trust Gap Analysis</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Compare your trust score against any competitor.
              <span className="font-mono ml-1">{auditsUsed}/{auditsLimit} audits used</span>
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="competitor-store.com"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                disabled={isScanning}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
              />
              <button
                onClick={handleScan}
                disabled={isScanning || !competitorUrl.trim()}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  "bg-primary text-primary-foreground hover:opacity-90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {isScanning ? "Scanning..." : "Run Competitor Audit"}
              </button>
            </div>
          </div>

          {/* Scan error */}
          {scanError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-destructive font-medium">{scanError}</span>
              <button onClick={() => setScanError(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                Dismiss
              </button>
            </div>
          )}

          {/* Loading state */}
          {isScanning && (
            <div className="bg-card rounded-xl border border-border card-elevated p-8 text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-base font-semibold mb-1">Analyzing competitor...</h3>
              <p className="text-sm text-muted-foreground">
                Scanning {competitorUrl} for trust signals. This takes 30-60 seconds.
              </p>
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {scanResult && !isScanning && (
              <motion.div
                className="space-y-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Gap summary */}
                <div className={cn(
                  "rounded-xl p-6 text-center border",
                  gap > 0
                    ? "bg-destructive/5 border-destructive/10"
                    : "bg-success/5 border-success/10"
                )}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {gap > 0 ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        <span className="text-lg font-bold text-destructive">TRUST GAP: {gap} POINTS BEHIND</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-success">YOU LEAD BY {Math.abs(gap)} POINTS</span>
                    )}
                  </div>
                  {gap > 0 && (
                    <p className="text-sm text-muted-foreground">
                      You may be losing ~{Math.round(gap * 0.25)}% market share due to lower trust signals.
                    </p>
                  )}
                </div>

                {/* Side by side scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-xl border border-border card-elevated p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Your Store</p>
                    <p className="text-4xl font-extrabold font-mono">{yourScore}<span className="text-lg text-muted-foreground font-normal">/100</span></p>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", yourScore >= competitorScore ? "bg-success" : "bg-destructive")}
                        style={{ width: `${yourScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border border-border card-elevated p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Competitor</p>
                    <p className="text-4xl font-extrabold font-mono">{competitorScore}<span className="text-lg text-muted-foreground font-normal">/100</span></p>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", competitorScore >= yourScore ? "bg-success" : "bg-muted-foreground/30")}
                        style={{ width: `${competitorScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                {buildCategories().length > 0 && (
                  <div className="bg-card rounded-xl border border-border card-elevated p-6">
                    <h3 className="text-base font-semibold mb-5">Competitor Breakdown</h3>
                    <div className="space-y-4">
                      {buildCategories().map((cat, i) => (
                        <motion.div
                          key={cat.name}
                          className="bg-muted/30 rounded-lg p-4"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">{cat.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">{cat.them}/{cat.max}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${(cat.them / cat.max) * 100}%` }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audit history */}
          {history.length > 0 && !isScanning && (
            <div className="bg-card rounded-xl border border-border card-elevated p-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Audit History
              </h3>
              <div className="space-y-1">
                {history.slice(0, 10).map((scan, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{scan.competitor_url || scan.url}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                      <span className="text-sm font-mono font-semibold">{scan.score}/100</span>
                      <button
                        onClick={() => {
                          setCompetitorUrl(scan.competitor_url || scan.url || '');
                          if (scan.result || scan.score) {
                            setScanResult({ score: scan.score, result: typeof scan.result === 'string' ? JSON.parse(scan.result) : scan.result });
                          }
                        }}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state when no scans yet and no active scan */}
          {!scanResult && !isScanning && history.length === 0 && (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Enter a competitor URL above to see how your trust signals compare.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompetitorView;
