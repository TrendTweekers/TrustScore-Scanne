import React from 'react';
import './styles/globals.css';
import Dashboard from './components/Dashboard';

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('💥 React Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px', fontFamily: 'monospace', color: '#c00',
          background: '#fff8f8', minHeight: '100vh',
        }}>
          <h2>💥 App crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Standalone notice (no host param) ──────────────────────────────────────
function StandaloneNotice({ shop }) {
  const installUrl = shop ? `/api/auth?shop=${encodeURIComponent(shop)}` : null;
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: '500px', padding: '40px', backgroundColor: 'white',
        borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
            <a href={installUrl} style={{
              display: 'inline-block', padding: '12px 24px',
              backgroundColor: '#0071e3', color: 'white',
              textDecoration: 'none', borderRadius: '4px',
              fontSize: '14px', fontWeight: '600',
            }}>
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

// ─── Root App ────────────────────────────────────────────────────────────────
function App() {
  const params = new URLSearchParams(window.location.search);
  const host = params.get('host');
  const shop = params.get('shop');

  console.log('🟢 App.jsx rendering — host:', host, 'shop:', shop, 'window.shopify:', !!window.shopify);

  // No host = opened outside Shopify Admin (direct URL, browser, etc.)
  if (!host) {
    console.warn('[App] No host param — showing standalone notice');
    return <StandaloneNotice shop={shop} />;
  }

  // Render Dashboard immediately — no shopify readiness gate.
  // The CDN script (app-bridge.js) injects window.shopify asynchronously;
  // useAuthenticatedFetch waits for it only when an actual API call is made,
  // which happens inside Dashboard's useEffect (after mount).
  // Gating here caused a permanent blank screen when the script was slow/blocked.
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;
