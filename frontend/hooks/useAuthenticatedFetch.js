import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 *
 * In v4, Shopify Admin injects window.shopify — no Provider or getSessionToken needed.
 * Token is obtained via window.shopify.idToken().
 *
 * On 401: App Bridge v4 manages token refresh automatically via the CDN script.
 * We simply get a fresh token and retry once — no exitiframe redirect needed.
 * (exitiframe + postMessage was a v3 pattern and causes "wrong origin" errors in v4.)
 */
export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    // Safety check: window.shopify must be injected by Shopify Admin CDN script
    if (!window.shopify?.idToken) {
      console.error('[useAuthenticatedFetch] window.shopify not ready — is the app-bridge.js CDN script loaded?');
      throw new Error('Shopify bridge not ready');
    }

    // Get session token from App Bridge v4
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

    // 401 handling in App Bridge v4:
    // The CDN script handles session refresh — just get a new token and retry ONCE.
    // DO NOT redirect to /exitiframe — that uses postMessage which requires the
    // parent frame origin, causing "wrong origin" errors when ancestorOrigins
    // isn't available or returns the Railway URL instead of admin.shopify.com.
    if (response.status === 401 || response.headers.get('X-Shopify-API-Request-Failure-Reauthorize') === '1') {
      console.log('[useAuthenticatedFetch] 401 — refreshing token and retrying once');
      try {
        const freshToken = await window.shopify.idToken();
        const retryHeaders = { ...options.headers, Authorization: `Bearer ${freshToken}` };
        const retryResponse = await fetch(uri, { ...options, headers: retryHeaders });
        if (retryResponse.ok) return retryResponse;
        // Still failing after refresh — throw so callers can handle it
        console.error('[useAuthenticatedFetch] Still 401 after token refresh:', retryResponse.status);
        throw new Error(`Authentication failed (${retryResponse.status})`);
      } catch (err) {
        console.error('[useAuthenticatedFetch] Token refresh failed:', err);
        throw err;
      }
    }

    if (!response.ok) {
      console.error('[useAuthenticatedFetch] API error:', response.status);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, []);
}
