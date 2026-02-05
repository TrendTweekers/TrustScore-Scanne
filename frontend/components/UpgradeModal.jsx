import React from 'react';
import { Modal, Text, BlockStack, Button, InlineGrid, Box, Card, List } from '@shopify/polaris';

export function UpgradeModal({ open, onClose, onUpgrade }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Unlock Unlimited Scans"
      primaryAction={{
        content: 'Upgrade to Pro ($29/mo)',
        onAction: () => onUpgrade('PRO'),
      }}
      secondaryActions={[
        {
          content: 'Close',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="500">
          <Text as="p">
            You've used your free scan. Upgrade to Pro to unlock unlimited scans, weekly monitoring, and advanced AI analysis.
          </Text>

          <InlineGrid columns={2} gap="400">
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Pro Plan</Text>
                <Text variant="headingxl" as="p">$29<Text tone="subdued" as="span" variant="bodySm">/mo</Text></Text>
                <List>
                    <List.Item>Unlimited Scans</List.Item>
                    <List.Item>Claude AI Analysis</List.Item>
                    <List.Item>Weekly Monitoring</List.Item>
                    <List.Item>Priority Support</List.Item>
                </List>
                <Button variant="primary" onClick={() => onUpgrade('PRO')}>Choose Pro</Button>
              </BlockStack>
            </Box>
            
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">Plus Plan</Text>
                <Text variant="headingxl" as="p">$99<Text tone="subdued" as="span" variant="bodySm">/mo</Text></Text>
                <List>
                    <List.Item>Everything in Pro</List.Item>
                    <List.Item>Custom Branding</List.Item>
                    <List.Item>API Access</List.Item>
                    <List.Item>Dedicated Manager</List.Item>
                </List>
                <Button onClick={() => onUpgrade('PLUS')}>Choose Plus</Button>
              </BlockStack>
            </Box>
          </InlineGrid>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
