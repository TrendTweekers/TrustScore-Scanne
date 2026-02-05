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

if (sessionStorage instanceof RedisSessionStorage) {
  console.log("Using Redis Session Storage - REDIS_URL:", process.env.REDIS_URL ? "set" : "MISSING");
} else {
    console.log("Using SQLite Session Storage");
}

console.log("Shopify app config:", {
  apiKey: process.env.SHOPIFY_API_KEY ? "set" : "missing",
  scopes: process.env.SCOPES || process.env.SHOPIFY_API_SCOPES || "read_products,read_themes,write_themes",
  useOnlineTokens: false, 
  isEmbeddedApp: true
});

// Billing Configuration
const BILLING_PLANS = {
  PRO: {
    amount: 29.00,
    currencyCode: 'USD',
    interval: BillingInterval.Every30Days,
    label: 'Pro Plan - Unlimited Scans + Weekly Monitoring',
  },
  PLUS: {
    amount: 99.00,
    currencyCode: 'USD',
    interval: BillingInterval.Every30Days,
    label: 'Plus Plan - Daily Monitoring + Competitor Scans',
  }
};

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: ['read_products', 'read_themes', 'write_themes'], // Adjusted scopes as needed
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
  if (req.path.startsWith('/api/')) {
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
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    // Post-authentication hook to save shop to DB
    const session = res.locals.shopify.session;
    console.log("Session created and saved | shop:", session.shop, "id:", session.id, "accessToken:", !!session.accessToken);
    await createOrUpdateShop(session.shop, session.accessToken);
    next();
  },
  shopify.redirectToShopifyOrAppRoot()
);

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers })
);

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

// API Routes
app.use('/api', scannerRoutes);

// Billing Route
app.get('/api/billing/upgrade', async (req, res) => {
  const { plan } = req.query;
  const session = res.locals.shopify.session;
  
  if (!BILLING_PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const confirmationUrl = await shopify.api.billing.request({
    session,
    plan: BILLING_PLANS[plan].label,
    isTest: true, // TODO: Remove in production
    ...BILLING_PLANS[plan],
    returnUrl: `https://${shopify.config.api.hostName}/?shop=${session.shop}&billing=success`,
  });

  res.json({ confirmationUrl });
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
});

module.exports = { BILLING_PLANS };
