require('dotenv').config();
const express = require('express');
const { shopifyApp } = require('@shopify/shopify-app-express');
const { RedisSessionStorage } = require('@shopify/shopify-app-session-storage-redis');
const { SQLiteSessionStorage } = require('@shopify/shopify-app-session-storage-sqlite');
const { LATEST_API_VERSION, BillingInterval, DeliveryMethod, Session } = require('@shopify/shopify-api');
const {
  createOrUpdateShop,
  getShop,
  saveScan,
  saveCompetitorScan,
  getScanHistory,
  getScansForChart,
  getScanCount,
  getCompetitorScans,
  getCompetitorScanCount,
  updateShopPlan,
  updateShopRevenue,
  incrementAIUsage,
  resetAIUsage,
  adminUpgradeShop,
  setShopPlan,
  normalizeShop,
  db
} = require('./db.js');
const scannerRoutes = require('./routes/scanner.js');
const serveStatic = require('serve-static');
const path = require('path');
const helmet = require('helmet');

const FRONTEND_PATH = path.join(__dirname, '../dist');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.SESSION_DB_PATH || path.join(process.cwd(), "database.sqlite");

const sessionStorage =
  process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ""
    ? new RedisSessionStorage(process.env.REDIS_URL)
    : new SQLiteSessionStorage(DB_PATH);

// Logging wrapper for sessionStorage
const originalStoreCallback = sessionStorage.storeSession;
console.log("[Setup] Wrapping storeSession. Original type:", typeof originalStoreCallback);

sessionStorage.storeSession = async (session) => {
    console.log(`[Session] WRAPPER HIT: Storing session: ${session.id} | Shop: ${session.shop} | Expires: ${session.expires}`);
    try {
        const result = await originalStoreCallback.call(sessionStorage, session);
        console.log(`[Session] Store result for ${session.id}:`, result ? "SUCCESS" : "FAILED/UNDEFINED");
        return result;
    } catch (err) {
        console.error(`[Session] Store FAILED for ${session.id}:`, err);
        throw err;
    }
};

const originalLoadCallback = sessionStorage.loadSession;
sessionStorage.loadSession = async (id) => {
    console.log(`[Session] WRAPPER HIT: Loading session: ${id}`);
    try {
        const session = await originalLoadCallback.call(sessionStorage, id);
        if (session) {
            console.log(`[Session] FOUND: ID=${session.id} | Shop=${session.shop} | AccessToken=${session.accessToken ? "PRESENT" : "MISSING"} | Scope=${session.scope} | Online=${session.isOnline}`);
            
            // Self-heal: offline sessions with missing scope
            if (!session.isOnline && session.accessToken && !session.scope) {
                const fallbackScope = String(process.env.SCOPES || process.env.SHOPIFY_API_SCOPES || "read_products,read_themes");
                session.scope = fallbackScope;
                console.log(`[Session] PATCH: scope was missing. Set scope="${fallbackScope}" for ${id}`);
                // Use original store callback to avoid recursive logging if we used the wrapper
                await originalStoreCallback.call(sessionStorage, session);
            }
        } else {
            console.log(`[Session] NOT FOUND for ID: ${id}`);
        }
        return session;
    } catch (err) {
        console.error(`[Session] Load FAILED for ${id}:`, err);
        throw err;
    }
};

const originalDeleteCallback = sessionStorage.deleteSession;
sessionStorage.deleteSession = async (id) => {
    console.log(`[Session] WRAPPER HIT: Deleting session: ${id}`);
    return await originalDeleteCallback.call(sessionStorage, id);
};

console.log("[Setup] Session storage wrappers applied");

if (sessionStorage instanceof RedisSessionStorage) {
  console.log("Using Redis Session Storage - REDIS_URL:", process.env.REDIS_URL ? "set" : "MISSING");
} else {
    console.log("Using SQLite Session Storage");
}

console.log("Shopify app config:", {
  apiKey: process.env.SHOPIFY_API_KEY ? "set" : "missing",
  scopes: process.env.SCOPES || process.env.SHOPIFY_API_SCOPES || "read_products,read_themes",
  useOnlineTokens: false, 
  isEmbeddedApp: true,
  sessionStorageType: sessionStorage.constructor.name
});

// Billing Configuration
const BILLING_PLANS = {
  PRO: {
    amount: 19.00,
    currencyCode: 'USD',
    interval: BillingInterval.Every30Days,
    label: 'Pro Plan - Unlimited Scans + Weekly Monitoring',
  },
  PLUS: {
    amount: 49.00,
    currencyCode: 'USD',
    interval: BillingInterval.Every30Days,
    label: 'Plus Plan - Daily Monitoring + Competitor Scans',
  }
};

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SCOPES || 'read_products,read_themes').split(','),
    apiVersion: LATEST_API_VERSION,
    hostName: process.env.HOST?.replace(/https:\/\//, ''),
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
  },
  billing: {
    [BILLING_PLANS.PRO.label]: {
        amount: BILLING_PLANS.PRO.amount,
        currencyCode: BILLING_PLANS.PRO.currencyCode,
        interval: BILLING_PLANS.PRO.interval,
    },
    [BILLING_PLANS.PLUS.label]: {
        amount: BILLING_PLANS.PLUS.amount,
        currencyCode: BILLING_PLANS.PLUS.currencyCode,
        interval: BILLING_PLANS.PLUS.interval,
    }
  },
  sessionStorage,
  isEmbeddedApp: true,
  session: {
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 86400000, // 1 day
      path: '/',
      domain: undefined // Let browser set automatically
    }
  }
});

// Debug: Verify Billing Config
console.log("=== SHOPIFY APP CONFIG ===");
console.log("Billing Configured:", JSON.stringify(shopify.config.billing, null, 2));
console.log("Billing Plans Constant:", JSON.stringify(BILLING_PLANS, null, 2));
console.log("Billing Interval Defined:", !!BillingInterval, BillingInterval);

console.log('Session cookie configured with SameSite=none; Secure');

const getPlanCode = (name) => {
  if (!name) return 'FREE';
  if (name.includes('Pro')) return 'PRO';
  if (name.includes('Plus')) return 'PLUS';
  return 'FREE';
};

const webhookHandlers = {
  APP_SUBSCRIPTIONS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: '/api/webhooks',
    callback: async (topic, shop, body, webhookId) => {
      const payload = JSON.parse(body);
      console.log('Received subscription update:', payload);
      const subscription = payload.app_subscription;
      const planCode = (subscription && subscription.status === 'ACTIVE') 
        ? getPlanCode(subscription.name) 
        : 'FREE';
      console.log(`Updating ${shop} to plan ${planCode}`);
      await updateShopPlan(shop, planCode);
    },
  },
};

shopify.api.webhooks.addHandlers(webhookHandlers);

const app = express();
app.set('trust proxy', 1); // Required for Railway/Heroku to trust the proxy and set secure cookies
console.log('Trust proxy set to 1');

// 1. Raw Request Logger (Must be first)
app.use((req, res, next) => {
  console.log(`[RAW REQUEST] ${req.method} ${req.path}`);
  next();
});

// CSP Configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cloud.umami.is"],
        connectSrc: ["'self'", "https://cloud.umami.is", "https://api.umami.is"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      },
    },
  })
);

console.log("=== SERVER STARTING ===");
console.log("Auth path:", shopify.config.auth.path);
console.log("Callback path:", shopify.config.auth.callbackPath);

// 2. Auth Routes (Must be before body parsers and other middleware)
app.get(
  shopify.config.auth.path,
  (req, res, next) => {
    console.log("=== /api/auth ROUTE HIT ===");
    console.log("Shop:", req.query.shop);
    console.log("HOST env var:", process.env.HOST);
    console.log("Request headers host:", req.get('host'));
    console.log("Full request URL:", `${req.protocol}://${req.get('host')}${req.originalUrl}`);
    next();
  },
  shopify.auth.begin()
);

app.get(
  shopify.config.auth.callbackPath,
  async (req, res) => {
    console.log("=== CUSTOM /api/auth/callback HIT ===");
    console.log("Query params:", req.query);
    const { shop, code, state, host, hmac } = req.query;

    if (!shop || !code || !hmac) {
      console.error("Missing required query parameters");
      return res.status(400).send("Missing required query parameters");
    }

    try {
      // 1. Validate HMAC
      const isSafe = await shopify.api.utils.validateHmac(req.query);
      if (!isSafe) {
        console.error("HMAC Validation Failed");
        return res.status(400).send("Invalid HMAC");
      }

      // 2. Exchange Code for Access Token
      const accessTokenQuery = new URLSearchParams({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }).toString();

      console.log("Exchanging access token...");
      const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: accessTokenQuery
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error("Failed to exchange access token:", tokenData);
        return res.status(400).send("Token exchange failed");
      }

      console.log("Token exchange successful");
      const { access_token: accessToken, scope: grantedScope } = tokenData;

      // 3. Create and Store Session
      const offlineSessionId = 
        (shopify.api.session && shopify.api.session.getOfflineId) 
          ? shopify.api.session.getOfflineId(shop) 
          : `offline_${shop}`; 

      const session = new Session({ 
        id: offlineSessionId, 
        shop, 
        state: req.query.state || "state", 
        isOnline: false, 
      }); 

      session.accessToken = accessToken; 
      session.scope = grantedScope || "read_products,read_themes";
      session.state = req.query.state || "";

      console.log(`Storing session for ${shop} (ID: ${offlineSessionId})`);
      await shopify.config.sessionStorage.deleteSession(offlineSessionId);
      await shopify.config.sessionStorage.storeSession(session);

      // 4. Update Database (Preserve existing logic)
      const existing = await getShop(shop);
      
      if (!existing) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO shops (shop, accessToken, scope, plan, created_at, isActive) 
             VALUES (?, ?, ?, 'FREE', datetime('now'), 1)`,
            [shop, accessToken, grantedScope],
            (err) => err ? reject(err) : resolve()
          );
        });
      } else {
         await new Promise((resolve, reject) => {
          db.run(
            `UPDATE shops SET accessToken = ?, scope = ?, isActive = 1 WHERE shop = ?`,
            [accessToken, grantedScope, shop],
            (err) => err ? reject(err) : resolve()
          );
         });
      }
      
      console.log("OAuth completed successfully. Redirecting to app...");
      
      // 5. Redirect to App
      // Include host for App Bridge
      const redirectUrl = `/?shop=${shop}&host=${host}`;
      return res.redirect(redirectUrl);

    } catch (error) {
      console.error("Custom OAuth callback error:", error);
      return res.status(500).send("OAuth failed: " + error.message);
    }
  }
);

// 3. Webhooks (Must be before body parsers)
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers })
);

// Debug: Ping route (unprotected)
app.get('/api/ping', (req, res) => {
  console.log("Ping hit from:", req.get('origin') || 'unknown');
  res.json({ status: "alive", timestamp: new Date() });
});

app.get('/api/session-status', (req, res) => {
  // Try to access redis client status if possible
  const redisConnected = sessionStorage instanceof RedisSessionStorage && sessionStorage.client 
      ? sessionStorage.client.isOpen 
      : 'unknown/not-using-redis';

  res.json({
    hasSession: !!res.locals.shopify?.session,
    shop: res.locals.shopify?.session?.shop,
    hasToken: !!res.locals.shopify?.session?.accessToken,
    redisConnected
  });
});

// ExitIframe route to handle re-auth escaping
app.get('/exitiframe', (req, res) => {
  const shop = req.query.shop;
  console.log('ExitIframe hit for shop:', shop);
  res.redirect(`/api/auth?shop=${shop}`);
});

// MUST be placed above any app.use('/api', ...) routes and above shopify.validateAuthenticatedSession()
app.use((req, res, next) => {
  // DO NOT force header for auth routes!
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/auth')) {
    console.log(`Header middleware running on ${req.path}`);
    req.headers['x-requested-with'] = 'XMLHttpRequest';
    console.log(`Forced x-requested-with header on ${req.path} | from ${req.get('origin') || 'unknown'}`);
  }
  next();
});

// Fallback: Ensure shop domain header is present for Shopify middleware
app.use('/api/*', (req, res, next) => {
  if (!req.headers['x-shopify-shop-domain']) {
    req.headers['x-shopify-shop-domain'] = req.query.shop || req.headers['x-shopify-shop-domain'];
  }
  next();
});

// Set up Shopify authentication and webhook handling
// (Moved to top of middleware stack)

// All /api/* requests (except auth/webhooks) must be authenticated
app.use(['/api', '/api/*'], shopify.validateAuthenticatedSession());

// Log session status after validation
app.use('/api/*', (req, res, next) => {
  if (res.locals.shopify?.session) {
    console.log("Session VALID | shop:", res.locals.shopify.session.shop, "expires:", res.locals.shopify.session.expires);
  } else {
    console.log("Session MISSING or invalid in request");
  }
  next();
});

app.use(express.json());
app.use(shopify.cspHeaders()); // Ensure CSP headers are set

// Cookie Debug Middleware
app.use((req, res, next) => {
  if (req.url.includes('/api/')) {
    console.log('[Cookie Debug] Path:', req.url);
    console.log('[Cookie Debug] Cookies:', req.cookies);
    console.log('[Cookie Debug] Headers cookie:', req.headers.cookie);
  }
  next();
});

// API Routes
app.use('/api', scannerRoutes);

// Billing Route
const handleBillingRequest = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const plan = req.query.plan;
    
    console.log("=== BILLING SUBSCRIBE HIT (MANUAL GRAPHQL) ===");
    console.log("Plan:", plan);
    console.log("Shop:", session?.shop);

    if (!BILLING_PLANS[plan]) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    const planConfig = BILLING_PLANS[plan];
    const returnUrl = `${process.env.HOST}/?shop=${session.shop}&billing=success`;
    
    // Manual GraphQL mutation to create charge
    const client = new shopify.api.clients.Graphql({ session });
    
    const mutation = `
      mutation CreateCharge($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: $price
                interval: EVERY_30_DAYS
              }
            }
          }]
          returnUrl: $returnUrl
          test: $test
        ) {
          appSubscription {
            id
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const response = await client.query({
      data: {
        query: mutation,
        variables: {
          name: planConfig.label,
          price: { amount: planConfig.amount, currencyCode: planConfig.currencyCode },
          returnUrl: returnUrl,
          test: process.env.NODE_ENV !== 'production'
        }
      }
    });
    
    const { confirmationUrl, userErrors } = response.body.data.appSubscriptionCreate;
    
    if (userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }
    
    console.log("Billing request successful. Confirmation URL:", confirmationUrl);
    res.json({ confirmationUrl });
    
  } catch (error) {
    console.error("Billing error:", error);
    res.status(500).json({ error: error.message });
  }
};

app.get('/api/billing/upgrade', handleBillingRequest);
app.get('/api/billing/subscribe', handleBillingRequest);

app.get('/admin/plan/:shop/:plan', async (req, res) => {
  const { shop, plan } = req.params;
  const upperPlan = plan.toUpperCase();
  if (!['FREE', 'PRO', 'PLUS'].includes(upperPlan)) {
    return res.status(400).json({ error: 'Invalid plan. Must be FREE, PRO, or PLUS' });
  }

  try {
    await setShopPlan(shop, upperPlan);
    res.json({ success: true, shop, plan: upperPlan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/admin/upgrade/:shop', async (req, res) => {
  const { shop } = req.params;
  try {
    await adminUpgradeShop(shop);
    res.json({ success: true, shop, plan: 'PRO' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.use(serveStatic(FRONTEND_PATH, { index: false }));

app.use('/*', shopify.ensureInstalledOnShop(), async (req, res) => {
  return res
    .status(200)
    .set('Content-Type', 'text/html')
    .sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Expected OAuth callback URL:", `${process.env.HOST}/api/auth/callback`);
});

module.exports = { BILLING_PLANS };
