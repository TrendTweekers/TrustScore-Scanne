/**
 * useUmami Hook
 * Wrapper around window.umami for tracking custom events
 * Safely handles cases where Umami hasn't loaded yet
 */

export const useUmami = () => {
  const trackEvent = (eventName, properties = {}) => {
    if (typeof window !== 'undefined' && window.umami) {
      try {
        window.umami.track(eventName, properties);
      } catch (err) {
        console.error('Umami tracking error:', err);
      }
    }
  };

  const trackPageView = (url, referrer = null) => {
    if (typeof window !== 'undefined' && window.umami) {
      try {
        window.umami.trackView(url, referrer);
      } catch (err) {
        console.error('Umami page view error:', err);
      }
    }
  };

  return { trackEvent, trackPageView };
};

export default useUmami;
