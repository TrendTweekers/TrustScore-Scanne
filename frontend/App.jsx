import React from 'react';
import './styles/globals.css';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import Dashboard from './components/Dashboard';

// Standalone notice for when app is opened outside Shopify admin
function StandaloneNotice() {
  const testShop = 'trustscore-test.myshopify.com';
  const authUrl = `/api/auth?shop=${testShop}`;

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
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '30px' }}>
          The app is embedded in the Shopify admin interface and requires authentication from there.
        </p>
        <a
          href={authUrl}
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#0071e3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#005bcc'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#0071e3'}
        >
          Start Installation
        </a>
        <p style={{ color: '#999', fontSize: '12px', marginTop: '20px' }}>
          Or open the app from your Shopify store's admin panel.
        </p>
      </div>
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const host = params.get('host');
  const shop = params.get('shop');

  // If host is missing, show standalone notice
  if (!host) {
    console.warn('App opened outside Shopify admin - no host param provided');
    return <StandaloneNotice />;
  }

  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'REPLACE_WITH_API_KEY',
    host: host,
    forceRedirect: true,
  };

  console.log("App Bridge config:", { ...config, apiKey: '***' });
  console.log("Shop:", shop);

  return (
    <AppBridgeProvider config={config}>
      <Dashboard />
    </AppBridgeProvider>
  );
}

export default App;
