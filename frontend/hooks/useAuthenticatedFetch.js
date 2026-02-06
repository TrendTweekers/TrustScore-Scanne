import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { Redirect } from '@shopify/app-bridge/actions';
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
    
    // Robust reauth handling for 401, 403 and 302
    if (response.status === 401 || response.status === 403 || response.status === 302) {
      const reauth = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize");
      
      if (response.status === 401 || reauth === "1") {
        const url = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
        const currentSearch = new URLSearchParams(window.location.search);
        const shop = currentSearch.get('shop');
        const authUrl = url || `/api/auth?shop=${shop}`;
        
        console.log('Auth required - requesting redirect via RedirectHandler:', authUrl);
        
        window.postMessage({ 
            type: 'shopify:app:oauth:authorize', 
            url: authUrl 
        }, '*');

        // Return a pending promise to prevent further processing/errors
        return new Promise(() => {});
      } else if (response.status === 302) {
        const location = response.headers.get('Location');
        if (location) {
            const host = import.meta.env.VITE_HOST || 'https://trustscore-scanne-production.up.railway.app';
            console.log("Debug: VITE_HOST =", import.meta.env.VITE_HOST, "Calculated Host =", host);
            const fullUrl = location.startsWith('/') ? `${host}${location}` : location;
            console.log('302 redirect detected - forcing top redirect to:', fullUrl);
            window.top.location.href = fullUrl;
            return new Promise(() => {});
        }
      }
      throw new Error('Auth required');
    }

    if (!response.ok) {
      console.error('API error:', response.status);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, [app]);
}
