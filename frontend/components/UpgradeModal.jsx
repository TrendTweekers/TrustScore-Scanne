import React from 'react';
import { Modal, Text, BlockStack, Button, InlineGrid, Box, Card, List } from '@shopify/polaris';

export function UpgradeModal({ open, onClose, onUpgrade }) {
  const plans = [
    {
      name: 'Pro',
      price: '$19',
      features: [
        'Unlimited Audits',
        '10 AI Analyses/mo',
        'Weekly Monitoring',
        'Priority Support'
      ],
      action: () => onUpgrade('PRO')
    },
    {
      name: 'Plus',
      price: '$49',
      features: [
        'Daily Monitoring',
        'Competitor Analysis',
        'Unlimited AI Analysis',
        'Dedicated Success Manager'
      ],
      action: () => onUpgrade('PLUS')
    }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upgrade Your Plan"
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p">
            Unlock the full potential of TrustScore with our premium plans.
          </Text>
            
          <InlineGrid columns={2} gap="400">
            {plans.map((plan) => (
              <Card key={plan.name}>
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h3">{plan.name}</Text>
                  <Text variant="headingxl" as="p">{plan.price}<Text tone="subdued" as="span" variant="bodySm">/mo</Text></Text>
                  <List>
                    {plan.features.map(feature => (
                      <List.Item key={feature}>{feature}</List.Item>
                    ))}
                  </List>
                  <Button variant="primary" onClick={plan.action} fullWidth>Upgrade to {plan.name}</Button>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
