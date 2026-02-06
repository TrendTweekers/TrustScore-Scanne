import React, { useState } from 'react';
import { Modal, TextContainer, Button, BlockStack, Text, List, Select, InlineGrid, Box, Card } from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { REVENUE_BRACKETS } from '../utils/revenueEstimate';
import { trackEvent } from '../utils/analytics';

export function OnboardingModal({ open, onClose, onStartScan, mode = 'full' }) {
  const fetch = useAuthenticatedFetch();
  const [step, setStep] = useState(mode === 'revenue_only' ? 2 : 1);
  const [revenue, setRevenue] = useState('');

  // Reset step when opening in a different mode
  React.useEffect(() => {
      if (open) {
          setStep(mode === 'revenue_only' ? 2 : 1);
      }
  }, [open, mode]);

  const handleNext = async () => {
    if (step === 2 && revenue) {
        // Save revenue
        try {
            await fetch('/api/revenue-bracket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revenue })
            });

            trackEvent('revenue_bracket_set', { bracket: revenue });
            
            if (mode === 'revenue_only') {
                onClose();
                // Removed auto-scan: User must click "Run Trust Audit" manually
                // if (onStartScan) onStartScan();
                return; 
            }
        } catch (e) {
            console.error("Failed to save revenue", e);
        }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      onStartScan();
      onClose();
    }
  };

  const revenueOptions = [
      {label: 'Select monthly revenue', value: ''},
      ...REVENUE_BRACKETS
  ];

  const isRevenueMode = mode === 'revenue_only';

  const getTitle = () => {
      if (isRevenueMode) return "Update Revenue Bracket";
      switch(step) {
          case 1: return "Welcome to TrustScore!";
          case 2: return "Customize Your Audit";
          case 3: return "Quick Tour";
          case 4: return "Ready to Audit";
          default: return "";
      }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={getTitle()}
      primaryAction={{
        content: isRevenueMode ? 'Save' : (step === 4 ? 'Run Trust Audit (60 seconds)' : 'Next'),
        onAction: handleNext,
        disabled: step === 2 && !revenue
      }}
      secondaryActions={[
        {
          content: 'Close',
          onAction: onClose,
        }
      ]}
    >
      <Modal.Section>
        <BlockStack gap="500">
          {step === 1 && !isRevenueMode && (
            <BlockStack gap="400">
                <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '10px' }}>👋</div>
                <TextContainer>
                  <Text as="h2" variant="headingMd" alignment="center">
                    Boost Your Conversion Rate by 15-30%
                  </Text>
                  <Text as="p" alignment="center">
                    Welcome to TrustScore. We help you identify and fix the "trust issues" that cause 98% of visitors to leave without buying.
                  </Text>
                </TextContainer>
            </BlockStack>
          )}

          {step === 2 && (
             <BlockStack gap="400">
                 <Text as="p">To give you the best revenue impact estimates, what is your current monthly revenue?</Text>
                 <Select
                    label="Monthly Revenue"
                    options={revenueOptions}
                    onChange={setRevenue}
                    value={revenue}
                 />
             </BlockStack>
          )}

          {step === 3 && (
            <BlockStack gap="400">
                <Text as="p" variant="bodyLg">Here's how TrustScore helps you grow:</Text>
                
                <Card>
                    <InlineGrid columns={['auto', '1fr']} gap="400" alignItems="center">
                        <div style={{ fontSize: '24px' }}>🕵️‍♂️</div>
                        <BlockStack gap="100">
                            <Text fontWeight="bold">Scan & Score</Text>
                            <Text tone="subdued">Instant analysis of 20+ trust signals on your store.</Text>
                        </BlockStack>
                    </InlineGrid>
                </Card>

                <Card>
                    <InlineGrid columns={['auto', '1fr']} gap="400" alignItems="center">
                        <div style={{ fontSize: '24px' }}>⚔️</div>
                        <BlockStack gap="100">
                            <Text fontWeight="bold">Competitor Spy</Text>
                            <Text tone="subdued">See exactly why competitors might be converting better.</Text>
                        </BlockStack>
                    </InlineGrid>
                </Card>

                <Card>
                    <InlineGrid columns={['auto', '1fr']} gap="400" alignItems="center">
                        <div style={{ fontSize: '24px' }}>🚀</div>
                        <BlockStack gap="100">
                            <Text fontWeight="bold">Auto-Fix & Grow</Text>
                            <Text tone="subdued">Get actionable fixes and AI insights to close the gap.</Text>
                        </BlockStack>
                    </InlineGrid>
                </Card>
            </BlockStack>
          )}

          {step === 4 && (
            <BlockStack gap="400" align="center">
              <div style={{ textAlign: 'center', fontSize: '48px' }}>🚀</div>
              <TextContainer>
                <Text as="h2" variant="headingMd" alignment="center">
                    Ready to launch?
                </Text>
                <Text as="p" alignment="center">
                  We're ready to run your first audit. This will take about 60 seconds.
                </Text>
                <Text as="p" alignment="center" tone="subdued">
                  You'll get a score from 0-100 and a prioritized list of fixes.
                </Text>
              </TextContainer>
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
