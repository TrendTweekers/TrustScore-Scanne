import React, { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Button, BlockStack, InlineGrid, Text, Banner, Badge, CalloutCard, SkeletonBodyText, SkeletonDisplayText, Tabs, Spinner, Icon, Box } from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { trackEvent } from '../utils/analytics';
import { calculateRevenueEstimate } from '../utils/revenueEstimate';
import { BrandLogo } from './BrandLogo';
import TrustScore from './TrustScore';
import ScoreInfo from './ScoreInfo';
import { OnboardingModal } from './OnboardingModal';
import { UpgradeModal } from './UpgradeModal';
import { CompetitorComparison } from './CompetitorComparison';
import { ScoreChart } from './ScoreChart';
import { FAQ } from './FAQ';

function Dashboard() {
  const app = useAppBridge();
  // console.log("useAppBridge SUCCESS:", app);
  const fetch = useAuthenticatedFetch();
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    if (app) {
      // console.log('App Bridge ready - checking embedded status');
      // Test ping
      fetch('/api/ping').then(r => r.json()).then(d => {
        // console.log("Ping success:", d);
        // Check session status
        fetch('/api/session-status').then(r => r.json()).then(s => {
            // console.log("Session Status:", s)
        }).catch(e => console.error("Session check failed:", e));
      }).catch(e => console.error("Ping failed:", e));
    }
  }, [app]);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState('full');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      // console.log("Attempting to fetch dashboard");
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
      
      // Check if new user
      if (data.scanCount === 0 && !localStorage.getItem('onboardingCompleted') && !localStorage.getItem('dismissed_onboarding')) {
          setShowOnboarding(true);
      }
    } catch (err) {
      console.error("API fetch failed:", err);
    }
  }, [fetch]);

  useEffect(() => {
    loadDashboard();
    
    // Check for billing success
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
        setShowSuccessBanner(true);
    }

    // Poll every 5 seconds
    const interval = setInterval(() => {
        loadDashboard();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  useEffect(() => {
    if (showSuccessBanner && dashboardData?.plan) {
        trackEvent('upgrade_completed', { plan: dashboardData.plan });
    }
  }, [showSuccessBanner, dashboardData?.plan]);

  useEffect(() => {
    trackEvent("app_loaded");
  }, []);

  const handleScan = async () => {
    // Check limit before scanning
    if (dashboardData?.plan === 'FREE' && dashboardData?.scanCount >= 1) {
        setShowUpgradeModal(true);
        return;
    }

    setLoading(true);
    setScanError(null);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Auto-detect URL on backend
      });
      const data = await response.json();
      
      if (!response.ok) {
         if (response.status === 403 && data.requiresUpgrade) {
             setScanError('upgrade_required');
         } else {
             setScanError(data.error || 'Scan failed');
         }
      } else {
         setScanResult(data.result); // Use the full result structure
         loadDashboard(); // Refresh history
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboardingScan = () => {
      localStorage.setItem('onboardingCompleted', 'true');
      handleScan();
  };

  const handleUpgrade = async (plan) => {
      const res = await fetch(`/api/billing/subscribe?plan=${plan}`);
      const data = await res.json();
      if (data.confirmationUrl) {
          window.open(data.confirmationUrl, '_top');
      }
  };

  if (!dashboardData) {
      return (
          <Page title="Dashboard">
              <Layout>
                  <Layout.Section>
                      <Card>
                          <BlockStack gap="400">
                              <SkeletonDisplayText size="medium" />
                              <SkeletonBodyText lines={3} />
                          </BlockStack>
                      </Card>
                  </Layout.Section>
              </Layout>
          </Page>
      );
  }

  const { currentScore, trend, history, plan, scanCount, aiUsage, shopData } = dashboardData;
  const isFree = plan === 'FREE';

  const revenueBracket = shopData?.revenue_bracket;
  const revenueEstimate = calculateRevenueEstimate(revenueBracket, currentScore);

  const lastScannedDate = history.length > 0 ? new Date(history[0].timestamp || history[0].createdAt) : null;
  const hoursAgo = lastScannedDate ? Math.floor((new Date() - lastScannedDate) / (1000 * 60 * 60)) : 0;
  const lastScannedText = lastScannedDate ? (hoursAgo < 1 ? 'Just now' : `${hoursAgo} hours ago`) : '';

  const tabs = [
      { id: 'dashboard', content: 'Dashboard' },
      { id: 'competitors', content: 'Competitive Trust Intelligence' },
      { id: 'help', content: 'Help & FAQ' },
  ];

  const handleOpenRevenueModal = () => {
    setOnboardingMode('revenue_only');
    setShowOnboarding(true);
  };

  const hasScans = scanCount > 0 || history.length > 0;

  return (
    <Page title="TrustScore">
      {selectedTab === 0 && (
        <Box paddingBlockStart="400" paddingBlockEnd="200" paddingInlineStart="400" paddingInlineEnd="400">
           <InlineGrid columns="1fr auto" alignItems="center">
             <BrandLogo size={32} withWordmark />
             <Button variant="primary" onClick={handleScan} disabled={loading} loading={loading}>
                {scanCount === 0 ? 'Run Trust Audit (60s)' : 'Run Trust Audit'}
             </Button>
           </InlineGrid>
        </Box>
      )}

      <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockEnd="400">
           <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />
      </Box>

      <OnboardingModal 
        open={showOnboarding} 
        mode={onboardingMode}
        onClose={() => {
            setShowOnboarding(false);
            if (onboardingMode === 'full') {
                localStorage.setItem('dismissed_onboarding', 'true');
            }
            setOnboardingMode('full');
            loadDashboard();
        }} 
        onStartScan={handleStartOnboardingScan}
      />
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />

      {selectedTab === 0 && !revenueBracket && (
        <Box paddingInlineStart="400" paddingInlineEnd="400" paddingBlockEnd="400">
            <CalloutCard
                title="Set your monthly revenue to personalize your TrustScore"
                illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8dbad5ae1c456c37ce773148b3080.png"
                primaryAction={{
                    content: 'Set Revenue',
                    onAction: handleOpenRevenueModal
                }}
            >
                <p>We use your revenue to estimate how much you're losing due to trust issues.</p>
            </CalloutCard>
        </Box>
      )}

      <Layout>
        {selectedTab === 0 ? (
            <>
                {/* Unified Hero Section */}
                <Layout.Section>
                    <Card padding="0">
                        <Box padding="600" background="bg-surface-secondary">
                            <InlineGrid columns={['twoThirds', 'oneThird']} gap="600" alignItems="center">
                                {/* LEFT: Score & Trust Tier */}
                                <BlockStack gap="400">
                                    <InlineGrid columns="auto auto" gap="400" alignItems="center">
                                        <Text variant="heading4xl" as="p" fontWeight="bold">
                                            {hasScans ? `${currentScore}/100` : '--/100'}
                                        </Text>
                                        
                                        {hasScans ? (
                                            <BlockStack gap="100">
                                                <Badge tone={currentScore >= 70 ? 'success' : currentScore >= 40 ? 'attention' : 'critical'} size="large">
                                                    Trust Tier: {currentScore >= 85 ? 'Elite' : currentScore >= 70 ? 'Trusted' : currentScore >= 40 ? 'Needs Optimization' : 'At Risk'}
                                                </Badge>
                                                {currentScore < 70 && (
                                                    <Text tone="critical" fontWeight="bold">
                                                        ⚠️ Stores at this level typically lose 15–35% of potential conversions.
                                                    </Text>
                                                )}
                                            </BlockStack>
                                        ) : (
                                            <Text tone="subdued" variant="bodyLg">Run your first Trust Audit to get your TrustScore.</Text>
                                        )}
                                    </InlineGrid>

                                    {/* Revenue Estimator */}
                                    <Box background="bg-surface" padding="300" borderRadius="200" width="fit-content">
                                        <BlockStack gap="100">
                                            <Text tone="subdued" variant="bodySm">
                                                {revenueBracket ? 'Estimated Revenue Being Lost' : 'Estimate Lost Sales'}
                                            </Text>
                                            {revenueBracket ? (
                                                revenueEstimate && (
                                                    <BlockStack gap="0">
                                                        <Text variant="headingMd" tone="success">
                                                            {revenueEstimate.text}
                                                        </Text>
                                                        <Text variant="bodyXs" tone="subdued">
                                                            Based on {revenueEstimate.pctRange} loss (Trust Tier)
                                                        </Text>
                                                    </BlockStack>
                                                )
                                            ) : (
                                                <Text variant="bodySm" tone="subdued">
                                                    Revenue estimate requires your monthly revenue. <Button variant="plain" onClick={handleOpenRevenueModal}>Set revenue</Button>
                                                </Text>
                                            )}
                                        </BlockStack>
                                    </Box>

                                    {/* Stat Chips */}
                                    {hasScans && (
                                        <InlineGrid columns="auto auto auto" gap="300">
                                            <Badge tone="info">Last audit: {lastScannedText}</Badge>
                                            <Badge tone={trend >= 0 ? 'success' : 'critical'}>Trend: {trend > 0 ? '+' : ''}{trend}</Badge>
                                            <Badge tone={isFree ? 'attention' : 'success'}>Plan: {plan}</Badge>
                                        </InlineGrid>
                                    )}
                                </BlockStack>

                                {/* RIGHT: Primary Actions */}
                                <BlockStack gap="300" align="end">
                                    <Button variant="plain" onClick={() => {
                                        const el = document.getElementById('recommendations-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}>
                                        View Fixes
                                    </Button>
                                </BlockStack>
                            </InlineGrid>
                        </Box>
                    </Card>
                </Layout.Section>

                {/* Success Banner */}
                {showSuccessBanner && (
                    <Layout.Section>
                        <Banner tone="success" title="Plan Upgraded Successfully" onDismiss={() => setShowSuccessBanner(false)}>
                            Thank you for upgrading! You now have access to unlimited scans and premium features.
                        </Banner>
                    </Layout.Section>
                )}

                {/* Alerts */}
                {scanError && scanError !== 'upgrade_required' && (
                    <Layout.Section>
                        <Banner tone="critical" title="Trust Audit Failed">
                            {scanError}
                        </Banner>
                    </Layout.Section>
                )}

                {trend < 0 && (
                    <Layout.Section>
                        <Banner tone="critical" title="Trust Score Dropped">
                            Your score dropped by {Math.abs(trend)} points since the last audit. Check the recommendations.
                        </Banner>
                    </Layout.Section>
                )}
                
                {scanError === 'upgrade_required' && (
                     <Layout.Section>
                        <CalloutCard
                            title="Upgrade to Pro"
                            illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8dbad5ae1c456c37ce773148b3080.png"
                            primaryAction={{
                                content: 'Upgrade to Pro ($29/mo)',
                                onAction: () => handleUpgrade('PRO'),
                            }}
                            secondaryAction={{
                                content: 'Upgrade to Plus ($99/mo)',
                                onAction: () => handleUpgrade('PLUS'),
                            }}
                        >
                            <p>You have used your free audit. Unlock unlimited audits and weekly monitoring.</p>
                        </CalloutCard>
                     </Layout.Section>
                )}

                {/* Main Content Area */}
                <Layout.Section>
                    <BlockStack gap="500">
                        <ScoreChart />

                        {/* Loading State for Scan */}
                        {loading && !scanResult && (
                            <Card>
                                 <BlockStack gap="500" align="center">
                                     <BlockStack gap="200" align="center">
                                        <Spinner size="large" />
                                        <Text variant="headingLg">Running Trust Audit...</Text>
                                     </BlockStack>
                                     
                                     <Box width="100%" maxWidth="400px">
                                         <BlockStack gap="400">
                                             <InlineGrid columns="auto 1fr" gap="300" alignItems="center">
                                                 <Icon source={CheckCircleIcon} tone="success" />
                                                 <Text>Capturing screenshots (Desktop & Mobile)</Text>
                                             </InlineGrid>
                                             <InlineGrid columns="auto 1fr" gap="300" alignItems="center">
                                                 <Icon source={CheckCircleIcon} tone="success" />
                                                 <Text>Analyzing 25+ trust signals</Text>
                                             </InlineGrid>
                                             <InlineGrid columns="auto 1fr" gap="300" alignItems="center">
                                                 <Icon source={CheckCircleIcon} tone="success" />
                                                 <Text>Calculating Trust Score</Text>
                                             </InlineGrid>
                                             <InlineGrid columns="auto 1fr" gap="300" alignItems="center">
                                                 <Spinner size="small" />
                                                 <Text fontWeight="bold">Generating AI Insights (Claude)</Text>
                                             </InlineGrid>
                                         </BlockStack>
                                     </Box>
                                 </BlockStack>
                            </Card>
                        )}

                        {/* Scan Result */}
                        {scanResult && !loading && (
                            <TrustScore 
                                result={scanResult} 
                                plan={plan}
                                aiUsageCount={aiUsage}
                                onUpgrade={() => setShowUpgradeModal(true)}
                            />
                        )}
                    </BlockStack>
                </Layout.Section>

                {/* Sidebar */}
                <Layout.Section variant="oneThird">
                     <BlockStack gap="500">
                         <ScoreInfo />
                         <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd">Recent Scans</Text>
                                {history.length === 0 ? <Text tone="subdued">No scans yet.</Text> : (
                                    <BlockStack gap="200">
                                        {history.map((scan, i) => (
                                            <InlineGrid key={i} columns={2}>
                                                <Text>{new Date(scan.timestamp || scan.createdAt).toLocaleString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    year: 'numeric', 
                                                    hour: 'numeric', 
                                                    minute: 'numeric', 
                                                    hour12: true 
                                                })}</Text>
                                                <Text fontWeight="bold" tone={scan.score > 80 ? 'success' : 'warning'}>{scan.score}/100</Text>
                                            </InlineGrid>
                                        ))}
                                    </BlockStack>
                                )}
                            </BlockStack>
                         </Card>
                     </BlockStack>
                </Layout.Section>
            </>
        ) : selectedTab === 1 ? (
            <Layout.Section>
                <CompetitorComparison 
                    userPlan={plan} 
                    myLatestScore={currentScore} 
                    shopData={shopData} 
                    myLatestScan={history.length > 0 ? history[0] : null}
                />
            </Layout.Section>
        ) : (
            <Layout.Section>
                <FAQ />
            </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}

export default Dashboard;
