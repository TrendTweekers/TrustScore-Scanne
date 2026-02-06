import React, { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Button, BlockStack, InlineGrid, Text, Banner, Badge, CalloutCard, SkeletonBodyText, SkeletonDisplayText, Tabs, Spinner, Icon, Box, Toast, Tooltip, Modal, Divider } from '@shopify/polaris';
import { CheckCircleIcon, NotificationIcon, ShieldCheckMarkIcon, ChartVerticalIcon, AlertCircleIcon, ArrowRightIcon, EmailIcon, SearchIcon } from '@shopify/polaris-icons';
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

function MonitoringPreviewModal({ open, onClose, score, trend, shopName }) {
    const fetch = useAuthenticatedFetch();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSendTest = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/monitoring/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, trend })
            });
            if (res.ok) {
                setSent(true);
                setTimeout(() => setSent(false), 3000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Weekly Trust Report Preview"
            primaryAction={{
                content: sent ? 'Sent!' : 'Send Test Email',
                onAction: handleSendTest,
                loading: sending,
                disabled: sent
            }}
            secondaryActions={[{ content: 'Close', onAction: onClose }]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p">This is exactly what you (and your team) will receive every Monday morning.</Text>
                    
                    <Box background="bg-surface-secondary" padding="500" borderRadius="200" borderWidth="1" borderColor="border">
                        <BlockStack gap="400">
                            {/* Fake Email Header */}
                            <InlineGrid columns="auto 1fr" gap="300" alignItems="center">
                                <Box background="bg-surface-inverse" borderRadius="100" padding="200">
                                    <Icon source={ShieldCheckMarkIcon} tone="textInverse" />
                                </Box>
                                <BlockStack gap="0">
                                    <Text fontWeight="bold">TrustScore Weekly Report</Text>
                                    <Text tone="subdued" variant="bodySm">To: {shopName || 'Store Owner'}</Text>
                                </BlockStack>
                            </InlineGrid>
                            
                            <Divider />

                            {/* Email Body */}
                            <BlockStack gap="300">
                                <Text variant="headingLg">Your Trust Score is {score || 75}/100</Text>
                                <Text as="p">
                                    Your store's trust score has {trend >= 0 ? 'improved' : 'dropped'} by <Text fontWeight="bold" tone={trend >= 0 ? 'success' : 'critical'}>{Math.abs(trend || 0)} points</Text> this week.
                                </Text>

                                <Box background="bg-surface" padding="300" borderRadius="200">
                                    <InlineGrid columns={2} gap="400">
                                        <BlockStack gap="100">
                                            <Text tone="subdued" variant="bodySm">Current Score</Text>
                                            <Text variant="headingXl">{score || 75}</Text>
                                        </BlockStack>
                                        <BlockStack gap="100">
                                            <Text tone="subdued" variant="bodySm">Weekly Trend</Text>
                                            <Text variant="headingXl" tone={trend >= 0 ? 'success' : 'critical'}>
                                                {trend > 0 ? '+' : ''}{trend || 5}%
                                            </Text>
                                        </BlockStack>
                                    </InlineGrid>
                                </Box>

                                <Text as="p">
                                    {trend < 0 
                                        ? "⚠️ Action Required: Several trust signals are missing or broken. Check your dashboard to fix them." 
                                        : "🎉 Great job! You are maintaining a high trust score. Keep optimizing to reach 90+."}
                                </Text>

                                <Button variant="primary" fullWidth>Open Dashboard</Button>
                            </BlockStack>
                        </BlockStack>
                    </Box>
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

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
  const [toastMsg, setToastMsg] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const toggleToast = useCallback(() => setToastMsg(null), []);

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
             setToastMsg('Scan failed: ' + (data.error || 'Unknown error'));
         }
      } else {
         setScanResult(data.result); // Use the full result structure
         loadDashboard(); // Refresh history
         setToastMsg('Trust Audit Completed! 🎉');
      }
    } catch (error) {
      console.error('Scan error:', error);
      setScanError('Network error');
      setToastMsg('Network error occurred');
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
    <Page title="" fullWidth>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .trustscore-header {
            background-color: #00C853 !important;
        }
        .trustscore-header * {
            color: white !important;
            fill: white !important;
        }
        .trustscore-gradient-bg {
            background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
        }
      `}</style>

      {/* Top Banner / Header */}
      <Box padding="400" className="trustscore-header" borderBlockEndWidth="025" borderColor="border-subdued">
         <InlineGrid columns="1fr auto" alignItems="center">
           <InlineGrid columns="auto auto" gap="300" alignItems="center">
              <Icon source={ShieldCheckMarkIcon} color="white" />
              <Text variant="headingLg" as="h1" fontWeight="bold">TrustScore <span style={{fontWeight: '800'}}>Scanner</span></Text>
           </InlineGrid>
           <Button variant="primary" icon={SearchIcon} onClick={handleScan} disabled={loading} loading={loading}>
              {scanCount === 0 ? 'Run Trust Audit' : 'Run Trust Audit'}
           </Button>
         </InlineGrid>
      </Box>

      <Box padding="400">
           <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} fitted />
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
      {toastMsg && <Toast content={toastMsg} onDismiss={toggleToast} duration={4000} />}

      <Layout>
        {selectedTab === 0 ? (
            <>
                {/* Unified Hero Section */}
                <Layout.Section>
                    <Card padding="0">
                        <Box padding="600" className="trustscore-gradient-bg">
                            <InlineGrid columns={{ xs: 1, md: ['twoThirds', 'oneThird'] }} gap="500" alignItems="center">
                                {/* LEFT: Score & Trust Tier */}
                                <BlockStack gap="400">
                                    <InlineGrid columns="auto auto" gap="400" alignItems="center">
                                        <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                           <div style={{ transform: 'scale(1.2)' }}>
                                              <Icon source={ShieldCheckMarkIcon} tone={hasScans && currentScore >= 70 ? 'success' : 'subdued'} />
                                           </div>
                                           <Text variant="heading4xl" as="p" fontWeight="bold">
                                               {hasScans ? `${currentScore}/100` : '--/100'}
                                           </Text>
                                        </InlineGrid>
                                        
                                        {hasScans ? (
                                            <BlockStack gap="100">
                                                <Badge tone={currentScore >= 70 ? 'success' : currentScore >= 40 ? 'attention' : 'critical'} size="large">
                                                    {currentScore >= 85 ? 'Elite' : currentScore >= 70 ? 'Trusted' : currentScore >= 40 ? 'Needs Optimization' : 'At Risk'}
                                                </Badge>
                                                {currentScore < 70 && (
                                                    <InlineGrid columns="auto 1fr" gap="100" alignItems="center">
                                                        <Icon source={AlertCircleIcon} tone="critical" />
                                                        <Text tone="critical" fontWeight="bold">
                                                            Losing ~{currentScore < 40 ? '35%' : '15%'} conversions
                                                        </Text>
                                                    </InlineGrid>
                                                )}
                                            </BlockStack>
                                        ) : (
                                            <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                                <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                                    <Text tone="subdued" variant="bodyMd" fontWeight="bold">Run your first audit to unlock score</Text>
                                                </InlineGrid>
                                            </Box>
                                        )}
                                    </InlineGrid>

                                    {/* Revenue Estimator */}
                                    <Box background="bg-surface" padding="300" borderRadius="200" width="fit-content" shadow="100">
                                        <BlockStack gap="100">
                                            <Text tone="subdued" variant="bodySm" fontWeight="bold">
                                                {revenueBracket ? 'REVENUE AT RISK' : 'ESTIMATE LOST SALES'}
                                            </Text>
                                            {revenueBracket ? (
                                                revenueEstimate && (
                                                    <BlockStack gap="0">
                                                        <Text variant="headingMd" tone={currentScore >= 70 ? 'success' : 'critical'}>
                                                            {revenueEstimate.text}
                                                        </Text>
                                                        <Text variant="bodyXs" tone="subdued">
                                                            Based on {revenueEstimate.pctRange} loss (Trust Tier)
                                                        </Text>
                                                    </BlockStack>
                                                )
                                            ) : (
                                                <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                                    <Text variant="bodySm" tone="subdued">Add revenue to see impact</Text>
                                                    <Button variant="plain" onClick={handleOpenRevenueModal}>Set revenue</Button>
                                                </InlineGrid>
                                            )}
                                        </BlockStack>
                                    </Box>

                                    {/* Stat Chips */}
                                    {hasScans && (
                                        <InlineGrid columns="auto auto auto" gap="300">
                                            <Badge tone="info" icon={CheckCircleIcon}>Last: {lastScannedText}</Badge>
                                            <Badge tone={trend >= 0 ? 'success' : 'critical'} icon={ChartVerticalIcon}>Trend: {trend > 0 ? '+' : ''}{trend}</Badge>
                                            <Badge tone={isFree ? 'attention' : 'success'}>Plan: {plan}</Badge>
                                        </InlineGrid>
                                    )}
                                </BlockStack>

                                {/* RIGHT: Primary Actions */}
                                <BlockStack gap="300" align="end">
                                    <Button size="large" variant="primary" icon={ArrowRightIcon} onClick={() => {
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

                        {/* TrustScore Component handles Empty, Loading, and Result states */}
                        <TrustScore 
                            result={scanResult} 
                            plan={plan}
                            aiUsageCount={aiUsage}
                            onUpgrade={() => setShowUpgradeModal(true)}
                            loading={loading}
                            onScan={handleScan}
                            revenueBracket={revenueBracket}
                        />
                    </BlockStack>
                </Layout.Section>

                {/* Sidebar */}
                <Layout.Section variant="oneThird">
                     <BlockStack gap="500">
                         {/* Monitoring & Alerts (New Pro Feature) */}
                         <Card>
                            <BlockStack gap="400">
                                <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                    <Icon source={NotificationIcon} tone="base" />
                                    <Text variant="headingMd">Monitoring & Alerts</Text>
                                </InlineGrid>
                                
                                <BlockStack gap="300">
                                     <InlineGrid columns="1fr auto" alignItems="center">
                                         <BlockStack gap="100">
                                             <Tooltip content="Weekly emails with score changes & fixes">
                                                 <Text fontWeight="bold" as="span" style={{textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'help'}}>
                                                     Weekly Trust Report
                                                 </Text>
                                             </Tooltip>
                                             <Text tone="subdued" variant="bodySm">Email summary of score changes</Text>
                                         </BlockStack>
                                         {isFree ? (
                                             <Badge tone="subdued">Pro</Badge>
                                         ) : (
                                             <Badge tone="success" progress="complete">Active</Badge>
                                         )}
                                     </InlineGrid>
                                     
                                     <InlineGrid columns="1fr auto" alignItems="center">
                                         <BlockStack gap="100">
                                             <Text fontWeight="bold">Score Drop Alerts</Text>
                                             <Text tone="subdued" variant="bodySm">Instant email if score drops 5+</Text>
                                         </BlockStack>
                                         {isFree ? (
                                             <Badge tone="subdued">Pro</Badge>
                                         ) : (
                                             <Badge tone="success" progress="complete">Active</Badge>
                                         )}
                                     </InlineGrid>
                                     
                                     <Divider />
                                     
                                     {/* Usage Counter */}
                                     <BlockStack gap="200">
                                         <InlineGrid columns="1fr auto" alignItems="center">
                                             <Text variant="bodySm" tone="subdued">Alerts sent this month</Text>
                                             <Text variant="bodySm" fontWeight="bold">0/∞</Text>
                                         </InlineGrid>
                                         <Box background="bg-surface-secondary" padding="0" borderRadius="100" style={{ height: '4px', overflow: 'hidden' }}>
                                             <Box background="bg-fill-success" style={{ width: '0%', height: '100%' }} />
                                         </Box>
                                     </BlockStack>

                                     {isFree ? (
                                         <BlockStack gap="200">
                                            <Button fullWidth variant="primary" tone="critical" onClick={() => handleUpgrade('PRO')}>Upgrade to Pro</Button>
                                            <Text variant="bodyXs" tone="subdued" alignment="center">Pro users get weekly reports & instant score drop alerts</Text>
                                         </BlockStack>
                                     ) : (
                                         <Button fullWidth icon={EmailIcon} onClick={() => setShowPreviewModal(true)}>
                                             Preview Sample Report
                                         </Button>
                                     )}
                                </BlockStack>
                            </BlockStack>
                         </Card>
                         
                         <MonitoringPreviewModal 
                            open={showPreviewModal} 
                            onClose={() => setShowPreviewModal(false)}
                            score={currentScore}
                            trend={trend}
                            shopName={shopData?.shop || "Your Store"}
                         />

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
