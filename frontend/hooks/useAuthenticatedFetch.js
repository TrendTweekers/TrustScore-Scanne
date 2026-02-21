import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 *
 * window.shopify is injected by cdn.shopify.com/shopifycloud/app-bridge.js.
 * The CDN script reads <meta name="shopify-api-key" content="..."> to init.
 * If the meta tag has the wrong/missing key, window.shopify exists as a stub
 * but idToken() is NOT defined — causing "Cannot read properties of undefined".
 *
 * waitForShopify() polls until typeof window.shopify.idToken === 'function'.
 */

function waitForShopify(maxMs = 8000) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const s = window.shopify;
      if (s && typeof s.idToken === 'function') return true;
      return false;
    };

    if (check()) {
      console.log('[waitForShopify] already ready');
      resolve(window.shopify);
      return;
    }

    console.log('[waitForShopify] polling... window.shopify:', !!window.shopify,
      '| idToken type:', typeof window.shopify?.idToken,
      '| shopify keys:', window.shopify ? Object.keys(window.shopify).join(',') : 'none');

    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;

      if (check()) {
        clearInterval(timer);
        console.log('[waitForShopify] idToken ready after', elapsed, 'ms');
        resolve(window.shopify);
        return;
      }

      // Log state every second so we can see what's on window.shopify
      if (elapsed % 1000 < 110) {
        console.log('[waitForShopify] still waiting...', elapsed, 'ms',
          '| window.shopify:', !!window.shopify,
          '| idToken type:', typeof window.shopify?.idToken,
          '| keys:', window.shopify ? Object.keys(window.shopify).join(',') : 'none');
      }

      if (elapsed >= maxMs) {
        clearInterval(timer);
        const keys = window.shopify ? Object.keys(window.shopify).join(', ') : 'none';
        const msg = `window.shopify.idToken() not available after ${maxMs}ms. ` +
          `window.shopify exists: ${!!window.shopify}. ` +
          `Available keys: [${keys}]. ` +
          `Check: (1) <meta name="shopify-api-key"> has correct Client ID, ` +
          `(2) app-bridge.js CDN script loaded successfully, ` +
          `(3) app is opened inside Shopify Admin iframe (not standalone).`;
        console.error('[waitForShopify] TIMEOUT:', msg);
        reject(new Error(msg));
      }
    }, 100);
  });
}

async function getIdTokenWithTimeout(shopify, timeoutMs = 10000) {
  console.log('[authenticatedFetch] calling idToken()...');
  console.log('[authenticatedFetch] window.shopify keys:', Object.keys(shopify));
  console.log('[authenticatedFetch] idToken type:', typeof shopify.idToken);

  return Promise.race([
    shopify.idToken().then(token => {
      console.log('[authenticatedFetch] idToken resolved, length:', token?.length ?? 0);
      return token;
    }),
    new Promise((_, reject) =>
      setTimeout(() => {
        console.error('[authenticatedFetch] ✗ idToken() timed out after', timeoutMs, 'ms');
        reject(new Error(`idToken() timed out after ${timeoutMs}ms — App Bridge may not be fully initialized`));
      }, timeoutMs)
    ),
  ]);
}

export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    console.log('[authenticatedFetch] ▶ starting:', uri);

    // Step 1: wait for window.shopify.idToken to be a real function
    let shopify;
    try {
      shopify = await waitForShopify();
    } catch (err) {
      console.error('[authenticatedFetch] ✗ waitForShopify failed:', err.message);
      throw err;
    }

    // Step 2: get session token with explicit timeout (idToken can hang forever)
    let token;
    try {
      token = await getIdTokenWithTimeout(shopify, 10000);
    } catch (error) {
      console.error('[authenticatedFetch] ✗ getIdToken failed:', error.message);
      throw error;
    }

    if (!token) {
      console.error('[authenticatedFetch] ✗ idToken returned empty/null');
      throw new Error('Empty session token from Shopify bridge');
    }

    // Step 3: make the request with 10 s hard timeout
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let response;
    try {
      console.log('[authenticatedFetch] fetching', uri, '...');
      response = await fetch(uri, {
        ...options,
        headers,
        signal: AbortSignal.timeout(10000),
      });
      console.log('[authenticatedFetch] ✓ response:', response.status, uri);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.error('[authenticatedFetch] ✗ fetch timed out after 10 s:', uri);
        throw new Error('Request timed out: ' + uri);
      }
      console.error('[authenticatedFetch] ✗ fetch threw:', err.message, uri);
      throw err;
    }

    // Step 4: handle 401 — refresh token and retry once
    if (response.status === 401 || response.headers.get('X-Shopify-API-Request-Failure-Reauthorize') === '1') {
      console.log('[authenticatedFetch] 401 — refreshing token and retrying once');
      try {
        const freshToken = await getIdTokenWithTimeout(shopify, 10000);
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
