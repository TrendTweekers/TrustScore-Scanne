import React from 'react';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider, useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import enTranslations from '@shopify/polaris/locales/en.json';
import Dashboard from './components/Dashboard';
import { useEffect } from 'react';

function RedirectHandler() {
  const app = useAppBridge();
  
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'shopify:app:oauth:authorize') {
        const authUrl = event.data.url;
        console.log("RedirectHandler received auth request, redirecting to:", authUrl);
        const redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, authUrl);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [app]);
  
  return null;
}

function App() {
  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'REPLACE_WITH_API_KEY',
    host: new URLSearchParams(window.location.search).get('host'),
    forceRedirect: true,
  };
  
  console.log("App Bridge config:", config);
  console.log("Environment: VITE_HOST =", import.meta.env.VITE_HOST);

  return (
    <AppBridgeProvider config={config}>
      <RedirectHandler />
      <AppProvider i18n={enTranslations}>
        <Dashboard />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default App;
