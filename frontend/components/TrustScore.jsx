import React, { useState, useCallback } from 'react';
import { Card, Text, ProgressBar, BlockStack, List, Banner, InlineGrid, Box, Tooltip, Icon, Tabs, Button } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';

function TrustScore({ result, plan, onUpgrade }) {
  // result can be the old structure OR the new structure { homepage, productPage }
  // We normalize it here
  const isNewStructure = result.homepage && result.productPage;
  
  const isPro = plan === "PRO" || plan === "PLUS";
  console.log("PLAN:", plan);
  
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = useCallback(
    (selectedTabIndex) => setSelectedTab(selectedTabIndex),
    [],
  );

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

  // Helper to render analysis for a specific page type
  const renderAnalysis = (data, type) => {
      const { score, recommendations, screenshots, breakdown, data: rawData } = data;
      
      const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
          case 'high': return 'critical';
          case 'medium': return 'warning';
          case 'low': return 'success';
          default: return 'info';
        }
      };

      const getTooltipContent = (category) => {
        const cat = category.toLowerCase();
        if (cat.includes('badge')) return "Baymard: 18% avg lift when visible above fold";
        if (cat.includes('contact') || cat.includes('page')) return "Nielsen: 44% won't buy without visible contact";
        if (cat.includes('ssl') || cat.includes('technical')) return "GlobalSign: 84% abandon without HTTPS";
        if (cat.includes('review')) return "BrightLocal: 88% trust online reviews as personal recommendations";
        if (cat.includes('image')) return "MDG: 67% of consumers say image quality is 'very important'";
        if (cat.includes('return')) return "Invesp: 67% of shoppers check returns page before buying";
        return "Trust signal impacting conversion rates";
      };

      return (
        <BlockStack gap="500">
          {type === 'product' && rawData && (
             <Card>
                <BlockStack gap="200">
                    <Text variant="headingMd" as="h3">Analyzed Product</Text>
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

          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">{type === 'homepage' ? 'Homepage' : 'Product Page'} Trust Score: {score}/100</Text>
              <ProgressBar progress={score} size="large" tone={score > 80 ? 'success' : score > 50 ? 'warning' : 'critical'} />
              
              <InlineGrid columns={3} gap="400">
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued">Your Score</Text>
                  <Text variant="headingMd">{score}/100</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued">Industry Avg</Text>
                  <Text variant="headingMd">62/100</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued">Top Performers</Text>
                  <Text variant="headingMd">85+/100</Text>
                </BlockStack>
              </InlineGrid>
            </BlockStack>
          </Card>

          {/* AI Analysis Section (Pro/Plus Only) */}
          {(data.aiAnalysis || isPro) ? (
             <Card>
                <BlockStack gap="400">
                   <InlineGrid columns="auto auto" gap="200" alignItems="center">
                       <Icon source={InfoIcon} tone="magic" />
                       <Text variant="headingMd" as="h3">AI Qualitative Analysis (Claude)</Text>
                   </InlineGrid>
                   
                   <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                      <InlineGrid columns={2} gap="400">
                          <BlockStack gap="200">
                             <Text fontWeight="bold">Design Professionalism</Text>
                             <Text variant="headingXl" tone="magic">{data.aiAnalysis?.designScore || '-'}/10</Text>
                          </BlockStack>
                          <BlockStack gap="200">
                             <Text fontWeight="bold">Niche Comparison</Text>
                             <Text tone="subdued">{data.aiAnalysis?.nicheComparison || 'Pending analysis...'}</Text>
                          </BlockStack>
                      </InlineGrid>
                   </Box>

                   <BlockStack gap="200">
                      <Text fontWeight="bold">Assessment</Text>
                      <Text as="p">{data.aiAnalysis?.assessment || 'Analysis will appear here after your next scan.'}</Text>
                   </BlockStack>

                   <BlockStack gap="200">
                      <Text fontWeight="bold">Top 3 Priority Fixes</Text>
                      <List type="number">
                          {data.aiAnalysis?.priorityFixes ? data.aiAnalysis.priorityFixes.map((fix, i) => (
                              <List.Item key={i}>{fix}</List.Item>
                          )) : <List.Item>No fixes identified yet.</List.Item>}
                      </List>
                   </BlockStack>
                </BlockStack>
             </Card>
          ) : (
             // Upsell for Free Plan users (only show on homepage tab to avoid clutter)
             !isPro && type === 'homepage' && (
                 <div 
                    onClick={onUpgrade}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onUpgrade(); }}
                 >
                    <Card>
                       <BlockStack gap="400">
                          <InlineGrid columns="auto auto" gap="200" alignItems="center">
                              <Icon source={InfoIcon} tone="subdued" />
                              <Text variant="headingMd" as="h3" tone="subdued">AI Qualitative Analysis</Text>
                          </InlineGrid>
                          <Banner tone="info">
                              <BlockStack gap="300">
                                  <Text as="p" fontWeight="bold">Unlock AI Insights</Text>
                                  <Text as="p">Upgrade to <strong>Pro</strong> to get qualitative design analysis, copy review, and personalized fixes from Claude AI.</Text>
                                  <Box>
                                      <Button variant="primary" onClick={(e) => {
                                          e.stopPropagation();
                                          onUpgrade();
                                      }}>
                                          Upgrade to Pro ($19/mo)
                                      </Button>
                                  </Box>
                              </BlockStack>
                          </Banner>
                       </BlockStack>
                    </Card>
                 </div>
             )
          )}

          {/* Score Breakdown Section */}
          {breakdown && breakdown.length > 0 && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Score Breakdown</Text>
                <List type="bullet">
                  {breakdown.map((item, index) => (
                    <List.Item key={index}>
                      <InlineGrid columns="auto auto" gap="200" alignItems="center">
                        <Text as="span" color={item.passed ? 'success' : 'critical'}>
                          {item.passed ? '✓' : '✗'} 
                        </Text>
                        <Box>
                          <Tooltip content={getTooltipContent(item.category)} dismissOnMouseOut>
                             <Text as="span" fontWeight="bold">
                               <span style={{ textDecoration: 'underline', cursor: 'help' }}>{item.category}:</span>
                             </Text>
                          </Tooltip>
                          {' '}
                          <Text as="span">{item.points}/{item.maxPoints} points</Text>
                        </Box>
                      </InlineGrid>
                    </List.Item>
                  ))}
                </List>
              </BlockStack>
            </Card>
          )}

          {/* Recommendations Section */}
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h3">Recommendations</Text>
              {recommendations.length === 0 ? (
                <Banner tone="success">Great job! No critical issues found.</Banner>
              ) : (
                <BlockStack gap="300">
                  {recommendations.map((rec, index) => (
                    <Banner key={index} tone={getPriorityColor(rec.priority)}>
                      <BlockStack gap="200">
                        <Text fontWeight="bold" as="h3">
                          [{rec.priority ? rec.priority.toUpperCase() : 'MEDIUM'}] {rec.issue}
                        </Text>
                        <InlineGrid columns={3} gap="400">
                           <Text tone="subdued">Impact: <Text as="span" fontWeight="bold">{rec.impact}</Text></Text>
                           <Text tone="subdued">Effort: <Text as="span" fontWeight="bold">{rec.effort}</Text></Text>
                           <Text tone="subdued">Cost: <Text as="span" fontWeight="bold">{rec.estimatedCost}</Text></Text>
                        </InlineGrid>
                        <Box paddingBlockStart="200">
                          <Text fontWeight="bold">How to fix:</Text>
                          <Text as="p" style={{ whiteSpace: 'pre-line' }}>{rec.howToFix}</Text>
                        </Box>
                        {rec.resourceLinks && rec.resourceLinks.length > 0 && (
                          <Box paddingBlockStart="200">
                            <Text fontWeight="bold">Resources:</Text>
                            <List>
                              {rec.resourceLinks.map((link, i) => (
                                 <List.Item key={i}>
                                   <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#2C6ECB', textDecoration: 'underline' }}>
                                     {link}
                                   </a>
                                 </List.Item>
                              ))}
                            </List>
                          </Box>
                        )}
                      </BlockStack>
                    </Banner>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>

          {/* Screenshots Section */}
          {(screenshots || (rawData && rawData.screenshots)) && (
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">{type === 'homepage' ? 'Homepage' : 'Product Page'} Screenshots</Text>
                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                  {(screenshots?.desktop || rawData?.screenshots?.desktop) && (
                    <Box>
                      <Text variant="bodyMd" as="p" fontWeight="bold">Desktop View</Text>
                      <img 
                        src={`data:image/png;base64,${screenshots?.desktop || rawData?.screenshots?.desktop}`} 
                        alt="Desktop View" 
                        style={{ width: '100%', height: 'auto', border: '1px solid #ccc', borderRadius: '4px', marginTop: '8px' }} 
                      />
                    </Box>
                  )}
                  {(screenshots?.mobile || rawData?.screenshots?.mobile) && (
                    <Box>
                      <Text variant="bodyMd" as="p" fontWeight="bold">Mobile View</Text>
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
        </BlockStack>
      );
  };

  if (!isNewStructure) {
      // Fallback for old data structure if needed, or just treat as homepage
      return renderAnalysis(result, 'homepage');
  }

  return (
    <BlockStack gap="500">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
           <Box paddingBlockStart="400">
             {selectedTab === 0 ? renderAnalysis(result.homepage, 'homepage') : renderAnalysis(result.productPage, 'product')}
           </Box>
        </Tabs>
    </BlockStack>
  );
}

export default TrustScore;
