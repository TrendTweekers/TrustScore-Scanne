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
    recommendations.push('Add a trust badge (e.g., "Secure Checkout") above the fold on your homepage.');
    breakdown.push({ category: 'Trust Badges Above Fold', points: 0, maxPoints: 25, passed: false });
    console.log('-> Points Added: 0 (No badges above fold)');
  }

  // 2. SSL/HTTPS (20 points)
  if (data.isSSL) {
    score += 20;
    breakdown.push({ category: 'SSL Security', points: 20, maxPoints: 20, passed: true });
  } else {
    recommendations.push('Enable HTTPS/SSL for your store immediately.');
    breakdown.push({ category: 'SSL Security', points: 0, maxPoints: 20, passed: false });
  }

  // 3. Essential Pages (10 points each -> 40 points total)
  const pageChecks = [
    { key: 'hasContact', label: 'Contact Page', points: 10, msg: 'Create a clearly visible "Contact Us" page.' },
    { key: 'hasAbout', label: 'About Us Page', points: 10, msg: 'Add an "About Us" page to tell your brand story.' },
    { key: 'hasReturnPolicy', label: 'Return Policy', points: 10, msg: 'Add a clear Return/Refund Policy link in the footer.' },
    { key: 'hasPrivacyPolicy', label: 'Privacy Policy', points: 10, msg: 'Ensure you have a Privacy Policy accessible.' }
  ];

  pageChecks.forEach(check => {
    if (pages[check.key]) {
        score += check.points;
        breakdown.push({ category: check.label, points: check.points, maxPoints: check.points, passed: true });
    } else {
        recommendations.push(check.msg);
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
          recommendations.push('Improve visual design professionalism (consistent fonts, high-quality images).');
      }
      if (data.aiAnalysis.priorityFixes) {
          recommendations.push(...data.aiAnalysis.priorityFixes);
      }
  }

  console.log('--- Final Score:', score, '---');

  return {
    score: Math.min(100, score),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 60 ? 'C' : 'D',
    recommendations: [...new Set(recommendations)], // Dedup
    breakdown
  };
}

module.exports = { calculateTrustScore };
