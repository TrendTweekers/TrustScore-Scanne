import React, { useState, useEffect } from 'react';
import './styles/globals.css';
import Dashboard from './components/Dashboard';

// Standalone notice for when app is opened outside Shopify admin
function StandaloneNotice({ shop }) {
  // Use shop from URL param if present, otherwise show input guidance
  const installUrl = shop ? `/api/auth?shop=${encodeURIComponent(shop)}` : null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: '500px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <h1 style={{ marginTop: 0, color: '#1a1a1a', fontSize: '28px' }}>
          🔒 TrustScore Scanner
        </h1>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          This app must be opened from the Shopify Admin.
        </p>
        {installUrl ? (
          <>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '30px' }}>
              Click below to install or re-authenticate for <strong>{shop}</strong>.
            </p>
            <a
              href={installUrl}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#0071e3',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Start Installation
            </a>
          </>
        ) : (
          <p style={{ color: '#999', fontSize: '14px', marginBottom: '30px' }}>
            Missing <code>shop</code> parameter. Please open this app from your
            Shopify Admin panel under <strong>Apps → TrustScore Scanner</strong>.
          </p>
        )}
      </div>
    </div>
  );
}

// Loading spinner shown while waiting for window.shopify to be injected
function ShopifyBridgeLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        color: '#6b7280',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#0071e3',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span>Connecting to Shopify...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const host = params.get('host');
  const shop = params.get('shop');

  // If host is missing, show standalone notice (do NOT init App Bridge)
  if (!host) {
    console.warn('App opened outside Shopify admin - no host param provided');
    return <StandaloneNotice shop={shop} />;
  }

  return <EmbeddedApp shop={shop} />;
}

// Separate component so hooks work cleanly (no conditional hook calls)
function EmbeddedApp({ shop }) {
  const [shopifyReady, setShopifyReady] = useState(() => !!window.shopify);

  useEffect(() => {
    // Already available — nothing to do
    if (window.shopify) {
      setShopifyReady(true);
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 50; // 5 seconds max (50 × 100ms)

    const timer = setInterval(() => {
      attempts++;
      if (window.shopify) {
        console.log('[App] window.shopify ready after', attempts * 100, 'ms');
        setShopifyReady(true);
        clearInterval(timer);
      } else if (attempts >= MAX_ATTEMPTS) {
        // After 5s still not ready — log and stop polling
        // (App will stay on loader; avoids infinite reload loops)
        console.warn('[App] window.shopify not available after 5s — is this app embedded in Shopify Admin?');
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  if (!shopifyReady) {
    return <ShopifyBridgeLoader />;
  }

  console.log('[App] App Bridge v4 ready, shop:', shop);
  return <Dashboard />;
}

export default App;
