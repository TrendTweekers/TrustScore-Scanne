import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, ShieldCheck, ArrowRight, Lock, Trophy, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { trackEvent } from '../utils/analytics';
import { cn } from '../lib/utils';

export function CompetitorComparison({ userPlan, myLatestScore, shopData, myLatestScan }) {
  const fetch = useAuthenticatedFetch();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);

  const limit = userPlan === 'PRO' ? 5 : 20; // 5/mo for Pro (example), 1 for Free usually handled by backend or upgrade modal

  const loadScans = useCallback(async () => {
    try {
      const res = await fetch('/api/competitors');
      const data = await res.json();
      setScans(data);
      if (data.length > 0 && !selectedScan) {
          setSelectedScan(data[0]);
      }
    } catch (err) {
      console.error("Failed to load competitor scans", err);
    }
  }, [fetch, selectedScan]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const handleScan = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setSelectedScan(null);

    // Validate URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
        const urlObj = new URL(cleanUrl);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Block list
        const blockedDomains = ['shopify.com', 'www.shopify.com', 'help.shopify.com', 'partners.shopify.com', 'admin.shopify.com', 'apps.shopify.com', 'community.shopify.com'];
        if (blockedDomains.includes(hostname)) {
             throw new Error("Please enter a real Shopify storefront domain (e.g. brand.com). Avoid shopify.com marketing or admin sites.");
        }
        
        // Self-check
        if (shopData && (shopData.domain === hostname || shopData.myshopify_domain === hostname)) {
             throw new Error("You are scanning your own store. Use the Dashboard to audit your store.");
        }

        trackEvent('competitor_scan_started', { url: cleanUrl });

        const res = await fetch('/api/scanner/external', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cleanUrl })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            trackEvent('competitor_scan_failed', { reason: data.error || 'api_error', url: cleanUrl });
            throw new Error(data.message || data.error || 'Scan failed');
        }

        // Add to list and select it
        setScans([data, ...scans]);
        setSelectedScan(data);
        setUrl('');
        
        const gap = data.score - myLatestScore;
        trackEvent('competitor_scan_completed', { competitor_domain: hostname, gap_points: gap });

    } catch (err) {
        setError(err.message);
        trackEvent('competitor_scan_failed', { reason: 'error', message: err.message });
    } finally {
        setLoading(false);
    }
  };

  // Helper to get breakdown item for comparison
  const getMyBreakdownItem = (category) => {
      if (!myLatestScan || !myLatestScan.result || !myLatestScan.result.breakdown) return null;
      // Handle both array and object formats for breakdown
      const breakdown = myLatestScan.result.breakdown;
      if (Array.isArray(breakdown)) {
          return breakdown.find(b => b.category === category || b.name === category);
      }
      return breakdown[category];
  };

  if (userPlan === 'FREE') {
      return (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border card-elevated p-6">
                <div className="mb-4">
                    <h2 className="text-lg font-bold">Trust Gap Analysis</h2>
                    <p className="text-sm text-muted-foreground">Compare your trust score against any competitor to see exactly where you're losing customers.</p>
                </div>
                
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <input 
                            disabled
                            placeholder="https://competitor-store.com" 
                            className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none cursor-not-allowed"
                        />
                    </div>
                    <button disabled className="bg-primary/50 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold cursor-not-allowed">
                        Run Audit
                    </button>
                </div>
            </div>

            <div className="relative">
                <div className="blur-sm select-none opacity-50 pointer-events-none">
                    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
                            <h3 className="text-xl font-bold text-destructive">CRITICAL GAP: 24 POINTS</h3>
                            <p className="text-sm text-destructive/80">Your store: 53 | Competitor: 77</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="text-center">
                                <p className="text-sm font-semibold mb-2">Your Store</p>
                                <div className="text-4xl font-bold">53</div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold mb-2">Competitor</p>
                                <div className="text-4xl font-bold text-success">77</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-6 max-w-md text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Unlock Competitive Intelligence</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            See exactly why competitors are beating you. Get a full breakdown of their trust score and AI-detected winning strategies.
                        </p>
                        <button 
                            onClick={() => window.open('/?billing=upgrade', '_top')}
                            className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                        >
                            Upgrade to Pro to Unlock
                        </button>
                    </div>
                </div>
            </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
        {/* Input Card */}
        <div className="bg-card rounded-2xl border border-border card-elevated p-6">
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Trust Gap Analysis
                    </h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {scans.length}/{limit} audits used
                    </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    Compare your trust score against any competitor.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full relative">
                    <label className="text-xs font-semibold ml-1 mb-1.5 block">Competitor URL</label>
                    <div className="relative">
                        <input 
                            value={url} 
                            onChange={(e) => setUrl(e.target.value)} 
                            placeholder="https://competitor-store.com" 
                            className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            disabled={loading || scans.length >= limit}
                            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                        />
                    </div>
                </div>
                <button 
                    onClick={handleScan} 
                    disabled={!url || loading || scans.length >= limit}
                    className={cn(
                        "bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 min-w-[140px] justify-center h-[42px]",
                        (!url || loading || scans.length >= limit) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>Run Audit <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
            </div>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2"
                >
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </motion.div>
            )}
        </div>

        {/* Empty State */}
        {!selectedScan && !loading && scans.length === 0 && (
            <div className="text-center py-12 opacity-60">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-muted-foreground">No Competitor Audits Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                    Enter a competitor's URL above to see how their TrustScore compares to yours.
                    Find out exactly why they might be converting better.
                </p>
            </div>
        )}

        {/* Results */}
        <AnimatePresence>
            {selectedScan && !loading && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {(() => {
                        const gap = selectedScan.score - myLatestScore;
                        const isLosing = gap > 0;
                        const gapValue = Math.abs(gap);
                        
                        return (
                            <div className="bg-card rounded-2xl border border-border card-elevated p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold">Comparison Result</h3>
                                    <span className="text-xs text-muted-foreground font-mono">{new URL(selectedScan.url).hostname}</span>
                                </div>

                                {/* Score Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {/* My Store */}
                                    <div className="bg-muted/30 rounded-2xl p-5 text-center border border-border">
                                        <p className="text-sm font-semibold text-muted-foreground mb-2">Your Store</p>
                                        <div className="text-4xl font-black font-mono">{myLatestScore}</div>
                                        <div className="mt-2 text-xs text-muted-foreground">Current Score</div>
                                    </div>

                                    {/* VS Badge */}
                                    <div className="flex items-center justify-center">
                                        <div className="bg-muted rounded-full px-4 py-1 text-xs font-bold text-muted-foreground">VS</div>
                                    </div>

                                    {/* Competitor */}
                                    <div className="bg-muted/30 rounded-2xl p-5 text-center border border-border">
                                        <p className="text-sm font-semibold text-muted-foreground mb-2">Competitor</p>
                                        <div className={cn("text-4xl font-black font-mono", isLosing ? "text-success" : "text-destructive")}>
                                            {selectedScan.score}
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground">Their Score</div>
                                    </div>
                                </div>

                                {/* Gap Alert */}
                                <div className={cn(
                                    "rounded-xl p-5 mb-8 border flex items-center gap-4",
                                    isLosing ? "bg-destructive/10 border-destructive/20" : "bg-success/10 border-success/20"
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                        isLosing ? "bg-destructive/20" : "bg-success/20"
                                    )}>
                                        {isLosing ? <ShieldAlert className="w-5 h-5 text-destructive" /> : <ShieldCheck className="w-5 h-5 text-success" />}
                                    </div>
                                    <div>
                                        <h4 className={cn("text-lg font-bold", isLosing ? "text-destructive" : "text-success")}>
                                            {isLosing ? `CRITICAL GAP: ${gapValue} POINTS` : `YOU ARE WINNING BY ${gapValue} POINTS`}
                                        </h4>
                                        <p className="text-sm opacity-90">
                                            {isLosing 
                                                ? "⚠️ You are losing potential customers to this competitor due to lower trust signals." 
                                                : "🎉 Great job! Your store has stronger trust signals than this competitor."}
                                        </p>
                                    </div>
                                </div>

                                {/* Detailed Breakdown Comparison */}
                                <div className="space-y-4">
                                    <h4 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-4">Category Breakdown</h4>
                                    
                                    {selectedScan.breakdown && Array.isArray(selectedScan.breakdown) && selectedScan.breakdown.map((item, i) => {
                                        // Try to find matching category in myLatestScan
                                        const myItem = getMyBreakdownItem(item.name || item.category);
                                        const myScore = myItem ? (myItem.score || 0) : 0;
                                        const theirScore = item.score || 0;
                                        const max = item.maxScore || 10;
                                        
                                        // Only show if max > 0
                                        if (max <= 0) return null;

                                        return (
                                            <div key={i} className="bg-muted/20 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-sm">{item.name || item.category}</span>
                                                    <span className="text-xs text-muted-foreground">Max: {max}</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                                    {/* My Bar (Right aligned) */}
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-xs font-mono mb-1">You: {myScore}</div>
                                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex justify-end">
                                                            <div 
                                                                className="h-full bg-primary" 
                                                                style={{ width: `${(myScore / max) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="text-[10px] text-muted-foreground font-bold">VS</div>

                                                    {/* Their Bar (Left aligned) */}
                                                    <div className="flex flex-col items-start">
                                                        <div className="text-xs font-mono mb-1">Them: {theirScore}</div>
                                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn("h-full", theirScore > myScore ? "bg-destructive" : "bg-success")} 
                                                                style={{ width: `${(theirScore / max) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        );
                    })()}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}
