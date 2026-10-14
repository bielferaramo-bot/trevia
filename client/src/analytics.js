/**
 * Trevia Analytics & Conversion Tracking Module
 * Suporta Meta Pixel (Facebook & Instagram Ads) e Google Tag (Google Ads / GA4)
 */

export function initMarketingPixels() {
  const cfg = window.TREVIA_MARKETING || {};

  // Meta Pixel Initialization if configured
  if (cfg.metaPixelId && !window.fbq) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', cfg.metaPixelId);
    window.fbq('track', 'PageView');
    console.log('[Trevia Analytics] Meta Pixel inicializado:', cfg.metaPixelId);
  }

  // Google Tag Initialization if configured
  if (cfg.googleTagId && !window.gtag) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.googleTagId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', cfg.googleTagId);
    console.log('[Trevia Analytics] Google Tag inicializada:', cfg.googleTagId);
  }
}

/**
 * Dispara eventos de conversão de tráfego pago
 * @param {string} eventName - Ex: 'SubmitOrder', 'Lead', 'Contact', 'ViewContent'
 * @param {object} params - Dados complementares (categoria, valor, localidade)
 */
export function trackConversion(eventName, params = {}) {
  try {
    // 1. Meta Pixel
    if (window.fbq) {
      window.fbq('track', eventName, params);
    }

    // 2. Google Analytics / Google Ads
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }

    // 3. Console informativo para debug
    console.log(`[Trevia Conversion] ${eventName}:`, params);
  } catch (err) {
    console.warn('[Trevia Analytics Error]:', err);
  }
}
