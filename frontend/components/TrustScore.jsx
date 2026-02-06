import React, { useState, useCallback, useEffect } from 'react';
import { Card, Text, ProgressBar, BlockStack, List, Banner, InlineGrid, Box, Tooltip, Icon, Tabs, Button, Badge, Divider, InlineStack, EmptyState, Spinner, Toast } from '@shopify/polaris';
import { InfoIcon, ClockIcon, CashDollarIcon, WrenchIcon, MagicIcon, ArrowRightIcon, CheckIcon, XIcon, ShieldCheckMarkIcon } from '@shopify/polaris-icons';
import { trackEvent } from '../utils/analytics';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function TrustScore({ result, plan, aiUsageCount, onUpgrade, revenueBracket, loading, onScan }) {
  const [progress, setProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const prevScoreRef = React.useRef(null);

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
          case 'low': return 'info';
          default: return 'info';
        }
      };

      const getGaugeColor = (s) => {
          if (s >= 90) return '#005BD3'; // Premium
          if (s >= 70) return '#008060'; // Trusted
          if (s >= 40) return '#FFC453'; // Optimization
          return '#D82C0D'; // Risk
      };

      const getScoreBackgroundToken = (s) => {
          if (s >= 90) return 'bg-surface-highlight';
          if (s >= 70) return 'bg-surface-success';
          if (s >= 40) return 'bg-surface-warning';
          return 'bg-surface-critical';
      };

      const getTrustTier = (s) => {
          if (s >= 90) return 'Elite';
          if (s >= 70) return 'Trusted';
          if (s >= 40) return 'Needs Optimization';
          return 'At Risk';
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
        
        // Revenue mapping
        const revMap = {
            '$0–$5k': 2500,
            '$5k–$20k': 12500,
            '$20k–$50k': 35000,
            '$50k–$200k': 125000,
            '$200k+': 250000
        };
        const monthlyRev = revMap[revenueBracket] || 2500; // Default conservative base

        let liftMin = 3, liftMax = 7;
        let time = '15 mins';

        if (text.includes('ssl') || text.includes('https')) { liftMin=12; liftMax=18; time='5 mins'; }
        else if (text.includes('favicon')) { liftMin=2; liftMax=5; time='2 mins'; }
        else if (text.includes('contact')) { liftMin=6; liftMax=11; time='10 mins'; }
        else if (text.includes('policy') || text.includes('refund')) { liftMin=5; liftMax=9; time='15 mins'; }
        else if (text.includes('about')) { liftMin=3; liftMax=6; time='20 mins'; }
        else if (text.includes('social')) { liftMin=2; liftMax=4; time='5 mins'; }
        else if (text.includes('broken link') || text.includes('404')) { liftMin=4; liftMax=8; time='10 mins'; }
        else if (text.includes('image') || text.includes('quality')) { liftMin=10; liftMax=14; time='30 mins'; }
        else if (text.includes('speed') || text.includes('performance')) { liftMin=8; liftMax=15; time='45 mins'; }
        else if (text.includes('review')) { liftMin=15; liftMax=22; time='15 mins'; }

        // Calculate impact
        const revMin = Math.round(monthlyRev * (liftMin / 100));
        const revMax = Math.round(monthlyRev * (liftMax / 100));

        const formatMoney = (val) => val >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${val}`;
        
        return { 
            time, 
            lift: `+${liftMin}–${liftMax}%`, 
            revenue: `${formatMoney(revMin)}–${formatMoney(revMax)}/mo` 
        };
      };


      const getAutoFixAction = (issueText) => {
        const text = issueText.toLowerCase();
        const shopDomain = window.shopOrigin || ''; 
        const storeName = shopDomain.replace('.myshopify.com', '');
        // Use cleaner admin URL construction
        const adminUrl = `https://admin.shopify.com/store/${storeName}`;

        if (text.includes('policy') || text.includes('refund') || text.includes('return')) {
            return { label: 'Edit Policies', url: `${adminUrl}/settings/legal`, external: true };
        }
        if (text.includes('page') || text.includes('about') || text.includes('contact')) {
            // Fix: simplified path to avoid 414 errors
            return { label: 'Manage Pages', url: `${adminUrl}/pages`, external: true };
        }
        if (text.includes('navigation') || text.includes('menu') || text.includes('link')) {
            return { label: 'Edit Navigation', url: `${adminUrl}/menus`, external: true };
        }
        if (text.includes('product') || text.includes('description')) {
            return { label: 'Edit Products', url: `${adminUrl}/products`, external: true };
        }
        if (text.includes('app') || text.includes('review') || text.includes('chat') || text.includes('badge')) {
            const query = text.includes('review') ? 'reviews' : text.includes('chat') ? 'chat' : 'trust badges';
            return { label: `Find ${query} App`, url: `https://apps.shopify.com/search?q=${query}`, external: true };
        }
        if (text.includes('speed') || text.includes('image')) {
             return { label: 'Optimize Theme', url: `${adminUrl}/themes`, external: true };
        }
        
        return null;
      };

      const displayedRecommendations = showAllRecommendations 
        ? recommendations
        : recommendations.slice(0, 3);

      return (
        <div className="fade-in-up">
        <BlockStack gap="800">
            <style>{`
                .trust-score-card {
                    transition: all 150ms ease;
                }
                .trust-score-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
                    transform: translateY(-2px);
                }
                .trust-score-root button {
                    transition: transform 150ms ease !important;
                }
                .trust-score-root button:hover {
                    transform: scale(1.02) !important;
                }
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

          {/* Score Card Removed - Unified Hero in Dashboard handles this */}
          
          {/* Re-adding Score Card per user request with corrected layout */}
          {/* This section duplicates the Dashboard header info but with detailed metrics if needed.
              However, the user request specifically asked to fix the score display card alignment.
              If the previous 'Score Card Removed' comment means it's gone, we might need to verify if we should bring it back.
              Assuming the user wants it back or modified in context of what exists.
              Wait, the dashboard header is global. This component might be used inside the dashboard tabs.
              Let's re-implement a polished Score Card here as requested.
           */}
           <Card roundedAbove="sm">
               <div className="trust-score-card">
                   <BlockStack gap="500">
                       <InlineStack align="space-between" blockAlign="center">
                           <Text variant="headingMd" as="h2">TrustScore Analysis</Text>
                           <Badge tone={getPriorityColor(getTrustTier(score))}>{getTrustTier(score)}</Badge>
                       </InlineStack>

                       <Divider />

                       <InlineStack align="center" blockAlign="center">
                           <Box padding="400" background={getScoreBackgroundToken(score)} borderRadius="full">
                               <div style={{ position: 'relative', width: 160, height: 160 }}>
                                   <ResponsiveContainer width="100%" height="100%">
                                       <PieChart>
                                           <Pie
                                               data={[{ value: score }, { value: 100 - score }]}
                                               cx="50%"
                                               cy="50%"
                                               innerRadius={60}
                                               outerRadius={80}
                                               startAngle={90}
                                               endAngle={-270}
                                               dataKey="value"
                                           >
                                               <Cell fill={getGaugeColor(score)} />
                                               <Cell fill="#E1E3E5" />
                                           </Pie>
                                       </PieChart>
                                   </ResponsiveContainer>
                                   <div style={{
                                       position: 'absolute',
                                       top: '50%',
                                       left: '50%',
                                       transform: 'translate(-50%, -50%)',
                                       textAlign: 'center'
                                   }}>
                                       <Text variant="headingXl" as="span" fontWeight="bold">
                                           {score}
                                       </Text>
                                       <Text variant="bodySm" tone="subdued">/ 100</Text>
                                   </div>
                               </div>
                           </Box>
                       </InlineStack>

                       <InlineStack gap="400" align="space-evenly">
                           <Box padding="200" background="bg-surface-info" borderRadius="200">
                               <BlockStack align="center" inlineAlign="center">
                                   <Text variant="headingSm" as="h3" tone="info">Last Scan</Text>
                                   <Text variant="bodySm">Just now</Text>
                               </BlockStack>
                           </Box>
                           <Box padding="200" background="bg-surface-success" borderRadius="200">
                               <BlockStack align="center" inlineAlign="center">
                                   <Text variant="headingSm" as="h3" tone="success">Trend</Text>
                                   <Text variant="bodySm">--</Text>
                               </BlockStack>
                           </Box>
                           <Box padding="200" background="bg-surface-warning" borderRadius="200">
                               <BlockStack align="center" inlineAlign="center">
                                   <Text variant="headingSm" as="h3" tone="warning">Plan</Text>
                                   <Text variant="bodySm">{plan}</Text>
                               </BlockStack>
                           </Box>
                       </InlineStack>

                       {score < 70 && (
                           <Banner tone="critical">
                               <Text fontWeight="bold">Losing approx. 35% of conversions due to low trust.</Text>
                           </Banner>
                       )}
                   </BlockStack>
               </div>
           </Card>

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
                                  <Text variant="headingMd" as="h2">🔒 AI Conversion Intelligence</Text>
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
                       <Text variant="headingMd" as="h2">AI Qualitative Analysis</Text>
                   </InlineGrid>
                   
                   {/* Usage Counter */}
                   <Text variant="bodySm" tone={aiUsageCount >= 10 ? 'critical' : 'subdued'}>
                       {aiUsageCount}/10 AI analyses used this month
                   </Text>

                   <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                      <InlineGrid columns={2} gap="400">
                          <BlockStack gap="200">
                             <Text variant="headingSm" as="h3">Design Professionalism</Text>
                             <Text variant="headingXl" tone="magic">{data.aiAnalysis?.designScore || '-'}/10</Text>
                          </BlockStack>
                          <BlockStack gap="200">
                             <Text variant="headingSm" as="h3">Niche Comparison</Text>
                             <Text tone="subdued">{data.aiAnalysis?.nicheComparison || 'Pending analysis...'}</Text>
                          </BlockStack>
                      </InlineGrid>
                   </Box>

                   <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Assessment</Text>
                      <Text as="p">{data.aiAnalysis?.assessment || 'Analysis will appear here after your next audit.'}</Text>
                   </BlockStack>

                   <BlockStack gap="200">
                      <Text variant="headingSm" as="h3">Top 3 Priority Fixes</Text>
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
            <Card roundedAbove="sm">
              <div
                  style={{
                      transition: 'box-shadow 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
              >
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Score Breakdown</Text>
                <BlockStack gap="200">
                  {breakdown.map((item, index) => (
                    <Box key={index} paddingBlockEnd="200" borderBlockEndWidth="1" borderColor="border-subdued">
                        <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                                <Icon source={item.passed ? CheckIcon : XIcon} tone={item.passed ? "success" : "critical"} />
                                <Tooltip content={getTooltipContent(item.category)} dismissOnMouseOut>
                                    <Text as="span" variant="bodyMd" fontWeight="semibold" style={{ cursor: 'help' }}>
                                        {item.category}
                                    </Text>
                                </Tooltip>
                            </InlineStack>
                            <Text tone="subdued" variant="bodySm">{item.points}/{item.maxPoints} points</Text>
                        </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              </BlockStack>
              </div>
            </Card>
          )}

          {/* Recommendations Section */}
          <Card roundedAbove="sm">
            <div id="recommendations-section"
                 style={{
                    transition: 'box-shadow 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                 }}
                 onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                 onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
            >
                <BlockStack gap="500">
                  {/* Progress Psychology Microcopy */}
                  <Box background="bg-surface-success" padding="300" borderRadius="200" borderInlineStartWidth="4px" borderColor="border-success">
                      <Text variant="bodySm" fontWeight="bold" tone="success">
                          🚀 TrustScore improves FAST. Most stores reach 60+ within 7 days.
                      </Text>
                  </Box>

                  <Text variant="headingMd" as="h2">🔥 Fix These First (Highest Revenue Impact)</Text>
    
                  {recommendations.length === 0 ? (
                    <Banner tone="success">Great job! No critical issues found.</Banner>
                  ) : (
                    <BlockStack gap="400">
                      {displayedRecommendations.map((rec, index) => {
                        const meta = getFixMetadata(rec.issue);
                        const autoFix = getAutoFixAction(rec.issue);
                        const isTrustBadgeIssue = rec.issue.toLowerCase().includes('badge') || (rec.howToFix && rec.howToFix.toLowerCase().includes('badge'));
                        
                        return (
                        <div 
                          key={index}
                          className="trust-score-card"
                          style={{ 
                            cursor: 'default',
                            borderRadius: '8px',
                            border: '1px solid #E1E3E5',
                            overflow: 'hidden'
                          }}
                        >
                        <Banner tone={getPriorityColor(rec.priority)}>
                          <BlockStack gap="300">
                            <InlineGrid columns="auto auto" gap="200" alignItems="center">
                                <Text fontWeight="bold" as="h3" variant="headingSm">
                                  [{rec.priority ? rec.priority.toUpperCase() : 'MEDIUM'}] {rec.issue}
                                </Text>
                                {isPro && <Badge tone="info">Pro Insight</Badge>}
                            </InlineGrid>
                            
                            {/* Fix Difficulty Tags */}
                            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                                <InlineGrid columns={3} gap="400">
                                   <BlockStack gap="100">
                                       <InlineGrid columns="auto auto" gap="150" alignItems="center">
                                           <Icon source={WrenchIcon} tone="success" />
                                           <Text tone="subdued" variant="bodySm">Estimated Lift</Text>
                                       </InlineGrid>
                                       <Text fontWeight="bold" tone="success">{meta.lift}</Text>
                                   </BlockStack>
                                   <BlockStack gap="100">
                                       <InlineGrid columns="auto auto" gap="150" alignItems="center">
                                           <Icon source={CashDollarIcon} tone="success" />
                                           <Text tone="subdued" variant="bodySm">Revenue Impact</Text>
                                       </InlineGrid>
                                       <Text fontWeight="bold" tone="success">{meta.revenue}</Text>
                                   </BlockStack>
                                   <BlockStack gap="100">
                                       <InlineGrid columns="auto auto" gap="150" alignItems="center">
                                           <Icon source={ClockIcon} tone="subdued" />
                                           <Text tone="subdued" variant="bodySm">Fix Time</Text>
                                       </InlineGrid>
                                       <Text fontWeight="bold">{meta.time}</Text>
                                   </BlockStack>
                                </InlineGrid>
                            </Box>
    
                            <Box paddingBlockStart="200">
                              <Text variant="headingSm" as="h3">How to fix:</Text>
                              <Text as="p" variant="bodyMd" style={{ whiteSpace: 'pre-line' }}>{rec.howToFix}</Text>
                              
                              <Box paddingBlockStart="300">
                              <InlineGrid columns="auto auto" gap="300">
                                  {autoFix && (
                                          <Button 
                                              variant="primary" 
                                              tone="success"
                                              icon={MagicIcon}
                                              onClick={() => window.open(autoFix.url, '_blank')}
                                          >
                                              {autoFix.label}
                                          </Button>
                                  )}

                                  {isTrustBadgeIssue && (
                                          <Button 
                                              variant="primary" 
                                              tone="success"
                                              icon={ArrowRightIcon}
                                              onClick={() => window.open('https://apps.shopify.com/search?q=trust+badges', '_blank')}
                                          >
                                              Open Trust Badge Builder
                                          </Button>
                                  )}
                              </InlineGrid>
                              </Box>
                            </Box>
                            {rec.resourceLinks && rec.resourceLinks.length > 0 && (
                              <Box paddingBlockStart="200">
                                <Text variant="headingSm" as="h3">Resources:</Text>
                                <List>
                                  {rec.resourceLinks.map((link, i) => (
                                     <List.Item key={i}>
                                       <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3', textDecoration: 'underline' }}>
                                         {link}
                                       </a>
                                     </List.Item>
                                  ))}
                                </List>
                              </Box>
                            )}
                          </BlockStack>
                        </Banner>
                        </div>
                      )})}

                      <Box padding="400" alignment="center">
                          <Text variant="bodySm" tone="subdued" alignment="center">
                              * Estimates are approximate based on industry benchmarks. Actual results vary.
                          </Text>
                      </Box>


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

  if (!isNewStructure) {
      // Fallback for old data structure if needed, or just treat as homepage
      return renderAnalysis(result, 'homepage');
  }

  return (
    <div className="trust-score-root">
        {showToast && <Toast content="🎉 Score improved!" onDismiss={() => setShowToast(false)} />}
        <BlockStack gap="800">
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <Box paddingBlockStart="400">
                {selectedTab === 0 ? renderAnalysis(result.homepage, 'homepage') : renderAnalysis(result.productPage, 'product')}
            </Box>
            </Tabs>
        </BlockStack>
    </div>
  );
}

export default TrustScore;
