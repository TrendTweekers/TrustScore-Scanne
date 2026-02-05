import React from 'react';
import { Card, Text, BlockStack, List } from '@shopify/polaris';

export function FAQ() {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">Frequently Asked Questions</Text>
        <List>
            <List.Item>
                <BlockStack gap="100">
                    <Text fontWeight="bold">How is the score calculated?</Text>
                    <Text tone="subdued">We analyze over 20 data points including SSL, image quality, trust badges, policies, and social proof.</Text>
                </BlockStack>
            </List.Item>
            <List.Item>
                <BlockStack gap="100">
                    <Text fontWeight="bold">Does this change my theme?</Text>
                    <Text tone="subdued">No. TrustScore Scanner only reads your public store pages. We do not modify your theme code.</Text>
                </BlockStack>
            </List.Item>
            <List.Item>
                <BlockStack gap="100">
                    <Text fontWeight="bold">How often should I scan?</Text>
                    <Text tone="subdued">We recommend scanning whenever you make design changes or add new products. Pro members get weekly auto-scans.</Text>
                </BlockStack>
            </List.Item>
            <List.Item>
                <BlockStack gap="100">
                    <Text fontWeight="bold">What if I can't fix an issue?</Text>
                    <Text tone="subdued">Each issue comes with a "How to fix" guide. If you're stuck, contact our support team.</Text>
                </BlockStack>
            </List.Item>
        </List>
      </BlockStack>
    </Card>
  );
}
