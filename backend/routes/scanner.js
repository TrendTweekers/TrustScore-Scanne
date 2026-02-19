const express = require('express');
const { takeScreenshots } = require('../services/puppeteer.js');
const { calculateTrustScore } = require('../services/scoring.js');
const { getShop, getScanCount, saveScan, getScanHistory, getScansForChart, saveCompetitorScan, getCompetitorScans, getCompetitorScanCount, updateShopRevenue, incrementAIUsage, resetAIUsage, normalizeShop } = require('../db.js');
const { analyzeStoreWithAI } = require('../services/claude.js');
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

// GET /api/debug/plan
router.get('/debug/plan', async (req, res) => {
    try {
        const session = res.locals.shopify?.session;
        const rawShop = session?.shop || req.query.shop;
        
        if (!rawShop) {
            return res.status(400).json({ error: 'Missing shop in session or query' });
        }

        const normalizedShop = normalizeShop(rawShop);
        const shopData = await getShop(normalizedShop);

        res.json({
            shop: rawShop,
            normalizedShop,
            planFromDb: shopData?.plan || 'NOT_FOUND',
            scan_count: shopData?.scan_count,
            ai_usage_count: shopData?.ai_usage_count,
            created_at: shopData?.created_at,
            isActive: shopData?.isActive
        });
    } catch (error) {
        console.error('Debug plan error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/onboarding
router.post('/onboarding', async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const { revenue } = req.body;
        if (revenue) {
            await updateShopRevenue(session.shop, revenue);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Revenue is required' });
        }
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Failed to save onboarding data' });
    }
});

// POST /api/revenue-bracket
router.post('/revenue-bracket', async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const { revenue } = req.body;
        
        if (!revenue) {
            return res.status(400).json({ error: 'Revenue bracket is required' });
        }

        await updateShopRevenue(session.shop, revenue);
        
        // Return updated shop info
        const shopData = await getShop(session.shop);
        
        res.json({ 
            success: true, 
            shop: shopData 
        });
    } catch (error) {
        console.error('Revenue bracket update error:', error);
        res.status(500).json({ error: 'Failed to update revenue bracket' });
    }
});

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
        
        // --- Sanity Checks ---
        const html = puppeteerResult.html || "";
        const lowerHtml = html.toLowerCase();
        
        // Bot protection check
        const botMarkers = [
            'captcha', 
            'cf-chl', 
            'cloudflare', 
            'challenge-platform', 
            'access denied', 
            'security check',
            'verify you are human',
            'just a moment...'
        ];
        
        if (botMarkers.some(m => lowerHtml.includes(m))) {
             return res.status(422).json({ 
                ok: false, 
                error: 'BOT_PROTECTION',
                message: 'We couldn’t analyze this site because it blocks automated scanning. Try another competitor or run the audit on your own store.' 
            });
        }
        
        // Length check (too small = likely error or password page)
        // User suggested < 10k. We'll use 3000 chars as a conservative floor for a real storefront.
        if (html.length < 3000) {
             return res.status(422).json({ 
                ok: false, 
                error: 'TOO_SMALL',
                message: 'The page content is too short to analyze. It might be a password page or empty.' 
            });
        }

        // Competitor analysis always includes AI for deeper insights if plan allows, 
        // but let's stick to the same logic: Pro/Plus gets AI.
        // Since this is a Pro/Plus feature only, we ALWAYS run AI.
        let aiAnalysis = null;
        try {
            console.log('Running AI Analysis for competitor...');
            aiAnalysis = await analyzeStoreWithAI(puppeteerResult.screenshots);
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
  // 1️⃣ Read shop from session (preferred) or query
  const session = res.locals.shopify?.session;
  const rawShop = session?.shop || req.query.shop;

  // Normalize shop immediately
  const shop = normalizeShop(rawShop);

  console.log("DASHBOARD SHOP (raw):", rawShop);
  console.log("DASHBOARD SHOP (normalized):", shop);
  console.log("HIT /api/dashboard | shop:", shop);
  
  // Cache busting headers
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // 2️⃣ Hard fail if missing
  if (!shop) {
    console.error("Dashboard error: shop missing from session + query");
    return res.status(400).json({ error: "Missing shop" });
  }

  try {
    // 3️⃣ Ensure the shop row exists (important because Railway + SQLite may reset)
    const { db, getShop, getScanHistory } = require('../db.js'); // Ensure db is imported
    
    await db.run(`
      INSERT OR IGNORE INTO shops (
        shop,
        access_token,
        plan,
        ai_usage_count,
        created_at,
        isActive
      ) VALUES (?, ?, 'FREE', 0, datetime('now'), 1)
    `, [shop, session?.accessToken || null]);

    // 4️⃣ Fetch shop data
    const history = await getScanHistory(shop);
    const shopData = await getShop(shop);

    console.log("=== DASHBOARD DATA ===");
    console.log("Shop:", shop);
    console.log("Plan from DB:", shopData?.plan);
    console.log("Full shop data:", shopData);
    console.log("[DASHBOARD] shop:", shop, "plan:", shopData?.plan, "scan_count:", shopData?.scan_count, "ai_usage_count:", shopData?.ai_usage_count);

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

    // 5️⃣ Return a stable response shape
    res.json({
      shop,
      plan: shopData?.plan || "FREE",
      currentScore,
      trend,
      history: history.slice(0, 5), // Return last 5 scans for dashboard
      scanCount: history.length,
      aiUsage: shopData?.ai_usage_count || 0,
      shopData // Return full data just in case
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

    // --- AI analysis (PRO/PLUS only) ---
    let aiAnalysis = null;
    const shop = session.shop;
    const shopData = await getShop(shop) || {}; 
    
    // Normalize accessToken to prevent "cannot read property of null" errors
    const accessToken = shopData.access_token || shopData.accessToken || null;

    // Check reset date
    if (shopData.ai_usage_reset_date && new Date(shopData.ai_usage_reset_date) < new Date()) {
        await resetAIUsage(shop);
        shopData.ai_usage_count = 0; 
    }

    const plan = (shopData?.plan || "FREE").toUpperCase();
    const aiAllowed = ["PRO", "PLUS"].includes(plan);

    console.log("[SCAN] shop:", shop);
    console.log("[SCAN] plan from DB:", plan, "ai_usage_count:", shopData?.ai_usage_count);

    if (aiAllowed) {
        try {
            console.log("[AI] starting analysis | shop:", shop);

            // Optional: log whether key exists (does NOT print the key)
            console.log("[AI] ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
            console.log("[AI] OPENROUTER_API_KEY present:", !!process.env.OPENROUTER_API_KEY);

            // Calculate score first to pass to AI (without AI analysis itself yet)
            const tempScoreResult = calculateTrustScore({ ...puppeteerResult });
            
            const aiPayload = {
              shop,
              url: targetUrl,
              score: tempScoreResult.homepage ? tempScoreResult.homepage.score : tempScoreResult.score,
              grade: tempScoreResult.grade,
              recommendations: (tempScoreResult.recommendations || []).slice(0, 8),
              breakdown: (tempScoreResult.breakdown || []).slice(0, 12),
              html: (puppeteerResult.html || "").slice(0, 12000),
              text: (puppeteerResult.text || "").slice(0, 12000),
            };

            console.log("[AI] payload sizes:", {
              html: aiPayload.html?.length || 0,
              text: aiPayload.text?.length || 0,
              recs: aiPayload.recommendations?.length || 0,
              breakdown: aiPayload.breakdown?.length || 0,
            });

            aiAnalysis = await analyzeStoreWithAI(aiPayload);
            
            if (!aiAnalysis || aiAnalysis.error) {
                console.warn("[AI] Skipping usage increment due to failed analysis");
                console.log("[AI] failed (returned error object) | shop:", shop);
            } else {
                await incrementAIUsage(shop);
                console.log("[AI] success | shop:", shop);
            }
        } catch (e) {
            console.error("[AI] FAILED | shop:", shop);
            console.error(e?.stack || e);

            aiAnalysis = {
                error: e?.message || String(e),
                // include a short stack so you can see it in the API response
                stack: (e?.stack || "").split("\n").slice(0, 12).join("\n"),
            };
        }
    } else {
        console.log("[AI] skipped (plan not allowed):", plan);
    }

    // 3. Generate score (include AI analysis if available)
    const scoreResult = calculateTrustScore({ ...puppeteerResult, aiAnalysis });
    
    // Log validation before response
    console.log("[AI] aiAnalysis type:", typeof aiAnalysis, "keys:", aiAnalysis && Object.keys(aiAnalysis));
    if (aiAnalysis?.error) console.log("[AI] aiAnalysis.error:", aiAnalysis.error);

    // 4. Save to DB and Check for Alerts
    const finalScore = scoreResult.homepage ? scoreResult.homepage.score : scoreResult.score;
    
    try {
        const history = await getScanHistory(session.shop);
        
        if (history && history.length > 0) {
            const previousScore = history[0].score;
            const drop = previousScore - finalScore;
            
            // Trigger alert if score dropped by 5 or more
            if (drop >= 5) {
                console.log(`[Alert] Score dropped for ${session.shop} (Prev: ${previousScore}, Curr: ${finalScore}, Drop: ${drop}). Sending email...`);
                
                // Fetch shop details to get email
                try {
                    const client = new res.locals.shopify.clients.Rest({session});
                    const shopInfo = await client.get({path: 'shop'});
                    const email = shopInfo.body.shop.email;
                    await sendScoreDropAlert(email, session.shop, previousScore, finalScore);
                } catch (e) {
                    console.error('Could not fetch shop email for alert:', e);
                    // Fallback to default
                    await sendScoreDropAlert(null, session.shop, previousScore, finalScore);
                }
            }
        }
    } catch (alertErr) {
        console.error("Failed to process score drop alert:", alertErr);
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
      aiAnalysis,
      result: {
          ...scoreResult,
          aiAnalysis,
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

const { sendWeeklyReport } = require('../services/email');

// --- Monitoring Routes ---

router.post('/monitoring/test-email', async (req, res) => {
    try {
        const session = res.locals.shopify.session;
        const { score, trend } = req.body;
        
        // Fetch shop email
        const client = new shopify.clients.Rest({ session });
        const shopInfo = await client.get({ path: 'shop' });
        const email = shopInfo.body.shop.email;

        console.log(`[Monitoring] Sending test email to ${email} for ${session.shop}`);
        
        // Send report
        await sendWeeklyReport(email, session.shop, score || 75, trend || 5);
        
        res.json({ success: true, message: `Test email sent to ${email}` });
    } catch (error) {
        console.error("Failed to send test email:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
