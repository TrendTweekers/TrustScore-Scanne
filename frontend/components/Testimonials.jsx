import React from 'react';
import { Card, Text, BlockStack, InlineGrid, Avatar, Box } from '@shopify/polaris';

export function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Jenkins",
      store: "EcoHome Goods",
      text: "My conversion rate went from 1.2% to 2.8% in two weeks after fixing the trust badges and return policy issues this app found.",
      initials: "SJ"
    },
    {
      name: "Mike Ross",
      store: "Urban Gear",
      text: "The AI analysis was brutal but necessary. It pointed out that my product descriptions sounded generic. Fixed it and saw immediate results.",
      initials: "MR"
    },
    {
      name: "Jessica Pearson",
      store: "Pearson Styles",
      text: "I didn't realize my mobile view had a broken checkout button until TrustScore flagged it. Lifesaver!",
      initials: "JP"
    }
  ];

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">What other merchants say</Text>
        <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
          {testimonials.map((t, i) => (
            <Box key={i} background="bg-surface-secondary" padding="400" borderRadius="200">
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">"{t.text}"</Text>
                <InlineGrid columns="auto auto" gap="200" alignItems="center">
                  <Avatar initials={t.initials} size="small" />
                  <BlockStack gap="0">
                    <Text variant="bodySm" fontWeight="bold">{t.name}</Text>
                    <Text variant="bodyXs" tone="subdued">{t.store}</Text>
                  </BlockStack>
                </InlineGrid>
              </BlockStack>
            </Box>
          ))}
        </InlineGrid>
      </BlockStack>
    </Card>
  );
}
