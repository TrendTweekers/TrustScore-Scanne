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
    
    if (response.headers.get("X-Shopify-API-Request-Failure-Reauthorize") === "1") {
      const authUrlHeader = response.headers.get("X-Shopify-API-Request-Failure-Reauthorize-Url");
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.REMOTE, authUrlHeader || '/api/auth');
    }

    return response;
  };
}
