import React, { useState, useCallback, useEffect } from 'react';
import { Card, Text, ProgressBar, BlockStack, List, Banner, InlineGrid, Box, Tooltip, Icon, Tabs, Button, Badge, Divider, InlineStack, EmptyState, Spinner, Toast } from '@shopify/polaris';
import { InfoIcon, ClockIcon, CashDollarIcon, WrenchIcon, MagicIcon, ArrowRightIcon, CheckIcon, XIcon, ShieldCheckMarkIcon } from '@shopify/polaris-icons';
import { trackEvent } from '../utils/analytics';
import AIAnalysis from './AIAnalysis';
import ScoreBreakdown from './ScoreBreakdown';
import FixRecommendations from './FixRecommendations';

function TrustScore({ result, plan, aiUsageCount, onUpgrade, revenueBracket, loading, onScan, shopData }) {
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const prevScoreRef = React.useRef(null);
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTab(selectedTabIndex),
    [],
  );

  useEffect(() => {
    if (result?.score) {
        if (prevScoreRef.current !== null && result.score > prevScoreRef.current) {
            setShowToast(true);
        }
        prevScoreRef.current = result.score;
    }
  }, [result]);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
           if (prev >= 98) return prev;
           return prev + 1; 
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
        setProgress(0);
    }
  }, [loading]);

  const getLoadingStatus = () => {
      if (progress < 25) return "Capturing screenshots...";
      if (progress < 50) return "Analyzing trust signals...";
      if (progress < 75) return "Calculating score...";
      return "Generating recommendations...";
  };

  // Helper to render analysis for a specific page type
  const renderAnalysis = (data, type) => {
      // Ensure recommendations is always an array
      const { score, screenshots, breakdown, data: rawData } = data;
      const recommendations = data.recommendations || [];
      
      return (
        <div className="fade-in-up">
        <BlockStack gap="800">
            <style>{`
                .fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
          {type === 'product' && rawData && (
             <Card>
                <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">Analyzed Product</Text>
                    {rawData.found ? (
                        <Text as="p">
                           <a href={rawData.url} target="_blank" rel="noopener noreferrer" style={{color: '#2C6ECB'}}>{rawData.url}</a>
                        </Text>
                    ) : (
                        <Banner tone="warning">Could not find a product page to analyze. Please ensure your homepage has visible links to products.</Banner>
                    )}
                </BlockStack>
             </Card>
          )}

          {/* New Lovable AI Analysis */}
          <AIAnalysis 
            analysis={data.aiAnalysis} 
            plan={plan} 
            aiUsageCount={aiUsageCount} 
            onUpgrade={onUpgrade} 
          />

          {/* New Lovable Score Breakdown */}
          <ScoreBreakdown breakdown={breakdown} />

          {/* New Lovable Recommendations */}
          <FixRecommendations 
            recommendations={recommendations} 
            revenueBracket={revenueBracket} 
            plan={plan} 
            shopDomain={shopData?.myshopify_domain || shopData?.domain}
          />

          {/* Screenshots Section */}
          {(screenshots || (rawData && rawData.screenshots)) && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">{type === 'homepage' ? 'Homepage' : 'Product Page'} Screenshots</Text>
                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                  {(screenshots?.desktop || rawData?.screenshots?.desktop) && (
                    <Box>
                      <Text variant="headingSm" as="h3">Desktop View</Text>
                      <img 
                        src={`data:image/png;base64,${screenshots?.desktop || rawData?.screenshots?.desktop}`} 
                        alt="Desktop View" 
                        style={{ width: '100%', height: 'auto', border: '1px solid #ccc', borderRadius: '4px', marginTop: '8px' }} 
                      />
                    </Box>
                  )}
                  {(screenshots?.mobile || rawData?.screenshots?.mobile) && (
                    <Box>
                      <Text variant="headingSm" as="h3">Mobile View</Text>
                      <div style={{ width: '375px', maxWidth: '100%', margin: '0 auto' }}>
                        <img 
                          src={`data:image/png;base64,${screenshots?.mobile || rawData?.screenshots?.mobile}`} 
                          alt="Mobile View" 
                          style={{ width: '100%', height: 'auto', border: '1px solid #ccc', borderRadius: '4px', marginTop: '8px' }} 
                        />
                      </div>
                    </Box>
                  )}
                </InlineGrid>
              </BlockStack>
            </Card>
          )}

          {/* Founder Trust Signal */}
          <Box paddingBlockStart="800" paddingBlockEnd="400">
              <Text variant="bodySm" tone="subdued" alignment="center">
                  Built by an independent founder. <br/>
                  Questions? I personally reply within 24 hours.
              </Text>
          </Box>
        </BlockStack>
        </div>
      );
  };

  if (loading) {
      return (
        <Card>
            <div style={{ padding: '2rem' }}>
                <BlockStack gap="400" align="center" inlineAlign="center">
                    <div style={{ animation: 'pulse 2s infinite' }}>
                        <Spinner size="large" />
                    </div>
                    <BlockStack gap="200" align="center" inlineAlign="center">
                        <Text variant="headingMd" as="h2">{getLoadingStatus()}</Text>
                        <Box width="300px">
                            <ProgressBar progress={progress} size="small" tone="primary" />
                        </Box>
                    </BlockStack>
                </BlockStack>
                <style>{`
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.6; }
                        100% { opacity: 1; }
                    }
                `}</style>
            </div>
        </Card>
      );
  }

  if (!plan) {
    return null; // prevents React crash during hydration
  }

  if (!result) {
      return (
        <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
            <Card roundedAbove="sm">
                <EmptyState
                    heading="Ready to audit your store's trust score?"
                    action={{
                        content: 'Run Your First Scan',
                        onAction: onScan,
                        size: 'large',
                        variant: 'primary'
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    footerContent={
                        <Text variant="bodySm" tone="subdued">Takes about 60 seconds • No credit card required</Text>
                    }
                >
                    <Text variant="bodyMd" as="p" tone="subdued">
                        Get a 0-100 score, identify trust gaps, and receive AI-powered recommendations in ~60 seconds
                    </Text>
                </EmptyState>
            </Card>
            <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
      );
  }

  // Handle new structured result (homepage/productPage) vs old flat result
  // If result.homepage exists, we treat it as structured, but we need to ensure AI Analysis is passed down
  const isNewStructure = result.homepage && (result.productPage || result.homepage.score);

  const tabs = [
    {
      id: 'homepage-analysis',
      content: 'Homepage Analysis',
      panelID: 'homepage-panel',
    },
    {
      id: 'product-analysis',
      content: 'Product Page Analysis',
      panelID: 'product-panel',
    },
  ];

  if (!isNewStructure) {
      // Ensure aiAnalysis is passed even if flat structure
      // We look for aiAnalysis at root, or nested in data
      const flatData = { 
          ...result, 
          aiAnalysis: result.aiAnalysis || result.data?.aiAnalysis 
      };
      return renderAnalysis(flatData, 'homepage');
  }

  // For structured results, we handle tab switching
  // But we need to ensure renderAnalysis gets the AI data which might be at root
  // We'll wrap the render logic to inject root AI data if missing in page data
  
  const renderPageAnalysis = (pageData, type) => {
      // Inject root aiAnalysis if pageData doesn't have it
      const dataWithAI = {
          ...pageData,
          aiAnalysis: pageData.aiAnalysis || result.aiAnalysis
      };
      return renderAnalysis(dataWithAI, type);
  };

  return (
    <div className="trust-score-root">
        {showToast && <Toast content="🎉 Score improved!" onDismiss={() => setShowToast(false)} />}
        <BlockStack gap="800">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <Box paddingBlockStart="400">
                {selectedTab === 0 
                    ? renderPageAnalysis(result.homepage, 'homepage') 
                    : renderPageAnalysis(result.productPage, 'product')
                }
            </Box>
            </Tabs>
        </BlockStack>
    </div>
  );
}

export default TrustScore;