import React, { useState } from 'react';
import { Modal, TextContainer, Button, BlockStack, Text, List, Image } from '@shopify/polaris';

export function OnboardingModal({ open, onClose, onStartScan }) {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onStartScan();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 1 ? "Welcome to TrustScore!" : step === 2 ? "How it Works" : "Ready to Audit"}
      primaryAction={{
        content: step === 3 ? 'Run First Scan' : 'Next',
        onAction: handleNext,
      }}
    >
      <Modal.Section>
        <BlockStack gap="400">
          {step === 1 && (
            <TextContainer>
              <Text as="p">
                Hi there! 👋 Welcome to TrustScore Scanner. We're here to help you turn more visitors into buyers by fixing "trust issues" on your store.
              </Text>
              <Text as="p">
                Did you know that <strong>98% of visitors leave without buying</strong>? Often, it's because they don't trust the site enough to enter their credit card info.
              </Text>
            </TextContainer>
          )}

          {step === 2 && (
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

          {step === 3 && (
            <TextContainer>
              <Text as="p">
                We're ready to run your first audit. This will take about 10-20 seconds.
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
