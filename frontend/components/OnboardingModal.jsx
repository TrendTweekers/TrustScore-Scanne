import React, { useState } from 'react';
import { Modal, TextContainer, Button, BlockStack, Text, List, Select } from '@shopify/polaris';
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
                // Trigger a refresh of the dashboard if needed? 
                // The parent should handle data reload or we can pass a callback.
                // But onStartScan is usually for the full flow.
                // We'll rely on the parent polling or reloading.
                if (onStartScan) onStartScan(); // Re-use this to trigger reload/scan if provided, or just close.
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRevenueMode ? "Update Revenue Bracket" : (step === 1 ? "Welcome to TrustScore!" : step === 2 ? "Customize Your Audit" : step === 3 ? "How it Works" : "Ready to Audit")}
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
        <BlockStack gap="400">
          {step === 1 && !isRevenueMode && (
            <TextContainer>
              <Text as="h2" variant="headingMd">
                Stores fixing trust signals see 15-30% conversion lifts
              </Text>
              <Text as="p">
                Hi there! 👋 Welcome to TrustScore. We're here to help you turn more visitors into buyers by fixing "trust issues" on your store.
              </Text>
              <Text as="p">
                Did you know that <strong>98% of visitors leave without buying</strong>? Often, it's because they don't trust the site enough to enter their credit card info.
              </Text>
            </TextContainer>
          )}

          {step === 2 && (
             <BlockStack gap="400">
                 <Text as="p">To give you the best recommendations, what is your current monthly revenue?</Text>
                 <Select
                    label="Monthly Revenue"
                    options={revenueOptions}
                    onChange={setRevenue}
                    value={revenue}
                 />
             </BlockStack>
          )}

          {step === 3 && (
            <TextContainer>
              <Text as="h3">We check 20+ Trust Signals</Text>
              <List type="bullet">
                <List.Item><strong>Visual Trust:</strong> High-quality images, consistent fonts, professional layout.</List.Item>
                <List.Item><strong>Social Proof:</strong> Reviews, testimonials, press mentions.</List.Item>
                <List.Item><strong>Security:</strong> SSL certificates, secure badges, clear policies.</List.Item>
                <List.Item><strong>Usability:</strong> Broken links, slow loading, mobile responsiveness.</List.Item>
              </List>
            </TextContainer>
          )}

          {step === 4 && (
            <TextContainer>
              <Text as="p">
                We're ready to run your first audit. This will take about 60 seconds.
              </Text>
              <Text as="p">
                You'll get a score from 0-100 and a list of actionable fixes.
              </Text>
              <Text as="p" fontWeight="bold">
                Let's boost your conversion rate! 🚀
              </Text>
            </TextContainer>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
