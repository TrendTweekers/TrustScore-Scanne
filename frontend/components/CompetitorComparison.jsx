import React, { useState, useEffect, useCallback } from 'react';
import { Card, Text, TextField, Button, BlockStack, InlineGrid, Banner, List, Box, ProgressBar, Divider, Spinner, Link, Badge } from '@shopify/polaris';
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

            <div style={{ position: 'relative', filter: 'blur(6px)', userSelect: 'none', opacity: 0.6 }}>
                <Card>
                    <BlockStack gap="500">
                        <Text variant="headingLg">Comparison Result</Text>
                        <Box background="bg-surface-warning" padding="500" borderRadius="200">
                            <BlockStack gap="200" align="center">
                                <Text variant="headingLg" tone="caution">Trust Gap: 12 Points</Text>
                                <Text>Your store: 65 | Competitor: 77</Text>
                            </BlockStack>
                        </Box>
                        <InlineGrid columns={{ xs: 1, sm: 2 }} gap="800">
                             <BlockStack gap="400">
                                <Text variant="headingMd">Your Store</Text>
                                <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                    <Text variant="heading3xl">65/100</Text>
                                </Box>
                             </BlockStack>
                             <BlockStack gap="400">
                                <Text variant="headingMd">Competitor</Text>
                                <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                    <Text variant="heading3xl">77/100</Text>
                                </Box>
                             </BlockStack>
                        </InlineGrid>
                    </BlockStack>
                </Card>
            </div>
            
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, textAlign: 'center', width: '100%', maxWidth: '400px' }}>
                <Card>
                    <BlockStack gap="400" align="center">
                        <Text variant="headingMd">Unlock Competitive Intelligence</Text>
                        <Text alignment="center">
                            See exactly why competitors are beating you. Get a full breakdown of their trust score and copy their winning strategies.
                        </Text>
                        <Button variant="primary" onClick={() => window.open('/?billing=upgrade', '_top')}>
                            Upgrade to Pro to Unlock
                        </Button>
                    </BlockStack>
                </Card>
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
                    <div style={{ fontSize: '48px' }}>🕵️‍♂️</div>
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
                                    <BlockStack gap="200" align="center">
                                        <Text variant="headingXl" tone="critical">
                                            CRITICAL GAP: {gapValue} POINTS
                                        </Text>
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
                                        <Text variant="headingLg" tone="caution">
                                            Trust Gap: {gapValue} Points
                                        </Text>
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
                                        <Text variant="headingXl" tone="success">
                                            YOU ARE LEADING BY {gapValue} POINTS
                                        </Text>
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

                        {/* Competitor Store */}
                        <BlockStack gap="400">
                            <Text variant="headingMd">Competitor</Text>
                            <Text tone="subdued" variant="bodySm">{selectedScan.url || selectedScan.competitor_url}</Text>
                            <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                <BlockStack gap="200" align="center">
                                    <Text variant="heading3xl">{selectedScan.score}/100</Text>
                                    <ProgressBar progress={selectedScan.score} size="small" tone={selectedScan.score > 80 ? 'success' : 'warning'} />
                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </InlineGrid>
                    
                    <Divider />

                    {(() => {
                        const parseResult = (r) => {
                            if (!r) return null;
                            if (typeof r === 'string') {
                                try { return JSON.parse(r); } catch(e) { return null; }
                            }
                            return r;
                        };
                        
                        const myResult = parseResult(myLatestScan?.result);
                        const compResult = parseResult(selectedScan?.result);
                        
                        // Align factors
                        const myFactors = myResult?.breakdown || [];
                        const compFactors = compResult?.breakdown || [];
                        
                        // Merge by label if we have data, otherwise just show competitor data
                        // If myFactors is empty (e.g. legacy data), we can't do gap analysis properly
                        const factors = compFactors.map(f => {
                            const myF = myFactors.find(m => m.label === f.label) || { score: 0 };
                            return {
                                label: f.label,
                                myScore: myF.score,
                                compScore: f.score,
                                max: f.maxScore || 10,
                                gap: f.score - myF.score // Positive means competitor is better
                            };
                        });
                        
                        // Top 3 Gap Drivers (where I am losing most)
                        const drivers = [...factors]
                            .filter(f => f.gap > 0)
                            .sort((a, b) => b.gap - a.gap)
                            .slice(0, 3);
                            
                        return (
                            <BlockStack gap="600">
                                {/* Top 3 Drivers */}
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd">Top 3 Gap Drivers</Text>
                                        <Text tone="subdued">The competitor is beating you most in these areas:</Text>
                                        {drivers.length > 0 ? (
                                            <List type="number">
                                                {drivers.map((d, i) => (
                                                    <List.Item key={i}>
                                                        <Text fontWeight="bold">{d.label}</Text> (They are +{d.gap} points ahead)
                                                    </List.Item>
                                                ))}
                                            </List>
                                        ) : (
                                            <Text tone="success">You are leading or tied in all factors!</Text>
                                        )}
                                        
                                        {drivers.length > 0 && (
                                            <Banner tone="info">
                                                 <Text>
                                                    To close the gap fastest, <Link onClick={() => {
                                                        const el = document.getElementById('recommendations-section');
                                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                    }}>fix these items first</Link>.
                                                 </Text>
                                            </Banner>
                                        )}
                                    </BlockStack>
                                </Card>

                                {/* Full Breakdown */}
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd">Trust Gap Breakdown</Text>
                                        <BlockStack gap="200">
                                            <InlineGrid columns={['oneHalf', 'oneQuarter', 'oneQuarter']} gap="200">
                                                 <Text fontWeight="bold" tone="subdued">Factor</Text>
                                                 <Text fontWeight="bold" tone="subdued" align="end">You</Text>
                                                 <Text fontWeight="bold" tone="subdued" align="end">Competitor</Text>
                                            </InlineGrid>
                                            <Divider />
                                            {factors.map((f, i) => (
                                                <Box key={i} paddingBlockStart="300" paddingBlockEnd="300">
                                                    <InlineGrid columns={['oneHalf', 'oneQuarter', 'oneQuarter']} gap="400" alignItems="center">
                                                        <BlockStack gap="100">
                                                            <Text fontWeight="bold">{f.label}</Text>
                                                            {f.gap > 0 && <Text tone="critical" variant="bodyXs">-{f.gap} pts gap</Text>}
                                                        </BlockStack>
                                                        
                                                        <BlockStack gap="100" align="end">
                                                            <Text fontWeight="bold">{f.myScore}/{f.max}</Text>
                                                            <ProgressBar progress={(f.myScore / f.max) * 100} size="small" tone={f.myScore >= f.max ? 'success' : 'critical'} />
                                                        </BlockStack>
                                                        
                                                        <BlockStack gap="100" align="end">
                                                            <Text fontWeight="bold">{f.compScore}/{f.max}</Text>
                                                            <ProgressBar progress={(f.compScore / f.max) * 100} size="small" tone={f.compScore >= f.max ? 'success' : 'critical'} />
                                                        </BlockStack>
                                                    </InlineGrid>
                                                </Box>
                                            ))}
                                        </BlockStack>
                                    </BlockStack>
                                </Card>
                                
                                {/* AI Analysis (Locked or Shown) */}
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd">Competitor Insights (AI)</Text>
                                        {compResult?.aiAnalysis ? (
                                            <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                                <BlockStack gap="200">
                                                    <Text fontWeight="bold">AI Assessment</Text>
                                                    <Text>{compResult.aiAnalysis.assessment}</Text>
                                                </BlockStack>
                                            </Box>
                                        ) : (
                                            <Banner tone="warning">AI analysis not available for this scan.</Banner>
                                        )}
                                    </BlockStack>
                                </Card>
                            </BlockStack>
                        );
                    })()}
                    </>
                    )}
                </BlockStack>
            </Card>
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
