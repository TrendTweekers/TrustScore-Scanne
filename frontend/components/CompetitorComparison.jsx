import React, { useState, useEffect, useCallback } from 'react';
import { Card, Text, TextField, Button, BlockStack, InlineGrid, Banner, List, Box, ProgressBar, Divider, Spinner, Link, Badge, Icon } from '@shopify/polaris';
import { SearchIcon, ChartVerticalIcon, ShieldCheckMarkIcon } from '@shopify/polaris-icons';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { trackEvent } from '../utils/analytics';

export function CompetitorComparison({ userPlan, myLatestScore, shopData, myLatestScan }) {
  const fetch = useAuthenticatedFetch();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);

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
             const msg = "Please enter a real Shopify storefront domain (e.g. brand.com). Avoid shopify.com marketing or admin sites.";
             setError(msg);
             setLoading(false);
             trackEvent('competitor_scan_failed', { reason: 'blocked_domain', url: cleanUrl });
             return;
        }
        
        // Self-check
        if (shopData && (shopData.domain === hostname || shopData.myshopify_domain === hostname)) {
             const msg = "You are scanning your own store. Use the Dashboard to audit your store.";
             setError(msg);
             setLoading(false);
             trackEvent('competitor_scan_failed', { reason: 'self_scan', url: cleanUrl });
             return;
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
    } finally {
        setLoading(false);
    }
  };

  // Helper to get breakdown item
  const getMyBreakdownItem = (category) => {
      if (!myLatestScan || !myLatestScan.result || !myLatestScan.result.breakdown) return null;
      return myLatestScan.result.breakdown.find(b => b.category === category);
  };

  if (userPlan === 'FREE') {
      return (
          <BlockStack gap="800">
            <Card>
                <BlockStack gap="400">
                    <Text variant="headingMd">Trust Gap Analysis</Text>
                    <Text as="p" tone="subdued">
                        Compare your trust score against any competitor to see exactly where you're losing customers.
                    </Text>
                    
                    <InlineGrid columns={{ xs: 1, sm: ['twoThirds', 'oneThird'] }} gap="400" alignItems="end">
                        <TextField 
                            label="Competitor URL" 
                            disabled 
                            placeholder="https://competitor-store.com" 
                            autoComplete="off"
                        />
                        <Button disabled>Run Competitor Audit</Button>
                    </InlineGrid>
                </BlockStack>
            </Card>

            <div style={{ position: 'relative' }}>
                <div style={{ filter: 'blur(8px)', userSelect: 'none', opacity: 0.5, pointerEvents: 'none' }}>
                    <Card>
                        <BlockStack gap="500">
                            <Text variant="headingLg">Comparison Result</Text>
                            <Box background="bg-surface-critical" padding="500" borderRadius="200">
                                <BlockStack gap="200" align="center">
                                    <Text variant="headingLg" tone="critical">CRITICAL GAP: 24 POINTS</Text>
                                    <Text>Your store: 53 | Competitor: 77</Text>
                                </BlockStack>
                            </Box>
                            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="800">
                                 <BlockStack gap="400">
                                    <Text variant="headingMd">Your Store</Text>
                                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                        <Text variant="heading3xl">53/100</Text>
                                    </Box>
                                 </BlockStack>
                                 <BlockStack gap="400">
                                    <Text variant="headingMd">Competitor</Text>
                                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                        <Text variant="heading3xl">77/100</Text>
                                    </Box>
                                 </BlockStack>
                            </InlineGrid>
                            <Text variant="headingMd">Trust Breakdown</Text>
                            <BlockStack gap="300">
                                <Box padding="300" background="bg-surface-secondary"><Text>Trust Badges: You 0/25 vs Them 25/25</Text></Box>
                                <Box padding="300" background="bg-surface-secondary"><Text>Security: You 10/20 vs Them 20/20</Text></Box>
                                <Box padding="300" background="bg-surface-secondary"><Text>Social Proof: You 5/15 vs Them 12/15</Text></Box>
                            </BlockStack>
                        </BlockStack>
                    </Card>
                </div>
                
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, textAlign: 'center', width: '90%', maxWidth: '500px' }}>
                    <Card>
                        <BlockStack gap="400" align="center">
                            <InlineGrid gap="200" align="center">
                                <Icon source={SearchIcon} tone="magic" />
                                <Text variant="headingLg">Unlock Competitive Intelligence</Text>
                            </InlineGrid>
                            <Text alignment="center" as="p">
                                See exactly why competitors are beating you. Get a full breakdown of their trust score, AI-detected winning strategies, and estimated revenue gaps.
                            </Text>
                            <Box paddingBlockStart="200">
                                <Button size="large" variant="primary" onClick={() => window.open('/?billing=upgrade', '_top')}>
                                    Upgrade to Pro to Unlock
                                </Button>
                            </Box>
                            <Text variant="bodySm" tone="subdued">Starting at $19/mo. Cancel anytime.</Text>
                        </BlockStack>
                    </Card>
                </div>
            </div>
          </BlockStack>
      );
  }

  return (
    <BlockStack gap="800">
        <Card>
            <BlockStack gap="400">
                <Text variant="headingMd">Trust Gap Analysis</Text>
                <Text as="p">
                    Compare your trust score against any competitor. 
                    <Text as="span" tone="subdued"> ({scans.length}/{limit} audits used)</Text>
                </Text>

                <InlineGrid columns={{ xs: 1, sm: ['twoThirds', 'oneThird'] }} gap="400" alignItems="end">
                    <TextField 
                        label="Competitor URL" 
                        value={url} 
                        onChange={setUrl} 
                        placeholder="https://competitor-store.com" 
                        autoComplete="off"
                        disabled={loading || scans.length >= limit}
                    />
                    <Button 
                        variant="primary" 
                        onClick={handleScan} 
                        loading={loading}
                        disabled={!url || loading || scans.length >= limit}
                    >
                        Run Competitor Audit
                    </Button>
                </InlineGrid>

                {error && (
                    <Banner tone="critical">{error}</Banner>
                )}
            </BlockStack>
        </Card>

        {loading && (
             <Card>
                 <BlockStack gap="400" align="center">
                     <Spinner size="large" />
                     <Text>Running Competitor Audit...</Text>
                 </BlockStack>
             </Card>
        )}

        {!selectedScan && !loading && scans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.7 }}>
                <BlockStack gap="400" align="center">
                    <Box padding="400" background="bg-surface-secondary" borderRadius="full">
                        <Icon source={SearchIcon} tone="subdued" />
                    </Box>
                    <Text variant="headingLg" tone="subdued">No Competitor Audits Yet</Text>
                    <Text as="p" tone="subdued">
                        Enter a competitor's URL above to see how their TrustScore compares to yours.
                        <br />
                        Find out exactly why they might be converting better.
                    </Text>
                </BlockStack>
            </div>
        )}

        {selectedScan && !loading && (
            <BlockStack gap="600">
            <Card>
                <BlockStack gap="500">
                    <Text variant="headingLg" as="h3">Comparison Result</Text>
                    
                    {!selectedScan.score ? (
                        <Banner tone="warning">Invalid audit data. Please try again.</Banner>
                    ) : (
                    <>
                    {/* TRUST GAP CARD */}
                    {(() => {
                        const gap = selectedScan.score - myLatestScore;
                        const isLosing = gap > 0;
                        const gapValue = Math.abs(gap);
                        
                        if (gap > 25) {
                            return (
                                <Box background="bg-surface-critical" padding="500" borderRadius="200" borderWidth="1" borderColor="border-critical">
                                    <BlockStack gap="400" align="center">
                                        <InlineGrid columns="auto auto" gap="300" alignItems="center">
                                            <Icon source={ShieldCheckMarkIcon} tone="critical" />
                                            <Text variant="headingXl" tone="critical">
                                                CRITICAL GAP: {gapValue} POINTS
                                            </Text>
                                        </InlineGrid>
                                        <Text variant="bodyLg" fontWeight="bold" tone="critical">
                                            ⚠️ You are losing ~14% market share to this competitor due to lower Trust.
                                        </Text>
                                    </BlockStack>
                                </Box>
                            );
                        } else if (isLosing) {
                            return (
                                <Box background="bg-surface-warning" padding="500" borderRadius="200" borderWidth="1" borderColor="border-warning">
                                    <BlockStack gap="200" align="center">
                                        <InlineGrid columns="auto auto" gap="300" alignItems="center">
                                             <Icon source={ChartVerticalIcon} tone="caution" />
                                             <Text variant="headingLg" tone="caution">
                                                 Trust Gap: {gapValue} Points
                                             </Text>
                                        </InlineGrid>
                                        <Text variant="bodyMd">
                                            Your store: {myLatestScore} | Competitor: {selectedScan.score}
                                        </Text>
                                    </BlockStack>
                                </Box>
                            );
                        } else {
                            return (
                                <Box background="bg-surface-success" padding="500" borderRadius="200" borderWidth="1" borderColor="border-success">
                                    <BlockStack gap="200" align="center">
                                        <InlineGrid columns="auto auto" gap="300" alignItems="center">
                                             <Icon source={ShieldCheckMarkIcon} tone="success" />
                                             <Text variant="headingXl" tone="success">
                                                 YOU ARE LEADING BY {gapValue} POINTS
                                             </Text>
                                        </InlineGrid>
                                        <Text variant="bodyMd" fontWeight="bold">
                                            Your store: {myLatestScore} | Competitor: {selectedScan.score}
                                        </Text>
                                        <Text tone="success" fontWeight="bold">
                                            🔥 Your trust score is higher! Keep optimizing to maintain your lead.
                                        </Text>
                                    </BlockStack>
                                </Box>
                            );
                        }
                    })()}

                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="800">
                        {/* My Store */}
                        <BlockStack gap="400">
                            <Text variant="headingMd">Your Store</Text>
                            <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                <BlockStack gap="200" align="center">
                                    <Text variant="heading3xl">{myLatestScore}/100</Text>
                                    <ProgressBar progress={myLatestScore} size="small" tone={myLatestScore > 80 ? 'success' : 'warning'} />
                                </BlockStack>
                            </Box>
                        </BlockStack>
                        {/* Competitor */}
                        <BlockStack gap="400">
                            <Text variant="headingMd">Competitor</Text>
                            <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                <BlockStack gap="200" align="center">
                                    <Text variant="heading3xl">{selectedScan.score}/100</Text>
                                    <ProgressBar progress={selectedScan.score} size="small" tone={selectedScan.score > 80 ? 'success' : 'warning'} />
                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </InlineGrid>

                    <Divider />
                    
                    {/* TRUST GAP BREAKDOWN */}
                    <Text variant="headingLg">Trust Gap Breakdown</Text>
                    <BlockStack gap="400">
                        {selectedScan.result && selectedScan.result.breakdown && selectedScan.result.breakdown.map((item, index) => {
                            const myItem = getMyBreakdownItem(item.category);
                            const myPoints = myItem ? myItem.points : 0;
                            const compPoints = item.points;
                            const diff = compPoints - myPoints;
                            
                            return (
                                <Box key={index} padding="400" background="bg-surface-secondary" borderRadius="200">
                                    <BlockStack gap="200">
                                        <InlineGrid columns="1fr auto" alignItems="center">
                                            <Text variant="headingSm">{item.category}</Text>
                                            {diff > 0 ? (
                                                <Badge tone="critical">You lost {diff} pts</Badge>
                                            ) : diff < 0 ? (
                                                <Badge tone="success">You won {Math.abs(diff)} pts</Badge>
                                            ) : (
                                                <Badge tone="info">Tie</Badge>
                                            )}
                                        </InlineGrid>
                                        
                                        {/* Comparison Bars */}
                                        <BlockStack gap="200">
                                            <InlineGrid columns="80px 1fr 60px" alignItems="center" gap="200">
                                                <Text variant="bodySm" tone="subdued">You</Text>
                                                <ProgressBar progress={(myPoints / item.maxPoints) * 100} tone={myPoints === item.maxPoints ? 'success' : 'critical'} size="small" />
                                                <Text variant="bodySm" fontWeight="bold">{myPoints}/{item.maxPoints}</Text>
                                            </InlineGrid>
                                            <InlineGrid columns="80px 1fr 60px" alignItems="center" gap="200">
                                                <Text variant="bodySm" tone="subdued">Them</Text>
                                                <ProgressBar progress={(compPoints / item.maxPoints) * 100} tone={compPoints === item.maxPoints ? 'success' : 'critical'} size="small" />
                                                <Text variant="bodySm" fontWeight="bold">{compPoints}/{item.maxPoints}</Text>
                                            </InlineGrid>
                                        </BlockStack>
                                    </BlockStack>
                                </Box>
                            );
                        })}
                    </BlockStack>

                    </>
                    )}
                </BlockStack>
            </Card>

            {/* AI ASSESSMENT CARD */}
            {selectedScan.aiAnalysis && (
                <Card>
                    <BlockStack gap="400">
                        <InlineGrid columns="auto 1fr" gap="400" alignItems="center">
                             <Box background="bg-surface-magic" padding="200" borderRadius="100">
                                <Icon source={SearchIcon} tone="magic" />
                             </Box>
                             <BlockStack gap="100">
                                <Text variant="headingLg">AI Competitor Intelligence</Text>
                                <Text tone="subdued">Powered by Claude 3.5 Sonnet</Text>
                             </BlockStack>
                        </InlineGrid>
                        
                        <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                            <BlockStack gap="400">
                                <Text variant="headingSm">Why They Score Higher:</Text>
                                <Text variant="bodyLg" as="p">
                                    {selectedScan.aiAnalysis.assessment || "No detailed assessment available."}
                                </Text>
                                
                                {(selectedScan.aiAnalysis.keyDifferences || selectedScan.aiAnalysis.priorityFixes) && (
                                    <>
                                    <Divider />
                                    <Text variant="headingSm">Winning Strategies (Copy These):</Text>
                                    <List type="bullet">
                                        {(selectedScan.aiAnalysis.keyDifferences || selectedScan.aiAnalysis.priorityFixes).map((fix, i) => (
                                            <List.Item key={i}>
                                                <Text as="span" fontWeight="bold">{fix}</Text>
                                            </List.Item>
                                        ))}
                                    </List>
                                    </>
                                )}
                            </BlockStack>
                        </Box>
                    </BlockStack>
                </Card>
            )}
            </BlockStack>
        )}

        {scans.length > 0 && (
            <Card>
                <BlockStack gap="400">
                    <Text variant="headingMd">Audit History</Text>
                    <List>
                        {scans.map((scan, i) => (
                            <List.Item key={i}>
                                <InlineGrid columns={3} gap="400" alignItems="center">
                                    <Text fontWeight="bold">{scan.competitor_url || scan.url}</Text>
                                    <Text tone={scan.score > 80 ? 'success' : 'warning'}>Score: {scan.score}/100</Text>
                                    <Button variant="plain" onClick={() => setSelectedScan(scan)}>View Comparison</Button>
                                </InlineGrid>
                            </List.Item>
                        ))}
                    </List>
                </BlockStack>
            </Card>
        )}
    </BlockStack>
  );
}
