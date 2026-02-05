import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';

export function useAuthenticatedFetch() {
  const app = useAppBridge();
  return async (uri, options = {}) => {
    const token = await getSessionToken(app);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetch(uri, { ...options, headers });
    // Handle 403 specifically for billing?
    return response;
  };
}
