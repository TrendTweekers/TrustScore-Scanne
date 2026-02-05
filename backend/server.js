import 'dotenv/config';
import express from 'express';
import { shopifyApp } from '@shopify/shopify-app-express';
import { RedisSessionStorage } from "@shopify/shopify-app-session-storage-redis";
import { SQLiteSessionStorage } from '@shopify/shopify-app-session-storage-sqlite';
import { LATEST_API_VERSION, BillingInterval } from '@shopify/shopify-api';
import { createOrUpdateShop } from './db.js';
import scannerRoutes from './routes/scanner.js';
import serveStatic from 'serve-static';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_PATH = path.join(__dirname, '../dist');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(process.cwd(), "database.sqlite");const sessionStorage =
  process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ""
    ? new RedisSessionStorage(process.env.REDIS_URL)
    : new SQLiteSessionStorage(DB_PATH);

if (sessionStorage instanceof RedisSessionStorage) {
  // Hack to access internal client or we can trust the library throws if it fails.
  // Actually, let's just create a separate client for the health check if we want to be 100% sure.
  // But wait, the user asked to "redisClient.ping()". 
  // RedisSessionStorage doesn't expose 'client' publicly in all versions. 
  // Let's assume we can access it or just create a temporary one for the check.
  // Better approach: Since we don't have 'redis' package imported to create a client easily without adding deps,
  // we will try to use the one from sessionStorage if possible or skip if not.
  // However, the user provided specific code: redisClient.ping()...
  // This implies they might think we have a redisClient variable. We don't.
  // I will add a check using the sessionStorage's client if accessible, or add a comment that we are skipping explicit ping 
  // if we can't access it, but actually, let's try to see if we can just import redis.
  // Actually, I'll use the user's intent: "Add Redis connection check". 
  // I will assume I can use the client from the storage if I cast it (it usually has a client property).
  console.log("Using Redis Session Storage");
  // Check if we can access the client
  if (sessionStorage.client) {
      sessionStorage.client.ping().then(() => {
        console.log("Redis connection OK");
      }).catch(err => {
        console.error("Redis connection FAILED:", err);
      });
  } else {
      console.log("Redis client not directly accessible on sessionStorage object for ping check.");
  }
} else {
    console.log("Using SQLite Session Storage");
}

console.log("Shopify app config:", {
  apiKey: process.env.SHOPIFY_API_KEY ? "set" : "missing",
  scopes: process.env.SCOPES || process.env.SHOPIFY_API_SCOPES || "read_products,read_themes,write_themes",
  useOnlineTokens: false, 
  isEmbeddedApp: true
});

const shopify = shopifyApp({// Billing Configuration
export const BILLING_PLANS = {
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
  shopify.processWebhooks({ webhookHandlers: {} })
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
