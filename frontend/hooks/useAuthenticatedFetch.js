import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 *
 * The backend uses shopify.validateAuthenticatedSession() which:
 * - Derives session ID from the JWT Bearer token (offline, shop-scoped)
 * - Returns HTTP 403 with X-Shopify-API-Request-Failure-Reauthorize: 1
 *   and X-Shopify-API-Request-Failure-Reauthorize-Url: /api/auth?shop=...
 *   when the session is missing/expired
 *
 * We honour that header by navigating to the reauthorize URL using
 * window.open(url, '_top') — the only reliable cross-origin iframe escape.
 */

function getShopFromUrl() {
  return new URLSearchParams(window.location.search).get('shop') || '';
}
function getHostFromUrl() {
  return new URLSearchParams(window.location.search).get('host') || '';
}

/** Open a URL in the top-level browser window, escaping any iframe. */
function openInTop(url) {
  // Ensure absolute URL — required for window.open() from inside an iframe
  const abs = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  console.log('[authenticatedFetch] navigating top frame to:', abs);
  // window.open(_top) is the correct cross-origin iframe escape:
  // - window.top.location.href = ... is blocked by Same-Origin Policy
  // - window.open(url, '_top') IS allowed cross-origin per HTML spec
  window.open(abs, '_top');
}

/** Poll until window.shopify.idToken is a callable function. */
function waitForShopify(maxMs = 6000) {
  return new Promise((resolve, reject) => {
    if (typeof window.shopify?.idToken === 'function') {
      resolve(window.shopify);
      return;
    }
    const start = Date.now();
    console.log('[waitForShopify] polling... shopify exists:', !!window.shopify,
      'idToken type:', typeof window.shopify?.idToken);
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      if (typeof window.shopify?.idToken === 'function') {
        clearInterval(timer);
        console.log('[waitForShopify] ready after', elapsed, 'ms');
        resolve(window.shopify);
      } else if (elapsed >= maxMs) {
        clearInterval(timer);
        console.error('[waitForShopify] timeout -', {
          shopifyExists: !!window.shopify,
          keys: window.shopify ? Object.keys(window.shopify) : 'none',
        });
        reject(new Error('window.shopify.idToken not ready after ' + maxMs + 'ms'));
      }
    }, 150);
  });
}

/** Get idToken with hard timeout — idToken() can hang if App Bridge can't
 *  reach the Shopify Admin parent frame to get a signed JWT. */
function getIdToken(shopify, timeoutMs = 8000) {
  console.log('[getIdToken] calling idToken()...');
  return Promise.race([
    shopify.idToken().then(t => {
      console.log('[getIdToken] ✓ resolved, length:', t?.length ?? 0);
      return t;
    }),
    new Promise((_, reject) =>
      setTimeout(() => {
        console.error('[getIdToken] ✗ timed out after', timeoutMs, 'ms');
        reject(new Error('idToken() timed out — App Bridge cannot reach Shopify Admin parent frame'));
      }, timeoutMs)
    ),
  ]);
}

export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    console.log('[authenticatedFetch] ▶', uri);

    // Step 1 — wait for App Bridge CDN to inject window.shopify.idToken
    let shopify;
    try {
      shopify = await waitForShopify();
    } catch (err) {
      // App Bridge not initialised — navigate to OAuth
      console.error('[authenticatedFetch] App Bridge not ready:', err.message);
      const shop = getShopFromUrl();
      const host = getHostFromUrl();
      openInTop(`/api/auth?shop=${encodeURIComponent(shop)}${host ? '&host=' + encodeURIComponent(host) : ''}`);
      return new Promise(() => {}); // suspend while navigating
    }

    // Step 2 — get JWT with timeout
    let token;
    try {
      token = await getIdToken(shopify);
    } catch (err) {
      console.error('[authenticatedFetch] idToken failed:', err.message);
      // idToken hung — force OAuth to re-establish the session
      const shop = getShopFromUrl();
      const host = getHostFromUrl();
      openInTop(`/api/auth?shop=${encodeURIComponent(shop)}${host ? '&host=' + encodeURIComponent(host) : ''}`);
      return new Promise(() => {});
    }

    if (!token) {
      console.error('[authenticatedFetch] empty token — forcing re-auth');
      openInTop(`/api/auth?shop=${encodeURIComponent(getShopFromUrl())}`);
      return new Promise(() => {});
    }

    // Step 3 — make the request with 15 s timeout
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let response;
    try {
      console.log('[authenticatedFetch] fetching', uri);
      response = await fetch(uri, {
        ...options,
        headers,
        signal: AbortSignal.timeout(15000),
      });
      console.log('[authenticatedFetch] ✓ response:', response.status, uri);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.error('[authenticatedFetch] ✗ fetch timed out:', uri);
        throw new Error('Request timed out: ' + uri);
      }
      console.error('[authenticatedFetch] ✗ fetch error:', err.message);
      throw err;
    }

    // Step 4 — Handle SDK's reauthorize response (403 with special headers).
    // validateAuthenticatedSession() returns HTTP 403 + these headers when the
    // session is missing/expired. The Reauthorize-Url header is the exact
    // OAuth URL to navigate to — always use it instead of constructing our own.
    const reauthorize = response.headers.get('X-Shopify-API-Request-Failure-Reauthorize');
    const reauthorizeUrl = response.headers.get('X-Shopify-API-Request-Failure-Reauthorize-Url');
    if (response.status === 401 || response.status === 403 || reauthorize === '1') {
      if (reauthorizeUrl) {
        console.log('[authenticatedFetch] server requested re-auth, navigating to:', reauthorizeUrl);
        openInTop(reauthorizeUrl);
      } else {
        // No reauthorize URL — try refreshing the token once then retry
        console.log('[authenticatedFetch] 401/403 without reauthorize URL — retrying with fresh token');
        try {
          const fresh = await getIdToken(shopify, 8000);
          const retry = await fetch(uri, {
            ...options,
            headers: { ...options.headers, Authorization: `Bearer ${fresh}` },
            signal: AbortSignal.timeout(15000),
          });
          console.log('[authenticatedFetch] retry:', retry.status, uri);
          if (retry.ok) return retry;
          // Still failing — force re-auth
          console.error('[authenticatedFetch] still failing after refresh — forcing re-auth');
          openInTop(`/api/auth?shop=${encodeURIComponent(getShopFromUrl())}`);
        } catch (err) {
          console.error('[authenticatedFetch] refresh failed:', err.message);
          openInTop(`/api/auth?shop=${encodeURIComponent(getShopFromUrl())}`);
        }
      }
      return new Promise(() => {}); // suspend while navigating
    }

    if (!response.ok) {
      console.error('[authenticatedFetch] ✗ non-OK:', response.status, uri);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, []);
}
