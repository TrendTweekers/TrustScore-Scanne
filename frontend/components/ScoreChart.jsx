import React, { useState, useEffect } from 'react';
import { Card, Text, BlockStack, InlineGrid, Badge, Box } from '@shopify/polaris';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

export function ScoreChart() {
  const fetch = useAuthenticatedFetch();
  const [data, setData] = useState([]);
  const [trendStatus, setTrendStatus] = useState('stable'); // stable, improving, declining

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/scans/history');
        const history = await res.json();
        
        // Format data for chart
        const chartData = history.map(scan => ({
          date: new Date(scan.timestamp || scan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          score: scan.score,
          fullDate: new Date(scan.timestamp || scan.createdAt).toLocaleString()
        }));

        setData(chartData);

        // Calculate trend
        if (chartData.length >= 2) {
            const last = chartData[chartData.length - 1].score;
            const prev = chartData[chartData.length - 2].score;
            if (last > prev) setTrendStatus('improving');
            else if (last < prev) setTrendStatus('declining');
            else setTrendStatus('stable');
        }
      } catch (err) {
        console.error("Failed to load chart data", err);
      }
    }
    loadData();
  }, [fetch]);

  if (data.length < 2) {
      return null; // Not enough data for a chart
  }

  const getTrendBadge = () => {
      switch(trendStatus) {
          case 'improving': return <Badge tone="success">↑ Improving</Badge>;
          case 'declining': return <Badge tone="critical">↓ Declining</Badge>;
          default: return <Badge tone="info">→ Stable</Badge>;
      }
  };

  return (
    <Card>
        <BlockStack gap="400">
            <InlineGrid columns="auto auto" gap="200" alignItems="center">
                <Text variant="headingMd">Score History (Last 30 Days)</Text>
                {getTrendBadge()}
            </InlineGrid>
            
            <Box height="300px" width="100%">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid stroke="#f1f1f1" strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                            labelStyle={{ color: '#666', marginBottom: '4px' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#008060" 
                            strokeWidth={3} 
                            dot={{ fill: '#008060', strokeWidth: 2 }} 
                            activeDot={{ r: 6 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </BlockStack>
    </Card>
  );
}
