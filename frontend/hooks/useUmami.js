/**
 * useUmami Hook — ANALYTICS DISABLED
 *
 * Returning no-op functions to stop all calls to api.getaway.unaml.dev
 * which were causing 429 rate-limit errors.
 *
 * Re-enable once the core app is stable by swapping in the real implementation.
 */
export const useUmami = () => ({
  trackEvent: () => {},
  trackPageView: () => {},
});

export default useUmami;
