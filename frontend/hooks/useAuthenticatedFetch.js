import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 *
 * window.shopify is injected by the CDN script (app-bridge.js) asynchronously.
 * We poll for up to 5 s before giving up so the hook works even when the
 * CDN script takes a moment to execute.
 *
 * On 401: retry once with a fresh token (App Bridge v4 pattern).
 * No exitiframe/postMessage redirect — that was a v3 pattern.
 */

/** Wait for window.shopify to be available, up to 5 s. */
function waitForShopify(maxMs = 5000) {
  return new Promise((resolve, reject) => {
    if (window.shopify?.idToken) {
      resolve(window.shopify);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.shopify?.idToken) {
        clearInterval(timer);
        resolve(window.shopify);
      } else if (Date.now() - start >= maxMs) {
        clearInterval(timer);
        reject(new Error(
          'window.shopify not available after 5 s. ' +
          'Ensure the app-bridge.js CDN script and shopify-api-key meta tag are in index.html.'
        ));
      }
    }, 100);
  });
}

export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    // Wait for App Bridge v4 CDN injection
    let shopify;
    try {
      shopify = await waitForShopify();
    } catch (err) {
      console.error('[useAuthenticatedFetch]', err.message);
      throw err;
    }

    // Get session token
    let token;
    try {
      token = await shopify.idToken();
    } catch (error) {
      console.error('[useAuthenticatedFetch] Failed to get idToken:', error);
      throw new Error('Failed to get Shopify session token');
    }

    if (!token) {
      throw new Error('Empty session token from Shopify bridge');
    }

    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const response = await fetch(uri, { ...options, headers });

    // 401: refresh token and retry once
    if (response.status === 401 || response.headers.get('X-Shopify-API-Request-Failure-Reauthorize') === '1') {
      console.log('[useAuthenticatedFetch] 401 — refreshing token and retrying');
      try {
        const freshToken = await shopify.idToken();
        const retryResp = await fetch(uri, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${freshToken}` },
        });
        if (retryResp.ok) return retryResp;
        throw new Error(`Auth failed after refresh (${retryResp.status})`);
      } catch (err) {
        console.error('[useAuthenticatedFetch] Token refresh failed:', err);
        throw err;
      }
    }

    if (!response.ok) {
      console.error('[useAuthenticatedFetch] API error:', response.status, uri);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, []);
}
