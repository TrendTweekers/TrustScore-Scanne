import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, ShieldCheck, ArrowRight, Lock, Trophy, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { trackEvent } from '../utils/analytics';
import { cn } from '../lib/utils';

export function CompetitorComparison({ userPlan, myLatestScore, shopData, myLatestScan, onUpgrade }) {
  const fetch = useAuthenticatedFetch();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);

  const isFree = userPlan === 'FREE';

  // Gating for Free Users
  if (isFree) {
    return (
      <motion.div 
        className="bg-card rounded-2xl border border-border card-elevated overflow-hidden mb-6 relative group cursor-pointer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => {
            trackEvent('upgrade_clicked', { from_plan: userPlan, source: 'competitor_gating_card' });
            if (onUpgrade) onUpgrade();
        }}
      >
        {/* Blurred Background Content */}
        <div className="p-8 filter blur-sm opacity-50 select-none pointer-events-none">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Competitive Intelligence</h3>
                <div className="bg-primary/10 px-3 py-1 rounded-full text-primary font-bold text-sm">Pro Feature</div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-muted p-6 rounded-2xl">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Your Score</h4>
                    <div className="text-4xl font-bold text-primary">78/100</div>
                </div>
                <div className="bg-muted p-6 rounded-2xl border-2 border-destructive/20">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Competitor</h4>
                    <div className="text-4xl font-bold text-destructive">92/100</div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-6 bg-muted rounded w-full"></div>
                <div className="h-6 bg-muted rounded w-5/6"></div>
            </div>
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center transition-colors group-hover:bg-background/50">
            <div className="w-16 h-16 rounded-full bg-magic/10 flex items-center justify-center mb-6 shadow-xl ring-4 ring-background">
                <Lock className="w-8 h-8 text-magic" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Spy on Your Competitors</h3>
            <p className="text-muted-foreground max-w-md mb-8 text-lg">
                See exactly where you're losing customers to your competition. Compare trust scores, uncover their winning strategies, and close the gap.
            </p>
            <button className="bg-magic text-white px-8 py-3 rounded-xl text-base font-bold shadow-lg shadow-magic/20 hover:shadow-xl hover:shadow-magic/30 transition-all transform group-hover:scale-105">
                Upgrade to Unlock Intelligence
            </button>
        </div>
      </motion.div>
    );
  }

  const limit = userPlan === 'PRO' ? 5 : 20; 

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
      } else {
          // Object format
          return breakdown[category];
      }
  };

  return (
    <div className="space-y-6">
        {/* Search Bar */}
        <div className="bg-card rounded-2xl border border-border card-elevated p-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Enter competitor URL (e.g. competitor.com)"
                        className="w-full pl-12 pr-4 py-3 bg-muted/30 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    />
                </div>
                <button 
                    onClick={handleScan}
                    disabled={loading || !url}
                    className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Analyzing..." : "Compare"}
                </button>
            </div>
            {error && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <ShieldAlert className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
            {selectedScan && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {/* Score Comparison Card */}
                    <div className="bg-card rounded-2xl border border-border card-elevated p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">Trust Gap Analysis</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">vs</span>
                                <span className="text-sm font-semibold">{new URL(selectedScan.url).hostname}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-8 mb-8">
                            <div className="text-center">
                                <div className="w-24 h-24 rounded-full border-4 border-primary flex items-center justify-center mb-3">
                                    <span className="text-3xl font-bold">{myLatestScore || 0}</span>
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">You</span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold mb-2",
                                    selectedScan.score > myLatestScore ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                                )}>
                                    {selectedScan.score > myLatestScore ? `-${selectedScan.score - myLatestScore} pts` : `+${myLatestScore - selectedScan.score} pts`}
                                </div>
                                <ArrowRight className="w-6 h-6 text-muted-foreground" />
                            </div>

                            <div className="text-center">
                                <div className={cn(
                                    "w-24 h-24 rounded-full border-4 flex items-center justify-center mb-3",
                                    selectedScan.score > myLatestScore ? "border-destructive text-destructive" : "border-muted text-muted-foreground"
                                )}>
                                    <span className="text-3xl font-bold">{selectedScan.score}</span>
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">Competitor</span>
                            </div>
                        </div>

                        {/* Gap Breakdown */}
                        <div className="space-y-4">
                             {/* AI Insights for Competitor */}
                             {selectedScan.result?.aiAnalysis && (
                                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Trophy className="w-4 h-4 text-warning" />
                                        <h4 className="text-sm font-bold">Winning Strategy</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {typeof selectedScan.result.aiAnalysis === 'string' 
                                            ? selectedScan.result.aiAnalysis 
                                            : (selectedScan.result.aiAnalysis.summary || "No specific strategy detected.")}
                                    </p>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* AI Comparison Recommendations */}
                    <div className="bg-card rounded-2xl border border-border card-elevated p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-magic/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-magic" />
                            </div>
                            <h3 className="text-lg font-bold">How to Beat Them</h3>
                        </div>

                        <div className="space-y-3">
                            {/* We can generate these dynamically or use AI data if available */}
                            {selectedScan.score > myLatestScore ? (
                                <>
                                    <div className="p-3 bg-background rounded-xl border border-border flex gap-3">
                                        <div className="mt-1 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                            <AlertTriangle className="w-3 h-3 text-destructive" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold">Improve Visual Trust</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Their site looks more professional. Upgrade your theme or add high-quality badges.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-background rounded-xl border border-border flex gap-3">
                                        <div className="mt-1 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                            <AlertTriangle className="w-3 h-3 text-destructive" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold">Add More Social Proof</h4>
                                            <p className="text-xs text-muted-foreground mt-1">They have more visible reviews/testimonials above the fold.</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 bg-success/10 rounded-xl text-center">
                                    <h4 className="text-success font-bold mb-1">You are winning! 🎉</h4>
                                    <p className="text-sm text-success/80">Your store has stronger trust signals. Keep it up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* History List */}
        {scans.length > 0 && (
            <div className="mt-8">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4">Recent Comparisons</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {scans.map((scan) => (
                        <div 
                            key={scan.id || scan.url}
                            onClick={() => setSelectedScan(scan)}
                            className={cn(
                                "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                                selectedScan?.url === scan.url 
                                    ? "bg-primary/5 border-primary ring-1 ring-primary" 
                                    : "bg-card border-border hover:border-primary/50"
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm truncate max-w-[120px]">{new URL(scan.url).hostname}</span>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    scan.score >= 80 ? "bg-success/10 text-success" : 
                                    scan.score >= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                                )}>
                                    {scan.score}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Gap: <span className={scan.score > myLatestScore ? "text-destructive" : "text-success"}>
                                    {scan.score > myLatestScore ? `-${scan.score - myLatestScore}` : `+${myLatestScore - scan.score}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}
