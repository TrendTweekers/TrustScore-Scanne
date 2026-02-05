export function calculateTrustScore(data) {
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
    breakdown.push({ category: 'Trust Badges Above Fold', points: 0, maxPoints: 25, passed: false });
    recommendations.push({ 
      priority: 'HIGH', 
      category: 'trust_signals',
      issue: 'Payment badges not visible above the fold', 
      impact: '15-25% conversion lift', 
      effort: '5-min fix', 
      howToFix: '1. Install a free trust badge app\n2. Place badges in header or hero section\n3. Ensure visible on mobile without scrolling', 
      estimatedCost: '$0', 
      resourceLinks: ['https://apps.shopify.com/ultimate-trust-badges']
    });
    console.log('-> Points Added: 0 (No Trust Badges found)');
  }

  // 2. SSL Certificate (15 points)
  const isSSL = data.isSSL;
  console.log('2. SSL Check:', { url: data.url, isSSL });
  if (isSSL) {
    score += 15;
    breakdown.push({ category: 'SSL Certificate', points: 15, maxPoints: 15, passed: true });
    console.log('-> Points Added: 15 (SSL detected)');
  } else {
    breakdown.push({ category: 'SSL Certificate', points: 0, maxPoints: 15, passed: false });
    recommendations.push({ 
      priority: 'HIGH', 
      category: 'technical',
      issue: 'SSL (HTTPS) not enabled', 
      impact: 'Critical for trust & SEO', 
      effort: '5-min fix', 
      howToFix: '1. Go to Shopify Admin > Online Store > Domains\n2. Ensure SSL is pending or active\n3. Contact support if issues persist', 
      estimatedCost: '$0 (included in Shopify)', 
      resourceLinks: ['https://help.shopify.com/en/manual/domains/managing-domains/ssl']
    });
    console.log('-> Points Added: 0 (No SSL)');
  }

  // 3. Contact Page Exists (15 points)
  console.log('3. Contact Page Check:', pages.hasContact);
  if (pages.hasContact) {
    score += 15;
    breakdown.push({ category: 'Contact Page', points: 15, maxPoints: 15, passed: true });
    console.log('-> Points Added: 15 (Contact page found)');
  } else {
    breakdown.push({ category: 'Contact Page', points: 0, maxPoints: 15, passed: false });
    recommendations.push({ 
      priority: 'HIGH', 
      category: 'content',
      issue: 'Missing Contact page', 
      impact: '15-20% trust increase', 
      effort: '10-min fix', 
      howToFix: '1. Create page /pages/contact\n2. Add contact form or email/phone details\n3. Link in footer menu', 
      estimatedCost: '$0', 
      resourceLinks: ['https://help.shopify.com/en/manual/online-store/pages/contact-page']
    });
    console.log('-> Points Added: 0 (No Contact page)');
  }

  // 4. About Page Exists (10 points)
  console.log('4. About Page Check:', pages.hasAbout);
  if (pages.hasAbout) {
    score += 10;
    breakdown.push({ category: 'About Page', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (About page found)');
  } else {
    breakdown.push({ category: 'About Page', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'MEDIUM', 
      category: 'content',
      issue: 'Missing About Us page', 
      impact: 'Improves brand affinity', 
      effort: '30-min fix', 
      howToFix: '1. Create page /pages/about-us\n2. Tell your brand story and mission\n3. Add team photos if available', 
      estimatedCost: '$0', 
      resourceLinks: ['https://www.shopify.com/blog/about-us-page']
    });
    console.log('-> Points Added: 0 (No About page)');
  }

  // 5. Return/Refund Policy Page (10 points)
  console.log('5. Return Policy Check:', pages.hasReturnPolicy);
  if (pages.hasReturnPolicy) {
    score += 10;
    breakdown.push({ category: 'Return/Refund Policy', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (Return policy found)');
  } else {
    breakdown.push({ category: 'Return/Refund Policy', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'HIGH', 
      category: 'content',
      issue: 'Missing Return Policy', 
      impact: 'Reduces buyer anxiety', 
      effort: '15-min fix', 
      howToFix: '1. Go to Settings > Policies\n2. Generate from template or write custom policy\n3. Add to footer menu', 
      estimatedCost: '$0', 
      resourceLinks: ['https://help.shopify.com/en/manual/checkout-settings/refund-privacy-tos']
    });
    console.log('-> Points Added: 0 (No Return policy)');
  }

  // 6. Privacy Policy Page (5 points)
  console.log('6. Privacy Policy Check:', pages.hasPrivacyPolicy);
  if (pages.hasPrivacyPolicy) {
    score += 5;
    breakdown.push({ category: 'Privacy Policy', points: 5, maxPoints: 5, passed: true });
    console.log('-> Points Added: 5 (Privacy policy found)');
  } else {
    breakdown.push({ category: 'Privacy Policy', points: 0, maxPoints: 5, passed: false });
    recommendations.push({ 
      priority: 'MEDIUM', 
      category: 'content',
      issue: 'Missing Privacy Policy', 
      impact: 'Legal compliance', 
      effort: '5-min fix', 
      howToFix: '1. Go to Settings > Policies\n2. Generate from template\n3. Add to footer menu', 
      estimatedCost: '$0', 
      resourceLinks: ['https://help.shopify.com/en/manual/checkout-settings/refund-privacy-tos']
    });
    console.log('-> Points Added: 0 (No Privacy policy)');
  }

  // 7. Professional Email Domain (10 points)
  const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
  const hasProfessionalEmail = data.emails && data.emails.some(email => {
    const domain = email.split('@')[1];
    return domain && !freeProviders.includes(domain.toLowerCase());
  });
  console.log('7. Email Check:', { 
    emails: data.emails, 
    hasProfessional: hasProfessionalEmail 
  });

  if (hasProfessionalEmail) {
    score += 10;
    breakdown.push({ category: 'Professional Email', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (Professional email found)');
  } else {
    breakdown.push({ category: 'Professional Email', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'MEDIUM', 
      category: 'trust_signals',
      issue: 'Using personal email domain', 
      impact: 'Builds professional credibility', 
      effort: '1-hour fix', 
      howToFix: '1. Sign up for Google Workspace or Zoho Mail\n2. Connect to your custom domain\n3. Update contact email in Shopify', 
      estimatedCost: '~$6/mo', 
      resourceLinks: ['https://workspace.google.com/']
    });
    console.log('-> Points Added: 0 (No Professional email)');
  }

  // 8. Reviews/Testimonials Visible (10 points)
  console.log('8. Reviews Check:', data.hasReviews);
  if (data.hasReviews) {
    score += 10;
    breakdown.push({ category: 'Reviews/Testimonials', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (Reviews found)');
  } else {
    breakdown.push({ category: 'Reviews/Testimonials', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'MEDIUM', 
      category: 'trust_signals',
      issue: 'No reviews visible on homepage', 
      impact: 'Social proof missing', 
      effort: '15-min fix', 
      howToFix: '1. Install a reviews app (e.g., Judge.me, Loox)\n2. Import existing reviews or request new ones\n3. Add reviews widget to homepage', 
      estimatedCost: '$0 (free plans available)', 
      resourceLinks: ['https://apps.shopify.com/judgeme']
    });
    console.log('-> Points Added: 0 (No Reviews)');
  }

  // 9. Shipping Transparency (10 points)
  const shipping = data.shipping || { free: false, estimates: false };
  console.log('9. Shipping Check:', shipping);
  if (shipping.free || shipping.estimates) {
    score += 10;
    breakdown.push({ category: 'Shipping Transparency', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (Shipping info found)');
  } else {
    breakdown.push({ category: 'Shipping Transparency', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'MEDIUM', 
      category: 'trust_signals',
      issue: 'Shipping costs/times hidden', 
      impact: 'Reduces cart abandonment', 
      effort: '5-min fix', 
      howToFix: '1. Add "Free Shipping" banner to header\n2. Show delivery estimates on product pages', 
      estimatedCost: '$0', 
      resourceLinks: ['https://apps.shopify.com/search?q=shipping+bar']
    });
    console.log('-> Points Added: 0 (No Shipping info)');
  }

  // 10. Money-back Guarantee (10 points)
  const guarantees = data.guarantees || { moneyBack: false, warranty: false };
  console.log('10. Guarantee Check:', guarantees);
  if (guarantees.moneyBack || guarantees.warranty) {
    score += 10;
    breakdown.push({ category: 'Money-back Guarantee', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (Guarantee found)');
  } else {
    breakdown.push({ category: 'Money-back Guarantee', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'HIGH', 
      category: 'trust_signals',
      issue: 'No guarantee/warranty visible', 
      impact: 'Builds purchase confidence', 
      effort: '5-min fix', 
      howToFix: '1. Add "30-Day Money Back Guarantee" icon to product pages\n2. Mention warranty in footer', 
      estimatedCost: '$0', 
      resourceLinks: []
    });
    console.log('-> Points Added: 0 (No Guarantee)');
  }

  // 11. Security Badges (5 points)
  const security = data.security || { secureCheckout: false, badges: false };
  console.log('11. Security Check:', security);
  if (security.secureCheckout || security.badges) {
    score += 5;
    breakdown.push({ category: 'Security Badges', points: 5, maxPoints: 5, passed: true });
    console.log('-> Points Added: 5 (Security signals found)');
  } else {
    breakdown.push({ category: 'Security Badges', points: 0, maxPoints: 5, passed: false });
    recommendations.push({ 
      priority: 'LOW', 
      category: 'technical',
      issue: 'Security badges missing', 
      impact: 'Reassures security-conscious buyers', 
      effort: '5-min fix', 
      howToFix: '1. Add "Secure Checkout" text near add to cart button\n2. Use a security badge app', 
      estimatedCost: '$0', 
      resourceLinks: ['https://apps.shopify.com/search?q=security+badge']
    });
    console.log('-> Points Added: 0 (No Security signals)');
  }

  // 12. Social Proof (10 points)
  const socialProof = data.socialProof || { customerCount: false, media: false };
  console.log('12. Social Proof Check:', socialProof);
  if (socialProof.customerCount || socialProof.media) {
    score += 10;
    breakdown.push({ category: 'Social Proof', points: 10, maxPoints: 10, passed: true });
    console.log('-> Points Added: 10 (Social proof found)');
  } else {
    breakdown.push({ category: 'Social Proof', points: 0, maxPoints: 10, passed: false });
    recommendations.push({ 
      priority: 'MEDIUM', 
      category: 'trust_signals',
      issue: 'Lack of authority/popularity', 
      impact: 'Validates brand legitimacy', 
      effort: '15-min fix', 
      howToFix: '1. Add "Over 10,000 happy customers" to hero\n2. Add "As seen in" logos if applicable', 
      estimatedCost: '$0', 
      resourceLinks: []
    });
    console.log('-> Points Added: 0 (No Social proof)');
  }

  // 13. Live Chat / Support (5 points)
  const support = data.support || { liveChat: false, hours: false };
  console.log('13. Support Check:', support);
  if (support.liveChat || support.hours) {
    score += 5;
    breakdown.push({ category: 'Live Chat/Support', points: 5, maxPoints: 5, passed: true });
    console.log('-> Points Added: 5 (Support found)');
  } else {
    breakdown.push({ category: 'Live Chat/Support', points: 0, maxPoints: 5, passed: false });
    recommendations.push({ 
      priority: 'LOW', 
      category: 'content',
      issue: 'No instant support option', 
      impact: 'Helps resolve pre-purchase questions', 
      effort: '10-min fix', 
      howToFix: '1. Install Shopify Inbox or other chat app\n2. Display support hours in footer', 
      estimatedCost: '$0', 
      resourceLinks: ['https://apps.shopify.com/shopify-inbox']
    });
    console.log('-> Points Added: 0 (No Support)');
  }

  // Rescale score (Max 140 -> 100)
  const rawScore = score;
  score = Math.round((rawScore / 140) * 100);
  score = Math.min(100, Math.max(0, score));
  
  console.log(`--- Raw Score: ${rawScore}/140 -> Final Scaled Score: ${score}/100 ---`);

  // --- Product Page Scoring ---
  let productScore = 0;
  let productRecommendations = [];
  let productBreakdown = [];
  
  if (data.productPage && data.productPage.found) {
     const pData = data.productPage;
     const maxProductPoints = 60; // 6 checks * 10 points each

     // 1. Reviews Visible (10 pts)
     if (pData.reviewsVisible) {
        productScore += 10;
        productBreakdown.push({ category: 'Product Reviews', points: 10, maxPoints: 10, passed: true });
     } else {
        productBreakdown.push({ category: 'Product Reviews', points: 0, maxPoints: 10, passed: false });
        productRecommendations.push({
            priority: 'HIGH',
            category: 'trust_signals',
            issue: 'No reviews on product page',
            impact: 'High impact on conversion',
            effort: '15-min fix',
            howToFix: '1. Enable review widget on product template\n2. Ensure stars are visible above the fold',
            estimatedCost: '$0',
            resourceLinks: ['https://apps.shopify.com/judgeme']
        });
     }

     // 2. Trust Badges near Add to Cart (10 pts)
     if (pData.trustBadges) {
        productScore += 10;
        productBreakdown.push({ category: 'Trust Badges (ATC)', points: 10, maxPoints: 10, passed: true });
     } else {
        productBreakdown.push({ category: 'Trust Badges (ATC)', points: 0, maxPoints: 10, passed: false });
        productRecommendations.push({
            priority: 'HIGH',
            category: 'trust_signals',
            issue: 'Missing trust badges near Add to Cart',
            impact: 'Increases ATC rate',
            effort: '5-min fix',
            howToFix: '1. Add payment icons or "Secure Checkout" text directly below the Add to Cart button',
            estimatedCost: '$0',
            resourceLinks: []
        });
     }

     // 3. Return Policy (10 pts)
     if (pData.returnPolicy) {
        productScore += 10;
        productBreakdown.push({ category: 'Clear Return Policy', points: 10, maxPoints: 10, passed: true });
     } else {
        productBreakdown.push({ category: 'Clear Return Policy', points: 0, maxPoints: 10, passed: false });
        productRecommendations.push({
            priority: 'MEDIUM',
            category: 'content',
            issue: 'Return policy not mentioned on product page',
            impact: 'Reduces hesitation',
            effort: '10-min fix',
            howToFix: '1. Add a "Shipping & Returns" tab or link near the description',
            estimatedCost: '$0',
            resourceLinks: []
        });
     }

     // 4. Size Guide / Details (10 pts)
     if (pData.sizeGuide) {
        productScore += 10;
        productBreakdown.push({ category: 'Size Guide / Specs', points: 10, maxPoints: 10, passed: true });
     } else {
        productBreakdown.push({ category: 'Size Guide / Specs', points: 0, maxPoints: 10, passed: false });
        productRecommendations.push({
            priority: 'MEDIUM',
            category: 'content',
            issue: 'Missing Size Guide or Specifications',
            impact: 'Reduces returns',
            effort: '20-min fix',
            howToFix: '1. Add a size chart image or popup\n2. List detailed product specifications',
            estimatedCost: '$0',
            resourceLinks: []
        });
     }

     // 5. In Stock Indicators (10 pts)
     if (pData.inStock) {
        productScore += 10;
        productBreakdown.push({ category: 'Stock Status', points: 10, maxPoints: 10, passed: true });
     } else {
        productBreakdown.push({ category: 'Stock Status', points: 0, maxPoints: 10, passed: false });
        productRecommendations.push({
            priority: 'LOW',
            category: 'content',
            issue: 'Stock status unclear',
            impact: 'Creates urgency',
            effort: '5-min fix',
            howToFix: '1. Ensure "In Stock" or "Only X left" is visible',
            estimatedCost: '$0',
            resourceLinks: []
        });
     }

     // 6. Image Quality (10 pts)
     if (pData.imageQuality) {
        productScore += 10;
        productBreakdown.push({ category: 'Multiple Images', points: 10, maxPoints: 10, passed: true });
     } else {
        productBreakdown.push({ category: 'Multiple Images', points: 0, maxPoints: 10, passed: false });
        productRecommendations.push({
            priority: 'HIGH',
            category: 'content',
            issue: 'Only one product image found',
            impact: 'Critical for visual verification',
            effort: 'High effort',
            howToFix: '1. Upload at least 3-4 images per product (angles, lifestyle, close-up)',
            estimatedCost: '$0',
            resourceLinks: []
        });
     }
     
     // Scale to 100
     productScore = Math.round((productScore / maxProductPoints) * 100);

  } else {
      // Product page not found or analysis failed
      productBreakdown.push({ category: 'Product Analysis', points: 0, maxPoints: 100, passed: false, error: 'Product page not found' });
  }

  return {
    homepage: {
        score,
        recommendations,
        breakdown
    },
    productPage: {
        score: productScore,
        recommendations: productRecommendations,
        breakdown: productBreakdown,
        data: data.productPage // Pass through raw data for frontend
    }
  };
}
