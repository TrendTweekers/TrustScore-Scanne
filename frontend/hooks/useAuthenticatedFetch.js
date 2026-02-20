import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 *
 * In v4, Shopify Admin injects window.shopify — no Provider or getSessionToken needed.
 * Token is obtained via window.shopify.idToken().
 *
 * Safety: checks window.shopify exists before calling, wraps in try-catch to
 * prevent unhandled promise rejections during the brief window before injection.
 */
export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    // Safety check: window.shopify must exist (injected by Shopify Admin)
    if (!window.shopify?.idToken) {
      console.error('[useAuthenticatedFetch] window.shopify not ready — App Bridge v4 not injected yet');
      throw new Error('Shopify bridge not ready');
    }

    // App Bridge v4: get session token from window.shopify
    let token;
    try {
      token = await window.shopify.idToken();
    } catch (error) {
      console.error('[useAuthenticatedFetch] Failed to get idToken:', error);
      throw new Error('Failed to get Shopify session token');
    }

    if (!token) {
      console.error('[useAuthenticatedFetch] idToken returned empty');
      throw new Error('Empty session token from Shopify bridge');
    }

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
      console.error('[useAuthenticatedFetch] API error:', response.status);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, []);
}
