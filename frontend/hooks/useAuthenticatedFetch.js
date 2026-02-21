import { useCallback } from 'react';

/**
 * App Bridge v4 authenticated fetch hook.
 *
 * The backend uses shopify.validateAuthenticatedSession() which validates a
 * JWT Bearer token — NOT session cookies. So we must get the token from
 * window.shopify.idToken().
 *
 * If idToken() hangs (common when App Bridge can't handshake with the parent
 * frame), we time out and redirect to /api/auth to re-establish the session.
 */

function getShopFromUrl() {
  return new URLSearchParams(window.location.search).get('shop') || '';
}

function getHostFromUrl() {
  return new URLSearchParams(window.location.search).get('host') || '';
}

/** Poll until window.shopify.idToken is a real function, up to maxMs. */
function waitForShopify(maxMs = 6000) {
  return new Promise((resolve, reject) => {
    if (typeof window.shopify?.idToken === 'function') {
      console.log('[waitForShopify] already ready');
      resolve(window.shopify);
      return;
    }

    console.log('[waitForShopify] polling...', {
      shopifyExists: !!window.shopify,
      idTokenType: typeof window.shopify?.idToken,
      keys: window.shopify ? Object.keys(window.shopify) : [],
    });

    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      if (typeof window.shopify?.idToken === 'function') {
        clearInterval(timer);
        console.log('[waitForShopify] ready after', elapsed, 'ms');
        resolve(window.shopify);
      } else if (elapsed >= maxMs) {
        clearInterval(timer);
        console.error('[waitForShopify] timeout after', maxMs, 'ms', {
          shopifyExists: !!window.shopify,
          idTokenType: typeof window.shopify?.idToken,
          keys: window.shopify ? Object.keys(window.shopify) : [],
        });
        reject(new Error('window.shopify.idToken not ready after ' + maxMs + 'ms'));
      }
    }, 150);
  });
}

/** Get idToken with a hard timeout. idToken() can hang if App Bridge cannot
 *  communicate with the Shopify Admin parent frame. */
function getIdToken(shopify, timeoutMs = 8000) {
  console.log('[getIdToken] calling idToken()...');
  return Promise.race([
    shopify.idToken().then(t => {
      console.log('[getIdToken] resolved, length:', t?.length ?? 0);
      return t;
    }),
    new Promise((_, reject) =>
      setTimeout(() => {
        console.error('[getIdToken] timed out after', timeoutMs, 'ms');
        reject(new Error('idToken() timed out after ' + timeoutMs + 'ms'));
      }, timeoutMs)
    ),
  ]);
}

/**
 * Navigate the top-level window to OAuth to re-establish session.
 *
 * window.top.location.href is blocked by browsers when the iframe is
 * cross-origin (Shopify Admin is on admin.shopify.com, app is on Railway).
 * The correct cross-origin iframe escape is window.open(url, '_top') — this
 * is the same technique the App Bridge CDN script itself uses internally
 * (it lists '_top' as a valid navigation target).
 */
function redirectToAuth() {
  const shop = getShopFromUrl();
  const host = getHostFromUrl();
  const url = `/api/auth?shop=${encodeURIComponent(shop)}${host ? '&host=' + encodeURIComponent(host) : ''}`;
  const absUrl = `${window.location.origin}${url}`;
  console.log('[authenticatedFetch] redirecting to OAuth via window.open(_top):', absUrl);
  // window.open with '_top' navigates the outermost browsing context —
  // works cross-origin unlike window.top.location.href assignment
  window.open(absUrl, '_top');
}

export function useAuthenticatedFetch() {
  return useCallback(async (uri, options = {}) => {
    console.log('[authenticatedFetch] ▶', uri);

    // Step 1 — wait for App Bridge to inject window.shopify.idToken
    let shopify;
    try {
      shopify = await waitForShopify();
    } catch (err) {
      // App Bridge did not initialize — trigger fresh OAuth in the top frame
      console.error('[authenticatedFetch] App Bridge not ready:', err.message);
      redirectToAuth();
      return new Promise(() => {}); // suspend — page is navigating away
    }

    // Step 2 — get JWT with timeout (idToken can hang if bridge can't
    // handshake with Shopify Admin parent frame — always race against timer)
    let token;
    try {
      token = await getIdToken(shopify);
    } catch (err) {
      console.error('[authenticatedFetch] idToken failed:', err.message);
      redirectToAuth();
      return new Promise(() => {});
    }

    if (!token) {
      console.error('[authenticatedFetch] empty token');
      redirectToAuth();
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
      console.log('[authenticatedFetch] ✓', response.status, uri);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.error('[authenticatedFetch] fetch timed out:', uri);
        throw new Error('Request timed out: ' + uri);
      }
      console.error('[authenticatedFetch] fetch error:', err.message);
      throw err;
    }

    // Step 4 — 401: refresh token once, then re-auth if still failing
    if (response.status === 401 || response.headers.get('X-Shopify-API-Request-Failure-Reauthorize') === '1') {
      console.log('[authenticatedFetch] 401 — refreshing token');
      try {
        const fresh = await getIdToken(shopify, 8000);
        const retry = await fetch(uri, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${fresh}` },
          signal: AbortSignal.timeout(15000),
        });
        console.log('[authenticatedFetch] retry', retry.status, uri);
        if (retry.ok) return retry;
        console.error('[authenticatedFetch] still 401 after refresh — re-auth');
        redirectToAuth();
        return new Promise(() => {});
      } catch (err) {
        console.error('[authenticatedFetch] refresh failed:', err.message);
        redirectToAuth();
        return new Promise(() => {});
      }
    }

    if (!response.ok) {
      console.error('[authenticatedFetch] non-OK:', response.status, uri);
      throw new Error(`HTTP error ${response.status}`);
    }

    return response;
  }, []);
}
