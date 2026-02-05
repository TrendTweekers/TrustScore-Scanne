import 'dotenv/config';
import express from 'express';
import { shopifyApp } from '@shopify/shopify-app-express';
import { LATEST_API_VERSION, BillingInterval } from '@shopify/shopify-api';
import { sessionCallback, createOrUpdateShop } from './db.js';
import scannerRoutes from './routes/scanner.js';
import serveStatic from 'serve-static';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_PATH = path.join(__dirname, '../dist');

const PORT = process.env.PORT || 3000;

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
  sessionStorage: {
    storeSession: sessionCallback.storeCallback,
    loadSession: sessionCallback.loadCallback,
    deleteSession: sessionCallback.deleteCallback,
  },
});

const app = express();

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
app.use('/api/*', shopify.validateAuthenticatedSession());

app.use(express.json());

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
