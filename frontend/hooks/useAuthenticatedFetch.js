import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { useCallback } from 'react';

export function useAuthenticatedFetch() {
  const app = useAppBridge();
  return useCallback(async (uri, options = {}) => {
    // console.log("Attempting to fetch:", uri);
    const token = await getSessionToken(app);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(uri, { ...options, headers });
    
    // Robust reauth handling
    if (response.status === 401 || response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
      console.log("Auth failed - redirecting to exitiframe");
      
      // Use Shopify's exitIframe redirect pattern
      const shopOrigin = new URLSearchParams(window.location.search).get('shop') || 'trustscore-test.myshopify.com';
      const redirectUrl = `${window.location.origin}/exitiframe?shop=${shopOrigin}`;
      
      window.location.href = redirectUrl;
      return new Promise(() => {});
    }

    if (response.status === 302) {
        const location = response.headers.get('Location');
        if (location) {
            const host = import.meta.env.VITE_HOST || 'https://trustscore-scanne-production.up.railway.app';
            const fullUrl = location.startsWith('/') ? `${host}${location}` : location;
            console.log('302 redirect detected - forcing top redirect to:', fullUrl);
            window.top.location.href = fullUrl;
            return new Promise(() => {});
        }
    }

    if (!response.ok) {
      console.error('API error:', response.status);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, [app]);
}
