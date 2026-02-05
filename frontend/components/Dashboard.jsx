import React, { useState, useEffect, useCallback } from 'react';
import { Page, Layout, Card, Button, BlockStack, InlineGrid, Text, Banner, Badge, CalloutCard, SkeletonBodyText, SkeletonDisplayText, Tabs } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import TrustScore from './TrustScore';
import ScoreInfo from './ScoreInfo';
import { OnboardingModal } from './OnboardingModal';
import { Testimonials } from './Testimonials';
import { FAQ } from './FAQ';

function Dashboard() {
  const app = useAppBridge();
  console.log("useAppBridge SUCCESS:", app);
  const fetch = useAuthenticatedFetch();
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    if (app) {
      console.log('App Bridge ready - checking embedded status');
      // Test ping
      fetch('/api/ping').then(r => r.json()).then(d => console.log("Ping success:", d)).catch(e => console.error("Ping failed:", e));
    }
  }, [app]);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  const loadDashboard = useCallback(async () => {
    try {
      console.log("Attempting to fetch dashboard");
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
      
      // Check if new user
      if (data.scanCount === 0 && !localStorage.getItem('onboardingCompleted')) {
          setShowOnboarding(true);
      }
    } catch (err) {
      console.error("API fetch failed:", err);
    }
  }, [fetch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleScan = async () => {
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
      const res = await fetch(`/api/billing/upgrade?plan=${plan}`);
      const data = await res.json();
      if (data.confirmationUrl) {
          window.open(data.confirmationUrl, '_top');
      }
  };

  if (!dashboardData) {
      return (
          <Page title="TrustScore Scanner">
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

  const { currentScore, trend, history, plan, scanCount } = dashboardData;
  const isFree = plan === 'FREE';

  const tabs = [
      { id: 'dashboard', content: 'Dashboard' },
      { id: 'help', content: 'Help & FAQ' },
  ];

  return (
    <Page 
        title="TrustScore Dashboard" 
        primaryAction={
            <Button variant="primary" onClick={handleScan} disabled={isFree && scanCount >= 1 && !scanError} loading={loading}>
                {scanCount === 0 ? 'Run Initial Scan' : 'Run New Scan'}
            </Button>
        }
    >
      <OnboardingModal 
        open={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
        onStartScan={handleStartOnboardingScan}
      />

      <Layout>
        <Layout.Section>
             <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />
        </Layout.Section>

        {selectedTab === 0 ? (
            <>
                {/* Alerts */}
                {trend < 0 && (
                    <Layout.Section>
                        <Banner tone="critical" title="Trust Score Dropped">
                            Your score dropped by {Math.abs(trend)} points since the last scan. Check the recommendations.
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
                            <p>You have used your free scan. Unlock unlimited scans and weekly monitoring.</p>
                        </CalloutCard>
                     </Layout.Section>
                )}

                {/* Stats Overview */}
                <Layout.Section>
                    <Card>
                        <InlineGrid columns={3} gap="400">
                            <BlockStack gap="200">
                                <Text tone="subdued">Current Score</Text>
                                <Text variant="heading3xl" as="h2">{currentScore}/100</Text>
                            </BlockStack>
                            <BlockStack gap="200">
                                <Text tone="subdued">Trend</Text>
                                <Text variant="headingLg" tone={trend >= 0 ? 'success' : 'critical'}>
                                    {trend > 0 ? '+' : ''}{trend} points
                                </Text>
                            </BlockStack>
                            <BlockStack gap="200">
                                <Text tone="subdued">Plan Usage</Text>
                                <Badge tone={isFree ? 'attention' : 'success'}>{plan}</Badge>
                                <Text variant="bodySm">{scanCount} scans run</Text>
                            </BlockStack>
                        </InlineGrid>
                    </Card>
                </Layout.Section>

                {/* Loading State for Scan */}
                {loading && !scanResult && (
                    <Layout.Section>
                        <Card>
                             <BlockStack gap="400" align="center">
                                 <Text variant="headingMd">Scanning your store...</Text>
                                 <SkeletonBodyText lines={5} />
                             </BlockStack>
                        </Card>
                    </Layout.Section>
                )}

                {/* Scan Result */}
                {scanResult && !loading && (
                    <Layout.Section>
                        <TrustScore result={scanResult} />
                    </Layout.Section>
                )}

                {/* History & Info */}
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
                                                <Text>{new Date(scan.createdAt).toLocaleDateString()}</Text>
                                                <Text fontWeight="bold" tone={scan.score > 80 ? 'success' : 'warning'}>{scan.score}/100</Text>
                                            </InlineGrid>
                                        ))}
                                    </BlockStack>
                                )}
                            </BlockStack>
                         </Card>
                         <Testimonials />
                     </BlockStack>
                </Layout.Section>
            </>
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
