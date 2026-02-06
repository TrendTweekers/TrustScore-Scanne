import React, { useState, useCallback, useEffect } from 'react';
import { Card, Text, ProgressBar, BlockStack, List, Banner, InlineGrid, Box, Tooltip, Icon, Tabs, Button, Badge, Divider } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import { trackEvent } from '../utils/analytics';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function TrustScore({ result, plan, aiUsageCount, onUpgrade }) {
  if (!plan) {
    return null; // prevents React crash during hydration
  }

  // result can be the old structure OR the new structure { homepage, productPage }
  // We normalize it here
  const isNewStructure = result.homepage && result.productPage;
  
  const isFree = plan === 'FREE';
  const isPro = plan === 'PRO';
  const isPlus = plan === 'PLUS';
  
  console.log("PLAN:", plan);
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

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

      const getFixMetadata = (issueText) => {
        const text = issueText.toLowerCase();
        let meta = { time: '15 mins', difficulty: 'Medium', impact: 'Medium', lift: '+3–7%', revenue: '$500–$1.5k/mo' };

        if (text.includes('ssl') || text.includes('https')) {
            meta = { time: '5 mins', difficulty: 'Easy', impact: 'High', lift: '+12–18%', revenue: '$1.2k–$3.5k/mo' };
        } else if (text.includes('favicon')) {
            meta = { time: '2 mins', difficulty: 'Easy', impact: 'Medium', lift: '+2–5%', revenue: '$200–$800/mo' };
        } else if (text.includes('contact')) {
            meta = { time: '10 mins', difficulty: 'Easy', impact: 'High', lift: '+6–11%', revenue: '$1.8k–$4.2k/mo' };
        } else if (text.includes('policy') || text.includes('refund') || text.includes('return')) {
            meta = { time: '15 mins', difficulty: 'Medium', impact: 'High', lift: '+5–9%', revenue: '$800–$2.1k/mo' };
        } else if (text.includes('about')) {
            meta = { time: '20 mins', difficulty: 'Medium', impact: 'Medium', lift: '+3–6%', revenue: '$400–$1.2k/mo' };
        } else if (text.includes('social')) {
            meta = { time: '5 mins', difficulty: 'Easy', impact: 'Low', lift: '+2–4%', revenue: '$150–$600/mo' };
        } else if (text.includes('broken link') || text.includes('404')) {
            meta = { time: '10 mins', difficulty: 'Medium', impact: 'Medium', lift: '+4–8%', revenue: '$600–$1.8k/mo' };
        } else if (text.includes('image') || text.includes('quality')) {
            meta = { time: '30 mins', difficulty: 'Hard', impact: 'High', lift: '+10–14%', revenue: '$1.1k–$2.9k/mo' };
        } else if (text.includes('speed') || text.includes('performance')) {
            meta = { time: '45 mins', difficulty: 'Hard', impact: 'High', lift: '+8–15%', revenue: '$1.5k–$3.8k/mo' };
        } else if (text.includes('review')) {
            meta = { time: '15 mins', difficulty: 'Medium', impact: 'High', lift: '+15–22%', revenue: '$2.5k–$5.0k/mo' };
        }
        
        return meta;
      };

      const getGaugeColor = (s) => {
          if (s >= 85) return '#004F3F'; // Elite
          if (s >= 70) return '#008060'; // Trusted
          if (s >= 40) return '#FFC453'; // Optimization
          return '#D82C0D'; // Risk
      };

      const getTrustTier = (s) => {
          if (s >= 85) return 'Elite';
          if (s >= 70) return 'Trusted';
          if (s >= 40) return 'Needs Optimization';
          return 'At Risk';
      };

      const displayedRecommendations = showAllRecommendations 
        ? recommendations
        : recommendations.slice(0, 3);

      return (
        <BlockStack gap="800">
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

          {/* Score Card Removed - Unified Hero in Dashboard handles this */}

          {/* AI Analysis Section (Pro/Plus Only) */}
          {plan === 'FREE' ? (
             // Upsell for Free Plan users (Strict Gating)
             type === 'homepage' && (
                 <div 
                    onClick={() => {
                        trackEvent('upgrade_clicked', { from_plan: plan, source: 'ai_gating_card' });
                        onUpgrade();
                    }}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter') {
                            trackEvent('upgrade_clicked', { from_plan: plan, source: 'ai_gating_card' });
                            onUpgrade(); 
                        }
                    }}
                 >
                    <Card>
                       <Box background="bg-surface-secondary" padding="500" borderRadius="300">
                           <BlockStack gap="400">
                              <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                  <Text variant="headingMd" as="h3">🔒 AI Conversion Intelligence</Text>
                                  <Badge tone="magic">Premium</Badge>
                              </InlineGrid>
                              
                              <BlockStack gap="300">
                                  <Text as="p" fontWeight="bold">Unlock Deep Insights</Text>
                                  <Text as="p" tone="subdued">
                                      See exactly why visitors don't trust your store. 
                                      Discover hidden friction hurting checkout rate. 
                                      Get prioritized, revenue-weighted fixes.
                                  </Text>
                                  <Box>
                                      <Button variant="primary" size="large" onClick={(e) => {
                                          e.stopPropagation();
                                          trackEvent('upgrade_clicked', { from_plan: plan, source: 'ai_gating_button' });
                                          onUpgrade();
                                      }}>
                                          Unlock AI Intelligence
                                      </Button>
                                  </Box>
                              </BlockStack>
                           </BlockStack>
                       </Box>
                    </Card>
                 </div>
             )
          ) : (
             <Card>
                <BlockStack gap="400">
                   <InlineGrid columns="auto auto" gap="200" alignItems="center">
                       <Icon source={InfoIcon} tone="magic" />
                       <Text variant="headingMd" as="h3">AI Qualitative Analysis (Claude)</Text>
                   </InlineGrid>
                   
                   {/* Usage Counter */}
                   <Text variant="bodySm" tone={aiUsageCount >= 10 ? 'critical' : 'subdued'}>
                       {aiUsageCount}/10 AI analyses used this month
                   </Text>

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
                      <Text as="p">{data.aiAnalysis?.assessment || 'Analysis will appear here after your next audit.'}</Text>
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
          )}
          {/* END AI Analysis Section */}

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
            <div id="recommendations-section">
                <BlockStack gap="400">
                  {/* Progress Psychology Microcopy */}
                  <Box background="bg-surface-success" padding="300" borderRadius="200" borderInlineStartWidth="4px" borderColor="border-success">
                      <Text variant="bodySm" fontWeight="bold" tone="success">
                          🚀 TrustScore improves FAST. Most stores reach 60+ within 7 days.
                      </Text>
                  </Box>

                  <Text variant="headingMd" as="h3">🔥 Fix These First (Highest Revenue Impact)</Text>
    
                  {recommendations.length === 0 ? (
                    <Banner tone="success">Great job! No critical issues found.</Banner>
                  ) : (
                    <BlockStack gap="300">
                      {displayedRecommendations.map((rec, index) => {
                        const meta = getFixMetadata(rec.issue);
                        return (
                        <Banner key={index} tone={getPriorityColor(rec.priority)}>
                          <BlockStack gap="200">
                            <Text fontWeight="bold" as="h3">
                              [{rec.priority ? rec.priority.toUpperCase() : 'MEDIUM'}] {rec.issue}
                            </Text>
                            
                            {/* Fix Difficulty Tags */}
                            <InlineGrid columns={3} gap="400">
                               <BlockStack gap="100">
                                   <Text tone="subdued" variant="bodySm">Estimated Lift</Text>
                                   <Text fontWeight="bold" tone="success">{meta.lift}</Text>
                               </BlockStack>
                               <BlockStack gap="100">
                                   <Text tone="subdued" variant="bodySm">Revenue Impact</Text>
                                   <Text fontWeight="bold" tone="success">{meta.revenue}</Text>
                               </BlockStack>
                               <BlockStack gap="100">
                                   <Text tone="subdued" variant="bodySm">Fix Time</Text>
                                   <Text fontWeight="bold">{meta.time}</Text>
                               </BlockStack>
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
                      )})}

                      {recommendations.length > 3 && (
                          <Button 
                              fullWidth 
                              variant="plain" 
                              onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                          >
                              {showAllRecommendations ? "Show Less" : `👉 View All ${recommendations.length} Recommendations`}
                          </Button>
                      )}
                    </BlockStack>
                  )}
                </BlockStack>
            </div>
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

          {/* Founder Trust Signal */}
          <Box paddingBlockStart="800" paddingBlockEnd="400">
              <Text variant="bodySm" tone="subdued" alignment="center">
                  Built by an independent founder. <br/>
                  Questions? I personally reply within 24 hours.
              </Text>
          </Box>
        </BlockStack>
      );
  };

  if (!isNewStructure) {
      // Fallback for old data structure if needed, or just treat as homepage
      return renderAnalysis(result, 'homepage');
  }

  return (
    <BlockStack gap="800">
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
           <Box paddingBlockStart="400">
             {selectedTab === 0 ? renderAnalysis(result.homepage, 'homepage') : renderAnalysis(result.productPage, 'product')}
           </Box>
        </Tabs>
    </BlockStack>
  );
}

export default TrustScore;
