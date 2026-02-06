export const trackEvent = (event, data = {}) => {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(event, data);
  }
};
