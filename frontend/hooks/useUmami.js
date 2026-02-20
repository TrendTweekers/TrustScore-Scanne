import { useCallback } from 'react';

/**
 * useUmami Hook
 * Wrapper around window.umami for tracking custom events.
 *
 * Key fixes:
 * - trackEvent and trackPageView are memoized with useCallback so they are
 *   stable across renders. Without this, putting them in useEffect dependency
 *   arrays causes the effect to re-run on every render, generating a flood of
 *   duplicate events and 429 rate-limit errors from api.getaway.unaml.dev.
 * - Module-level rate-limit guard (5 s per unique event name) ensures bursts
 *   of re-renders can't produce duplicate API calls even if the calling code
 *   isn't perfectly optimised.
 */

// Module-level rate-limit state (shared across all hook instances on the page)
const lastEventTime = {};
const RATE_LIMIT_MS = 5000; // max once per 5 s per event name

export const useUmami = () => {
  const trackEvent = useCallback((eventName, properties = {}) => {
    if (typeof window === 'undefined' || !window.umami) return;

    const now = Date.now();
    if (lastEventTime[eventName] && now - lastEventTime[eventName] < RATE_LIMIT_MS) {
      // Silently skip — duplicate within rate-limit window
      return;
    }
    lastEventTime[eventName] = now;

    try {
      window.umami.track(eventName, properties);
    } catch (err) {
      console.error('Umami tracking error:', err);
    }
  }, []); // Empty deps — stable reference, never recreated

  const trackPageView = useCallback((url, referrer = null) => {
    if (typeof window === 'undefined' || !window.umami) return;
    try {
      window.umami.trackView(url, referrer);
    } catch (err) {
      console.error('Umami page view error:', err);
    }
  }, []); // Stable reference

  return { trackEvent, trackPageView };
};

export default useUmami;
