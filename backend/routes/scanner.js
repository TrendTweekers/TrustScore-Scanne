const express = require('express');
const { takeScreenshots } = require('../services/puppeteer.js');
const { calculateTrustScore } = require('../services/scoring.js');
const { getShop, getScanCount, saveScan, getScanHistory } = require('../db.js');
const { analyzeStoreWithClaude } = require('../services/claude.js');
const { sendScoreDropAlert } = require('../services/email.js');

const router = express.Router();

// Helper to ensure URL has protocol
const ensureProtocol = (url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// GET /api/dashboard
router.get('/dashboard', async (req, res) => {
  console.log("HIT /api/dashboard | shop:", req.query.shop || req.headers['x-shopify-shop-domain']);
  try {
    const session = res.locals.shopify.session;
    const history = await getScanHistory(session.shop);
    const shopData = await getShop(session.shop);

    let currentScore = 0;
    let trend = 0;
    let previousScore = 0;

    if (history.length > 0) {
      currentScore = history[0].score;
      if (history.length > 1) {
        previousScore = history[1].score;
        trend = currentScore - previousScore;
      }
    }

    res.json({
      shop: session.shop,
      plan: shopData?.plan || 'FREE',
      currentScore,
      trend,
      history: history.slice(0, 5), // Return last 5 scans for dashboard
      scanCount: history.length
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// POST /api/scan
router.post('/scan', async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { url } = req.body;
    
    // Get shop data to check plan limits
    const shopData = await getShop(session.shop);
    const scanCount = await getScanCount(session.shop);
    
    // Check Limits
    // Free: 1 scan total (or maybe 1 per month? prompt says "Free: 1 scan")
    // Pro/Plus: Unlimited
    if (shopData?.plan === 'FREE' && scanCount >= 1) {
       // Allow re-scanning if it's the same URL? Usually "1 scan" means 1 audit. 
       // But for testing purposes, maybe we allow it. 
       // The prompt says "Free: 1 scan". Strict interpretation.
       return res.status(403).json({ 
         error: 'Free limit reached', 
         requiresUpgrade: true,
         message: 'You have used your free scan. Upgrade to Pro for unlimited scans.' 
       });
    }

    const targetUrl = url ? ensureProtocol(url) : `https://${session.shop}`;

    console.log(`Starting scan for ${session.shop} -> ${targetUrl}`);

    // 1. Take screenshots and extract raw data
    const puppeteerResult = await takeScreenshots(targetUrl);

    // 2. AI Qualitative Analysis (PRO/PLUS only)
    let aiAnalysis = null;
    if (shopData?.plan === 'PRO' || shopData?.plan === 'PLUS') {
        try {
            console.log('Running Claude AI Analysis...');
            // Pass homepage screenshot primarily
            aiAnalysis = await analyzeStoreWithClaude(puppeteerResult.screenshots);
        } catch (aiError) {
            console.error('AI Analysis failed:', aiError);
        }
    }

    // 3. Generate score (include AI analysis if available)
    const scoreResult = calculateTrustScore({ ...puppeteerResult, aiAnalysis });

    // 4. Save to DB
    // We save the homepage score as the main score for now, or maybe an average?
    // Let's save the homepage score.
    const finalScore = scoreResult.homepage ? scoreResult.homepage.score : scoreResult.score;
    
    // Check for score drop (if history exists)
    const history = await getScanHistory(session.shop);
    if (history.length > 0) {
        const previousScore = history[0].score;
        if (finalScore < previousScore) {
            console.log(`Score dropped for ${session.shop} (${previousScore} -> ${finalScore}). Sending alert...`);
            
            // Fetch shop details to get email
             try {
                // Access the API client from the request locals if available, or just use the session
                // We'll assume the standard way:
                const client = new res.locals.shopify.clients.Rest({session});
                const shopInfo = await client.get({path: 'shop'});
                const email = shopInfo.body.shop.email;
                await sendScoreDropAlert(email, session.shop, previousScore, finalScore);
             } catch (e) {
                console.error('Could not fetch shop email for alert:', e);
             }
        }
    }

    await saveScan(session.shop, targetUrl, finalScore, {
        url: targetUrl,
        ...scoreResult,
        aiAnalysis, // Add AI analysis to saved data
        screenshots: puppeteerResult.screenshots 
    });

    res.json({
      url: targetUrl,
      score: finalScore,
      result: {
          ...scoreResult,
          aiAnalysis
      }, 
      screenshots: puppeteerResult.screenshots
    });

  } catch (error) {
    console.error('Scan failed:', error);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// GET /api/history
router.get('/history', async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const history = await getScanHistory(session.shop);
        res.json(history);
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

module.exports = router;
