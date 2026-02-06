import React, { useState, useEffect, useCallback } from 'react';
import { Card, Text, TextField, Button, BlockStack, InlineGrid, Banner, List, Box, ProgressBar, Divider, Spinner } from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export function CompetitorComparison({ userPlan, myLatestScore }) {
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

    try {
        const res = await fetch('/api/scanner/external', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.message || data.error || 'Scan failed');
        }

        // Add to list and select it
        setScans([data, ...scans]);
        setSelectedScan(data);
        setUrl('');
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  if (userPlan === 'FREE') {
      return (
          <Card>
              <BlockStack gap="400">
                  <Text variant="headingMd">Trust Gap Analysis</Text>
                  <Banner tone="info" title="Pro Feature">
                      Upgrade to Pro to audit competitor stores and see how you stack up.
                  </Banner>
              </BlockStack>
          </Card>
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

                <InlineGrid columns={['twoThirds', 'oneThird']} gap="400" alignItems="end">
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

                    <InlineGrid columns={2} gap="800">
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

                    <BlockStack gap="400">
                        <Text variant="headingMd">Competitor Insights</Text>
                        {(() => {
                            let parsedResult;
                            const result = selectedScan.result;

                            if (typeof result === 'string') {
                                try {
                                    parsedResult = JSON.parse(result);
                                } catch (e) {
                                    console.error("JSON Parse Error:", e);
                                    parsedResult = null;
                                }
                            } else {
                                parsedResult = result;
                            }

                            if (!parsedResult) {
                                return (
                                    <Banner tone="warning">
                                        Competitor analysis could not be displayed.
                                    </Banner>
                                );
                            }

                            if (parsedResult.aiAnalysis) {
                                return (
                                    <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                                        <BlockStack gap="200">
                                            <Text fontWeight="bold">AI Assessment</Text>
                                            <Text>{parsedResult.aiAnalysis.assessment}</Text>
                                        </BlockStack>
                                    </Box>
                                );
                            }
                            return <Text tone="subdued">No detailed AI insights available for this audit.</Text>;
                        })()}
                    </BlockStack>
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
