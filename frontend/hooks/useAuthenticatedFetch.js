import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { Redirect } from '@shopify/app-bridge/actions';

export function useAuthenticatedFetch() {
  const app = useAppBridge();
  return async (uri, options = {}) => {
    console.log("Attempting to fetch:", uri);
    const token = await getSessionToken(app);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(uri, { ...options, headers });
    
    // Robust reauth handling for 403 and 302
    if (response.status === 403 || response.status === 302) {
      const reauth = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize");
      if (reauth === "1") {
        const url = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
        console.log('Reauth required - redirecting to:', url);
        if (url && app) {
          const redirectAction = Redirect.create(app);
          redirectAction.dispatch(Redirect.Action.REMOTE, url);
          // Return a pending promise to prevent further processing/errors
          return new Promise(() => {});
        }
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
  };
}
