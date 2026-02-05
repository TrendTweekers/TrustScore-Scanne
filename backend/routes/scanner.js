const express = require('express');
const { takeScreenshots } = require('../services/puppeteer.js');
const { calculateTrustScore } = require('../services/scoring.js');
const { getShop, getScanCount, saveScan, getScanHistory, getScansForChart, saveCompetitorScan, getCompetitorScans, getCompetitorScanCount } = require('../db.js');
const { analyzeStoreWithClaude } = require('../services/claude.js');
const { sendScoreDropAlert } = require('../services/email.js');
const { checkBillingMiddleware } = require('../middleware/billing.js');

const router = express.Router();

// Helper to ensure URL has protocol
const ensureProtocol = (url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// GET /api/scans/history
router.get('/scans/history', async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const history = await getScansForChart(session.shop, 30);
        res.json(history);
    } catch (error) {
        console.error('Chart history error:', error);
        res.status(500).json({ error: 'Failed to load chart history' });
    }
});

// POST /api/scanner/external
router.post('/scanner/external', checkBillingMiddleware, async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const { url } = req.body;
        const userPlan = req.userPlan || 'FREE';
        
        // 1. Enforce Plan Limits
        // Only PRO and PLUS can access this (enforced by middleware + check here)
        if (userPlan === 'FREE') {
             return res.status(403).json({ 
                 error: 'Upgrade required', 
                 message: 'Competitor scanning is a Pro feature.' 
             });
        }

        const limit = userPlan === 'PRO' ? 5 : 20;
        const currentCount = await getCompetitorScanCount(session.shop);

        if (currentCount >= limit) {
             return res.status(403).json({ 
                 error: 'Limit reached', 
                 message: `You have reached your limit of ${limit} competitor scans.` 
             });
        }

        // 2. Validate URL
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const targetUrl = ensureProtocol(url);
        
        // Simple validation: must be reachable
        // In a real app, we might check for Shopify specific headers or meta tags
        // For now, we'll let Puppeteer fail if it's not reachable
        
        console.log(`Starting competitor scan for ${session.shop} -> ${targetUrl}`);

        // 3. Run Analysis
        const puppeteerResult = await takeScreenshots(targetUrl);
        
        // Competitor analysis always includes AI for deeper insights if plan allows, 
        // but let's stick to the same logic: Pro/Plus gets AI.
        // Since this is a Pro/Plus feature only, we ALWAYS run AI.
        let aiAnalysis = null;
        try {
            console.log('Running Claude AI Analysis for competitor...');
            aiAnalysis = await analyzeStoreWithClaude(puppeteerResult.screenshots);
        } catch (aiError) {
            console.error('AI Analysis failed:', aiError);
        }

        const scoreResult = calculateTrustScore({ ...puppeteerResult, aiAnalysis });
        const finalScore = scoreResult.homepage ? scoreResult.homepage.score : scoreResult.score;

        // 4. Save to DB
        await saveCompetitorScan(session.shop, targetUrl, finalScore, {
            url: targetUrl,
            ...scoreResult,
            aiAnalysis,
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
        console.error('Competitor scan failed:', error);
        res.status(500).json({ error: 'Competitor scan failed' });
    }
});

// GET /api/competitors
router.get('/competitors', async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const scans = await getCompetitorScans(session.shop);
        res.json(scans);
    } catch (error) {
        console.error('Failed to fetch competitor scans:', error);
        res.status(500).json({ error: 'Failed to fetch competitor scans' });
    }
});

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
router.post('/scan', checkBillingMiddleware, async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const { url } = req.body;
    
    // Plan is attached by middleware
    const userPlan = req.userPlan || 'FREE';

    const targetUrl = url ? ensureProtocol(url) : `https://${session.shop}`;

    console.log(`Starting scan for ${session.shop} -> ${targetUrl}`);

    // 1. Take screenshots and extract raw data
    const puppeteerResult = await takeScreenshots(targetUrl);

    // 2. AI Qualitative Analysis (PRO/PLUS only)
    let aiAnalysis = null;
    if (userPlan === 'PRO' || userPlan === 'PLUS') {
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
