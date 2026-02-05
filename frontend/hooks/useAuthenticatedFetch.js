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
      const reauthHeader = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize");
      if (reauthHeader === "1") {
        const reauthUrl = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
        if (reauthUrl) {
          const redirect = Redirect.create(app);
          redirect.dispatch(Redirect.Action.REMOTE, reauthUrl);
          return Promise.reject(new Error('Reauth triggered'));
        }
      }
      throw new Error('Forbidden - session invalid');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  };
}
