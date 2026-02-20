import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { useCallback } from 'react';

export function useAuthenticatedFetch() {
  const app = useAppBridge();
  return useCallback(async (uri, options = {}) => {
    const token = await getSessionToken(app);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(uri, { ...options, headers });

    // Re-auth: redirect to exitiframe using the correct shop from URL params
    // IMPORTANT: use relative URL so the request goes to the backend, not
    // window.location.origin (which would be the Railway URL inside the iframe
    // and cause a postMessage origin mismatch with admin.shopify.com)
    if (response.status === 401 || response.headers.get('X-Shopify-API-Request-Failure-Reauthorize') === '1') {
      const params = new URLSearchParams(window.location.search);
      const shop = params.get('shop') || '';
      const host = params.get('host') || '';
      console.log('[useAuthenticatedFetch] 401 - redirecting to exitiframe for shop:', shop);
      // Relative URL — backend serves this, postMessage is handled server-side
      window.location.href = `/exitiframe?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`;
      return new Promise(() => {});
    }

    if (!response.ok) {
      console.error('API error:', response.status);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, [app]);
}
