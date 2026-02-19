import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import ScoreHero from './ScoreHero';
import ScoreBreakdown from './ScoreBreakdown';
import AIAnalysis from './AIAnalysis';
import FixRecommendations from './FixRecommendations';
import MonitoringCard from './MonitoringCard';
import CredibilityCard from './CredibilityCard';
import RecentScans from './RecentScans';
import CompetitorView from './CompetitorView';
import HelpFAQ from './HelpFAQ';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isScanning, setIsScanning] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data on mount
  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Scan failed');
      
      // Reload dashboard to get updated data
      await loadDashboard();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const plan = dashboardData?.plan || 'FREE';
  const aiUsageCount = dashboardData?.aiUsage || 0;
  const aiUsageLimit = plan === 'PRO' ? 10 : plan === 'PLUS' ? 999 : 0;

  // Get the latest scan from history
  const lastScan = dashboardData?.history?.[0];
  const score = lastScan?.score || dashboardData?.currentScore || 0;
  const trend = dashboardData?.trend || 0;
  
  // Format last scan time
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

  // Calculate estimated conversion loss (simple logic based on score)
  const estimatedConversionLoss = Math.max(0, Math.round((100 - score) * 0.35));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <DashboardHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRunScan={handleRunScan}
          isScanning={isScanning}
        />

        {activeTab === "dashboard" && (
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
              
              {lastScan?.result && (
                <>
                  <ScoreBreakdown breakdown={lastScan.result.breakdown || []} />
                  <AIAnalysis
                    plan={plan}
                    aiUsageCount={aiUsageCount}
                    aiUsageLimit={aiUsageLimit}
                    analysis={lastScan.result.aiAnalysis}
                  />
                  <FixRecommendations 
                    recommendations={lastScan.result.recommendations || []}
                  />
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <MonitoringCard plan={plan} />
              <CredibilityCard />
              <RecentScans history={dashboardData?.history || []} />
            </div>
          </div>
        )}

        {activeTab === "competitor" && (
          <CompetitorView
            yourScore={score}
            plan={plan}
            auditsUsed={0}
            auditsLimit={plan === 'PRO' ? 5 : plan === 'PLUS' ? 20 : 0}
          />
        )}

        {activeTab === "help" && (
          <HelpFAQ />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
