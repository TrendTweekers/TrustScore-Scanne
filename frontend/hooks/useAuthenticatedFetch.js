import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { Redirect } from '@shopify/app-bridge/actions';

export function useAuthenticatedFetch() {
  const app = useAppBridge();
  return async (uri, options = {}) => {
    const token = await getSessionToken(app);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(uri, { ...options, headers });
    
    if (response.status === 403) {
      const reauth = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize");
      if (reauth === "1") {
        const url = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
        console.log('Detected reauth needed, redirecting to:', url);
        if (url && app) {
          const redirectAction = Redirect.create(app);
          redirectAction.dispatch(Redirect.Action.REMOTE, url);
        }
        return Promise.reject(new Error('Reauth required'));
      }
    }

    if (!response.ok) {
      console.error('API error:', response.status);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  };
}
