import React from 'react';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import enTranslations from '@shopify/polaris/locales/en.json';
import Dashboard from './components/Dashboard';

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
      <AppProvider i18n={enTranslations}>
        <Dashboard />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default App;
