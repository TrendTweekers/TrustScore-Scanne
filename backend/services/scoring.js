function calculateTrustScore(data) {
  console.log('--- Starting Trust Score Calculation ---');
  console.log('Input Data Keys:', Object.keys(data));
  console.log('Checks Received:', JSON.stringify(data.pages, null, 2));

  let score = 0;
  const recommendations = [];
  const breakdown = [];
  const pages = data.pages || {};

  // 1. Trust Badges Above Fold (25 points)
  console.log('1. Trust Badges Check:', {
    count: data.trustBadges ? data.trustBadges.count : 0,
    aboveFold: data.trustBadges ? data.trustBadges.aboveFold.length : 0
  });
  if (data.trustBadges && data.trustBadges.aboveFold && data.trustBadges.aboveFold.length > 0) {
    score += 25;
    breakdown.push({ category: 'Trust Badges Above Fold', points: 25, maxPoints: 25, passed: true });
    console.log('-> Points Added: 25 (Trust Badges found)');
  } else {
    recommendations.push({
        priority: 'HIGH',
        issue: 'Missing Trust Badges Above Fold',
        impact: 'High',
        effort: 'Low',
        estimatedCost: 'Free',
        howToFix: 'Add trust badges (Visa, Mastercard, Norton) above the fold (top 800px) of your homepage. You can use the free "Trust Badge Builder" app from the Shopify App Store to do this in one click.'
    });
    breakdown.push({ category: 'Trust Badges Above Fold', points: 0, maxPoints: 25, passed: false });
    console.log('-> Points Added: 0 (No badges above fold)');
  }

  // 2. SSL/HTTPS (20 points)
  if (data.isSSL) {
    score += 20;
    breakdown.push({ category: 'SSL Security', points: 20, maxPoints: 20, passed: true });
  } else {
    recommendations.push({
        priority: 'CRITICAL',
        issue: 'Store is not secure (No SSL)',
        impact: 'Critical',
        effort: 'Medium',
        estimatedCost: 'Free',
        howToFix: 'Enable HTTPS/SSL for your store immediately in Shopify Admin > Online Store > Domains. This is required for checkout security.'
    });
    breakdown.push({ category: 'SSL Security', points: 0, maxPoints: 20, passed: false });
  }

  // 3. Essential Pages (10 points each -> 40 points total)
  const pageChecks = [
    { 
        key: 'hasContact', 
        label: 'Contact Page', 
        points: 10, 
        rec: {
            priority: 'HIGH',
            issue: 'Missing Contact Page',
            impact: 'High',
            effort: 'Low',
            estimatedCost: 'Free',
            howToFix: 'Create a page at /pages/contact with your support email, phone number, and physical address. Customers need to know you are a real business.'
        }
    },
    { 
        key: 'hasAbout', 
        label: 'About Us Page', 
        points: 10, 
        rec: {
            priority: 'MEDIUM',
            issue: 'Missing About Us Page',
            impact: 'Medium',
            effort: 'Medium',
            estimatedCost: 'Free',
            howToFix: 'Add an "About Us" page telling your brand story. Explain who you are and why you started the store to build connection.'
        }
    },
    { 
        key: 'hasReturnPolicy', 
        label: 'Return Policy', 
        points: 10, 
        rec: {
            priority: 'HIGH',
            issue: 'Missing Return Policy',
            impact: 'High',
            effort: 'Low',
            estimatedCost: 'Free',
            howToFix: 'Add a clear return policy at /pages/returns (or linked in footer). Offer a 30-day money-back guarantee to reduce purchase anxiety.'
        }
    },
    { 
        key: 'hasPrivacyPolicy', 
        label: 'Privacy Policy', 
        points: 10, 
        rec: {
            priority: 'MEDIUM',
            issue: 'Missing Privacy Policy',
            impact: 'Medium',
            effort: 'Low',
            estimatedCost: 'Free',
            howToFix: 'Generate a standard Privacy Policy in Shopify Admin > Settings > Policies and link it in your footer.'
        }
    }
  ];

  pageChecks.forEach(check => {
    if (pages[check.key]) {
        score += check.points;
        breakdown.push({ category: check.label, points: check.points, maxPoints: check.points, passed: true });
    } else {
        recommendations.push(check.rec);
        breakdown.push({ category: check.label, points: 0, maxPoints: check.points, passed: false });
    }
  });
  
  // 4. AI Assessment (15 points max)
  if (data.aiAnalysis) {
      const designScore = data.aiAnalysis.designScore || 5; // 1-10
      const aiPoints = Math.min(15, Math.round((designScore / 10) * 15));
      score += aiPoints;
      breakdown.push({ category: 'AI Design Analysis', points: aiPoints, maxPoints: 15, passed: designScore > 6 });
      
      if (designScore <= 6) {
          recommendations.push({
              priority: 'MEDIUM',
              issue: 'Visual Design Needs Improvement',
              impact: 'Medium',
              effort: 'High',
              estimatedCost: 'Variable',
              howToFix: 'Improve visual design professionalism. Ensure consistent fonts, high-quality images, and adequate whitespace. Consider using a premium theme.'
          });
      }
      
      if (data.aiAnalysis.priorityFixes) {
          // Map AI string fixes to object structure
          data.aiAnalysis.priorityFixes.forEach(fix => {
              recommendations.push({
                  priority: 'MEDIUM', // AI fixes default to MEDIUM
                  issue: 'AI Suggestion',
                  impact: 'Medium',
                  effort: 'Medium',
                  estimatedCost: 'Free',
                  howToFix: fix
              });
          });
      }
  }

  console.log('--- Final Score:', score, '---');

  return {
    score: Math.min(100, score),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 60 ? 'C' : 'D',
    recommendations: recommendations, // Already objects now
    breakdown
  };
}

module.exports = { calculateTrustScore };
