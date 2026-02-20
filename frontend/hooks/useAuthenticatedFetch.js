import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 * Full trace logging so we can see exactly where any hang occurs.
 * 10 s AbortSignal timeout on every fetch so we never hang silently.
 */

/** Wait for window.shopify to be available (injected by CDN script), up to maxMs. */
function waitForShopify(maxMs = 5000) {
  return new Promise((resolve, reject) => {
    if (window.shopify?.idToken) {
      console.log('[waitForShopify] already available');
      resolve(window.shopify);
      return;
    }
    console.log('[waitForShopify] polling for window.shopify...');
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.shopify?.idToken) {
        clearInterval(timer);
        console.log('[waitForShopify] available after', Date.now() - start, 'ms');
        resolve(window.shopify);
      } else if (Date.now() - start >= maxMs) {
        clearInterval(timer);
        const msg =
          'window.shopify not available after 5 s. ' +
          'Check: (1) app-bridge.js CDN script in index.html, ' +
          '(2) shopify-api-key meta tag has the correct API key, ' +
          '(3) app is opened inside Shopify Admin iframe.';
        console.error('[waitForShopify]', msg);
        reject(new Error(msg));
      }
    }, 100);
  });
}

export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    console.log('[authenticatedFetch] ▶ starting:', uri);

    // Step 1: wait for App Bridge v4 CDN injection
    let shopify;
    try {
      shopify = await waitForShopify();
    } catch (err) {
      console.error('[authenticatedFetch] ✗ waitForShopify failed:', err.message);
      throw err;
    }

    // Step 2: get session token
    let token;
    try {
      console.log('[authenticatedFetch] getting idToken...');
      token = await shopify.idToken();
      console.log('[authenticatedFetch] idToken received, length:', token?.length ?? 0);
    } catch (error) {
      console.error('[authenticatedFetch] ✗ idToken() threw:', error.message);
      throw new Error('Failed to get Shopify session token: ' + error.message);
    }

    if (!token) {
      console.error('[authenticatedFetch] ✗ idToken returned empty/null');
      throw new Error('Empty session token from Shopify bridge');
    }

    // Step 3: make the request with 10 s timeout
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let response;
    try {
      console.log('[authenticatedFetch] fetching', uri, '...');
      response = await fetch(uri, {
        ...options,
        headers,
        signal: AbortSignal.timeout(10000), // 10 s hard timeout
      });
      console.log('[authenticatedFetch] ✓ response:', response.status, uri);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.error('[authenticatedFetch] ✗ request timed out after 10 s:', uri);
        throw new Error('Request timed out: ' + uri);
      }
      console.error('[authenticatedFetch] ✗ fetch threw:', err.message, uri);
      throw err;
    }

    // Step 4: handle 401 — refresh token and retry once
    if (response.status === 401 || response.headers.get('X-Shopify-API-Request-Failure-Reauthorize') === '1') {
      console.log('[authenticatedFetch] 401 — refreshing token and retrying once');
      try {
        const freshToken = await shopify.idToken();
        console.log('[authenticatedFetch] fresh token length:', freshToken?.length ?? 0);
        const retryResp = await fetch(uri, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${freshToken}` },
          signal: AbortSignal.timeout(10000),
        });
        console.log('[authenticatedFetch] retry response:', retryResp.status, uri);
        if (retryResp.ok) return retryResp;
        throw new Error(`Auth failed after refresh (${retryResp.status})`);
      } catch (err) {
        console.error('[authenticatedFetch] ✗ token refresh failed:', err.message);
        throw err;
      }
    }

    if (!response.ok) {
      console.error('[authenticatedFetch] ✗ non-OK response:', response.status, uri);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, []);
}
