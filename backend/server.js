require('dotenv').config();
const express = require('express');
const { shopifyApp } = require('@shopify/shopify-app-express');
const { RedisSessionStorage } = require('@shopify/shopify-app-session-storage-redis');
const { SQLiteSessionStorage } = require('@shopify/shopify-app-session-storage-sqlite');
const { LATEST_API_VERSION, BillingInterval, DeliveryMethod } = require('@shopify/shopify-api');
const { createOrUpdateShop, updateShopPlan } = require('./db.js');
const scannerRoutes = require('./routes/scanner.js');
const serveStatic = require('serve-static');
const path = require('path');

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
  sessionStorage,
  isEmbeddedApp: true,
  session: {
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 86400000, // 1 day
      path: '/'
    }
  }
});
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
  (req, res, next) => {
    console.log("=== /api/auth/callback HIT ===");
    console.log("Query params:", req.query);
    console.log("Shop:", req.query.shop);
    console.log("Code present:", !!req.query.code);
    console.log("HMAC present:", !!req.query.hmac);
    next();
  },
  shopify.auth.callback(),
  async (req, res, next) => {
    // Post-authentication hook to save shop to DB
    const session = res.locals.shopify.session;
    if (session) {
        console.log("Session successfully created!");
        console.log("Shop:", session.shop);
        console.log("Access token length:", session.accessToken?.length || "missing");
        console.log("Session ID:", session.id);
        console.log("Expires:", session.expires);
        console.log("Attempted to store session in Redis for shop:", session.shop);
        
        // Explicitly save the session since auto-save seems to be failing
        try {
            console.log("[Manual Fix] Explicitly calling storeSession(session)...");
            await sessionStorage.storeSession(session);
            console.log("[Manual Fix] storeSession completed.");
        } catch (err) {
            console.error("[Manual Fix] storeSession FAILED:", err);
        }

    } else {
        console.log("Session creation FAILED — no session object");
    }

    // console.log("Session created and saved | shop:", session.shop, "id:", session.id, "accessToken:", !!session.accessToken);
    await createOrUpdateShop(session.shop, session.accessToken);
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
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
  console.log("=== BILLING SUBSCRIBE HIT ===");
  const { plan } = req.query;
  const session = res.locals.shopify.session;
  
  console.log("Plan:", plan);
  console.log("Shop:", session?.shop);
  console.log("Session exists:", !!session);

  if (!BILLING_PLANS[plan]) {
    console.error("Invalid plan requested:", plan);
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const isTest = process.env.NODE_ENV !== 'production';
  console.log("Is Test Mode:", isTest);

  try {
    const billingParams = {
      session,
      plan: BILLING_PLANS[plan].label,
      isTest, 
      ...BILLING_PLANS[plan],
      returnUrl: `${process.env.HOST}/?shop=${session.shop}&billing=success`,
    };
    
    console.log("Calling shopify.api.billing.request with params:", JSON.stringify({
        ...billingParams,
        session: { id: session.id, shop: session.shop } // Don't log full session token
    }, null, 2));

    const confirmationUrl = await shopify.api.billing.request(billingParams);

    console.log("Billing request successful. Confirmation URL:", confirmationUrl);
    res.json({ confirmationUrl });
  } catch (error) {
    console.error('Billing request failed:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
        console.error('Error response data:', JSON.stringify(error.response.data || {}, null, 2));
    }
    res.status(500).json({ error: 'Failed to create billing request', details: error.message });
  }
};

app.get('/api/billing/upgrade', handleBillingRequest);
app.get('/api/billing/subscribe', handleBillingRequest);

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
