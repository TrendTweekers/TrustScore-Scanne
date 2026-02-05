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
const DB_PATH = path.join(process.cwd(), "database.sqlite");

const sessionStorage =
  process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ""
    ? new RedisSessionStorage(process.env.REDIS_URL)
    : new SQLiteSessionStorage(DB_PATH);

// Billing Configuration
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
    console.log('Valid session found | shop:', res.locals.shopify.session.shop);
  } else {
    console.log('No session found in request context');
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
