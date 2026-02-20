import { useState, useEffect, useRef } from 'react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { ShieldCheck, Search, AlertCircle, RefreshCw } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import ScoreHero from './ScoreHero';
import ScoreBreakdown from './ScoreBreakdown';
import ScoreHistory from './ScoreHistory';
import AIAnalysis from './AIAnalysis';
import FixRecommendations from './FixRecommendations';
import MonitoringCard from './MonitoringCard';
import CredibilityCard from './CredibilityCard';
import RecentScans from './RecentScans';
import CompetitorView from './CompetitorView';
import HelpFAQ from './HelpFAQ';
import ReviewRequestModal from './ReviewRequestModal';

// ─── Utility components ────────────────────────────────────────────────

const ScanProgressOverlay = ({ progress }) => {
  const getStatusText = () => {
    if (progress < 20) return "Capturing screenshots...";
    if (progress < 45) return "Analyzing trust signals...";
    if (progress < 70) return "Calculating score...";
    if (progress < 90) return "Generating recommendations...";
    return "Finishing up...";
  };

  return (
    <div className="bg-card rounded-xl border border-border card-elevated p-8 text-center">
      <div className="max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Search className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Scanning your store...</h3>
        <p className="text-sm text-muted-foreground mb-5">{getStatusText()}</p>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
      </div>
    </div>
  );
};

const SkeletonCard = ({ className = "" }) => (
  <div className={`bg-card rounded-xl border border-border p-6 animate-pulse ${className}`}>
    <div className="h-4 bg-muted rounded w-1/3 mb-4" />
    <div className="space-y-3">
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </div>
);

const EmptyDashboard = ({ onRunScan }) => (
  <div className="bg-card rounded-xl border border-border card-elevated p-10 text-center">
    <div className="max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <ShieldCheck className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Ready to audit your store?</h3>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Get a 0-100 trust score, identify gaps hurting your conversions, and receive
        AI-powered recommendations — all in about 60 seconds.
      </p>
      <button
        onClick={onRunScan}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        <Search className="w-4 h-4" />
        Run Your First Scan
      </button>
      <p className="text-xs text-muted-foreground mt-4">
        Takes about 60 seconds. No credit card required.
      </p>
    </div>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="bg-card rounded-xl border border-destructive/20 p-8 text-center">
    <div className="max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-7 h-7 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-5">
        We couldn't load your dashboard data. This usually resolves itself — try again in a moment.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────────────

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [lastScanScreenshots, setLastScanScreenshots] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const authenticatedFetch = useAuthenticatedFetch();
  const progressRef = useRef(null);
  const reviewCheckedRef = useRef(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const loadDashboard = async () => {
    setError(null);
    try {
      const response = await authenticatedFetch('/api/dashboard');
      const data = await response.json();
      setDashboardData(data);

      // Extract screenshots from most recent scan result
      const latest = data?.history?.[0];
      if (latest?.result) {
        const result = typeof latest.result === 'string' ? JSON.parse(latest.result) : latest.result;
        if (result.screenshots) {
          setLastScanScreenshots(result.screenshots);
        }
      }

      // Check if we should show the review modal (only once per load)
      if (!reviewCheckedRef.current) {
        reviewCheckedRef.current = true;
        checkReviewTrigger(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const checkReviewTrigger = (data) => {
    if (!data) return;

    const scanCount = data.scanCount || 0;
    const hasReviewed = data.hasReviewed;
    const dismissedCount = data.reviewDismissedCount || 0;
    const lastRequested = data.reviewRequestedAt ? new Date(data.reviewRequestedAt) : null;
    const history = data.history || [];

    // Don't show if: already reviewed, dismissed 2+ times
    if (hasReviewed || dismissedCount >= 2) return;

    // Don't show if asked within the last 30 days
    if (lastRequested) {
      const daysSince = (Date.now() - lastRequested.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) return;
    }

    // Calculate score improvement (first scan vs latest)
    let scoreImprovement = 0;
    if (history.length >= 2) {
      const latestScore = history[0].score;
      const firstScore = history[history.length - 1].score;
      scoreImprovement = latestScore - firstScore;
    }

    // Primary trigger: 3+ scans AND score improved 10+ points
    const primaryTrigger = scanCount >= 3 && scoreImprovement >= 10;

    // Alternative trigger: 5+ scans (value delivered even without improvement)
    const alternativeTrigger = scanCount >= 5;

    if (primaryTrigger || alternativeTrigger) {
      // Small delay so dashboard fully loads first
      setTimeout(async () => {
        setShowReviewModal(true);
        try {
          await authenticatedFetch('/api/review/requested', { method: 'POST' });
        } catch (e) { /* silent */ }
      }, 2000);
    }
  };

  const handleReviewClick = async () => {
    setShowReviewModal(false);
    try {
      await authenticatedFetch('/api/review/completed', { method: 'POST' });
    } catch (e) { /* silent */ }
  };

  const handleReviewDismiss = async () => {
    setShowReviewModal(false);
    try {
      await authenticatedFetch('/api/review/dismissed', { method: 'POST' });
    } catch (e) { /* silent */ }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanError(null);

    progressRef.current = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 92) return prev;
        const increment = prev < 30 ? 2.5 : prev < 60 ? 1.5 : 0.5;
        return prev + increment;
      });
    }, 400);

    try {
      const response = await authenticatedFetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const scanData = await response.json();

      // Capture screenshots from scan response
      if (scanData.screenshots) {
        setLastScanScreenshots(scanData.screenshots);
      }

      clearInterval(progressRef.current);
      setScanProgress(100);
      await new Promise((r) => setTimeout(r, 600));
      await loadDashboard();
    } catch (err) {
      console.error('Scan failed:', err);
      setScanError('Scan failed. Please try again.');
    } finally {
      clearInterval(progressRef.current);
      progressRef.current = null;
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const handleUpgrade = () => {
    // Redirect to Shopify billing / pricing page
    const shopDomain = new URLSearchParams(window.location.search).get('shop') || '';
    const storeName = shopDomain.replace('.myshopify.com', '');
    if (storeName) {
      window.top.location.href = `https://admin.shopify.com/store/${storeName}/charges/trustscore-scanner/pricing_plans`;
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
          <div className="gradient-header rounded-xl p-4 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20" />
              <div>
                <div className="h-5 w-36 bg-primary-foreground/20 rounded mb-1" />
                <div className="h-3 w-28 bg-primary-foreground/10 rounded" />
              </div>
            </div>
            <div className="w-32 h-10 rounded-lg bg-primary-foreground/20" />
          </div>
          <div className="flex gap-1">
            <div className="w-24 h-10 bg-muted rounded-lg animate-pulse" />
            <div className="w-48 h-10 bg-muted/50 rounded-lg animate-pulse" />
            <div className="w-24 h-10 bg-muted/50 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
            <div className="space-y-5">
              <SkeletonCard className="h-64" />
              <SkeletonCard className="h-48" />
            </div>
            <div className="space-y-4">
              <SkeletonCard className="h-40" />
              <SkeletonCard className="h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
          <DashboardHeader
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onRunScan={handleRunScan}
            isScanning={isScanning}
          />
          <ErrorState onRetry={() => { setLoading(true); loadDashboard(); }} />
        </div>
      </div>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────
  const plan = dashboardData?.plan || 'FREE';
  const aiUsageCount = dashboardData?.aiUsage || 0;
  const aiUsageLimit = plan === 'PRO' ? 10 : plan === 'PLUS' ? 999 : 0;

  const lastScan = dashboardData?.history?.[0];
  const score = lastScan?.score || dashboardData?.currentScore || 0;
  const trend = dashboardData?.trend || 0;

  let lastScanTime = "Never";
  if (lastScan?.timestamp) {
    const date = new Date(lastScan.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffMinutes < 1) lastScanTime = "Just now";
    else if (diffMinutes < 60) lastScanTime = `${diffMinutes} min ago`;
    else if (diffMinutes < 1440) lastScanTime = `${Math.floor(diffMinutes / 60)} hours ago`;
    else lastScanTime = `${Math.floor(diffMinutes / 1440)} days ago`;
  }

  const estimatedConversionLoss = Math.max(0, Math.round((100 - score) * 0.35));
  const hasScans = dashboardData?.history?.length > 0;

  // Parse scan result (could be a JSON string in the DB)
  let scanResult = null;
  if (lastScan?.result) {
    scanResult = typeof lastScan.result === 'string' ? JSON.parse(lastScan.result) : lastScan.result;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <DashboardHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRunScan={handleRunScan}
          isScanning={isScanning}
        />

        {/* Scan error banner */}
        {scanError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <span className="text-destructive font-medium">{scanError}</span>
            <button onClick={() => setScanError(null)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Dismiss
            </button>
          </div>
        )}

        {/* ═══════ Dashboard Tab ═══════ */}
        {activeTab === "dashboard" && (
          <>
            {isScanning && (
              <ScanProgressOverlay progress={scanProgress} />
            )}

            {!isScanning && !hasScans && (
              <EmptyDashboard onRunScan={handleRunScan} />
            )}

            {!isScanning && hasScans && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                {/* Main column */}
                <div className="space-y-5">
                  <ScoreHero
                    score={score}
                    maxScore={100}
                    lastScanTime={lastScanTime}
                    trend={trend}
                    plan={plan}
                    estimatedConversionLoss={estimatedConversionLoss}
                  />

                  <ScoreHistory
                    history={dashboardData?.history || []}
                    plan={plan}
                    onUpgrade={handleUpgrade}
                  />

                  {scanResult && (
                    <>
                      <ScoreBreakdown breakdown={scanResult.breakdown || []} />
                      <AIAnalysis
                        plan={plan}
                        aiUsageCount={aiUsageCount}
                        aiUsageLimit={aiUsageLimit}
                        analysis={scanResult.aiAnalysis}
                        screenshots={lastScanScreenshots || scanResult.screenshots}
                        onUpgrade={handleUpgrade}
                      />
                      <FixRecommendations
                        recommendations={scanResult.recommendations || []}
                        plan={plan}
                        onUpgrade={handleUpgrade}
                      />
                    </>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <MonitoringCard plan={plan} onUpgrade={handleUpgrade} />
                  <CredibilityCard />
                  <RecentScans history={dashboardData?.history || []} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ Competitor Tab ═══════ */}
        {activeTab === "competitor" && (
          <CompetitorView
            yourScore={score}
            plan={plan}
            auditsUsed={0}
            auditsLimit={plan === 'PRO' ? 5 : plan === 'PLUS' ? 20 : 0}
            onUpgrade={handleUpgrade}
          />
        )}

        {/* ═══════ Help Tab ═══════ */}
        {activeTab === "help" && (
          <HelpFAQ />
        )}
      </div>

      {/* ═══════ Review Request Modal ═══════ */}
      {showReviewModal && (() => {
        const history = dashboardData?.history || [];
        const currentScore = history[0]?.score || 0;
        const firstScore = history.length >= 2 ? history[history.length - 1].score : currentScore;
        const scoreImprovement = currentScore - firstScore;
        return (
          <ReviewRequestModal
            currentScore={currentScore}
            scoreImprovement={scoreImprovement}
            onReview={handleReviewClick}
            onDismiss={handleReviewDismiss}
          />
        );
      })()}
    </div>
  );
};

export default Dashboard;
