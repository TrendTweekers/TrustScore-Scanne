import React, { useState } from 'react';
import { Card, Text, Button, Modal, BlockStack, List, Link } from '@shopify/polaris';

function ScoreInfo() {
  const [active, setActive] = useState(false);

  const handleChange = () => setActive(!active);

  return (
    <>
      <Card background="bg-surface-secondary">
        <BlockStack gap="200">
          <Text variant="headingSm" as="h3">
            Credibility & Methodology
          </Text>
          <List type="bullet">
            <List.Item>
              Based on <Text fontWeight="bold" as="span">Baymard Institute research</Text> (18,000+ users tested)
            </List.Item>
            <List.Item>
              Analyzing <Text fontWeight="bold" as="span">8 critical trust factors</Text> proven to impact conversions
            </List.Item>
          </List>
          <Button variant="plain" onClick={handleChange} textAlign="left">
            View methodology
          </Button>
        </BlockStack>
      </Card>

      <Modal
        open={active}
        onClose={handleChange}
        title="Trust Score Methodology"
        primaryAction={{
          content: 'Close',
          onAction: handleChange,
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p">
              Our TrustScore algorithm is built upon extensive e-commerce user experience research from leading institutes.
              We analyze your store against key indicators that directly correlate with buyer trust and conversion rates.
            </Text>
            
            <BlockStack gap="200">
              <Text variant="headingSm" as="h4">Research Sources:</Text>
              <List>
                <List.Item>
                  <Text fontWeight="bold" as="span">Baymard Institute:</Text> Extensive usability testing on checkout optimization and trust signals.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">Nielsen Norman Group:</Text> Research on web credibility and user behavior.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">GlobalSign & Symantec:</Text> Data on SSL impact and security seal effectiveness.
                </List.Item>
                <List.Item>
                  <Text fontWeight="bold" as="span">BrightLocal:</Text> Annual consumer review surveys.
                </List.Item>
              </List>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}

export default ScoreInfo;
