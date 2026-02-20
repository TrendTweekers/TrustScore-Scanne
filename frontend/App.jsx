import React from 'react';
import './styles/globals.css';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
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

function App() {
  const params = new URLSearchParams(window.location.search);
  const host = params.get('host');
  const shop = params.get('shop');

  // If host is missing, show standalone notice (do NOT init App Bridge)
  if (!host) {
    console.warn('App opened outside Shopify admin - no host param provided');
    return <StandaloneNotice shop={shop} />;
  }

  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host: host,
  };

  console.log("App Bridge config: host present, shop:", shop);

  return (
    <AppBridgeProvider config={config}>
      <Dashboard />
    </AppBridgeProvider>
  );
}

export default App;
