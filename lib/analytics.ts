// lib/analytics.ts
type EventParams = {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
};

export const analytics = {
  /**
   * Track a custom event
   */
  event: (action: string, params: EventParams) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, params);
      console.log(`[Analytics] Event tracked: ${action}`, params); // Debug log
    }
  },

  /**
   * Track page view (useful for SPA navigation)
   */
  pageview: (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
        page_path: url,
      });
    }
  },

  /**
   * Track conversion/signup events
   */
  conversion: (label: string, value?: number) => {
    analytics.event('conversion', {
      event_category: 'conversion',
      event_label: label,
      value: value,
    });
  },

  /**
   * Track signup events specifically
   */
  signup: (method: string, email?: string) => {
    analytics.event('signup', {
      event_category: 'lead',
      event_label: method,
      email_hash: email ? hashString(email) : undefined, // Privacy-safe
    });
  },

  /**
   * Track errors
   */
  error: (errorMessage: string, errorSource?: string) => {
    analytics.event('exception', {
      description: errorMessage,
      fatal: false,
      source: errorSource,
    });
  },
};

/**
 * Simple hash function for privacy (not cryptographic, just for anonymization)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}