declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

let initialized = false;

function getMeasurementId(): string | null {
  const raw = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined)?.trim();
  if (!raw || !MEASUREMENT_ID_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}

export function initGA4(): void {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  const measurementId = getMeasurementId();
  if (!measurementId) return;

  // Never load analytics on /admin routes
  if (window.location.pathname.startsWith('/admin')) return;

  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const existing = document.querySelector(`script[data-nexa-ga4="${measurementId}"]`);
  if (!existing) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.nexaGa4 = measurementId;
    document.head.appendChild(script);
  }
}

export function trackCalculatorPageView(sectionPath: string, title: string): void {
  if (typeof window === 'undefined' || sectionPath.startsWith('/admin')) return;
  const measurementId = getMeasurementId();
  if (!measurementId) return;

  if (!initialized) {
    initGA4();
  }

  window.gtag?.('event', 'page_view', {
    page_path: sectionPath,
    page_title: `NEXA Calculator — ${title}`,
    page_location: `${window.location.origin}${sectionPath}`,
  });
}

export function trackCalculatorFeature(featureName: string): void {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;
  const measurementId = getMeasurementId();
  if (!measurementId) return;

  if (!initialized) {
    initGA4();
  }

  window.gtag?.('event', 'calculator_feature_used', {
    feature_name: featureName,
  });
}
