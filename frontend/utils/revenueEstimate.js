export function calculateRevenueEstimate(revenueBracket, trustScore) {
  if (!revenueBracket) return null;

  // Map bracket -> midpoint monthly revenue
  const bracketMap = {
    '$0–$5k': 2500,
    '$5k–$20k': 12500,
    '$20k–$50k': 35000,
    '$50k–$200k': 125000,
    '$200k+': 250000
  };

  const midpoint = bracketMap[revenueBracket] || 2500; // Default fallback if mismatch

  // Apply a loss range based on trust tier
  let lowPct, highPct;

  if (trustScore >= 85) { // Elite
    lowPct = 0.01;
    highPct = 0.03;
  } else if (trustScore >= 70) { // Trusted
    lowPct = 0.03;
    highPct = 0.08;
  } else if (trustScore >= 40) { // Needs Optimization
    lowPct = 0.08;
    highPct = 0.18;
  } else { // At Risk
    lowPct = 0.15;
    highPct = 0.35;
  }

  const low = Math.round(midpoint * lowPct);
  const high = Math.round(midpoint * highPct);

  // Format as $X – $Y / month
  const formatCurrency = (val) => `$${val.toLocaleString()}`;

  return {
    text: `${formatCurrency(low)} – ${formatCurrency(high)} / month`,
    low,
    high,
    pctRange: `${(lowPct * 100).toFixed(0)}–${(highPct * 100).toFixed(0)}%`
  };
}

export const REVENUE_BRACKETS = [
  { label: '$0–$5k', value: '$0–$5k' },
  { label: '$5k–$20k', value: '$5k–$20k' },
  { label: '$20k–$50k', value: '$20k–$50k' },
  { label: '$50k–$200k', value: '$50k–$200k' },
  { label: '$200k+', value: '$200k+' }
];
