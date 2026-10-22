/* Follow the host theme before first paint; Telegram takes priority in a Mini App. */
(() => {
  'use strict';
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const connected = new WeakSet();
  let telegram = null;

  function refresh() {
    const host = telegram || window.Telegram?.WebApp;
    const inTelegram = Boolean(host?.initData);
    const scheme = inTelegram && /^(dark|light)$/.test(host.colorScheme)
      ? host.colorScheme : media?.matches ? 'dark' : 'light';
    const background = scheme === 'dark' ? '#0e1712' : '#ffffff';
    root.dataset.theme = scheme;
    root.style.colorScheme = scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    if (!inTelegram) return;
    const supports = version => host.isVersionAtLeast?.(version) === true;
    const set = (method, value) => {
      try { host[method]?.(value); } catch (_) { /* Older clients retain native chrome. */ }
    };
    if (supports('6.1')) {
      set('setHeaderColor', supports('6.9') ? background : 'bg_color');
      set('setBackgroundColor', background);
    }
    if (supports('7.10')) set('setBottomBarColor', background);
  }

  function connectTelegram(host = window.Telegram?.WebApp) {
    if (host) {
      telegram = host;
      if (typeof host.onEvent === 'function' && !connected.has(host)) {
        host.onEvent('themeChanged', refresh);
        connected.add(host);
      }
    }
    refresh();
  }

  if (media?.addEventListener) media.addEventListener('change', refresh);
  else media?.addListener?.(refresh);
  window.addEventListener('telegram-ready', () => connectTelegram());
  window.addEventListener('pageshow', refresh);
  window.SuTheme = Object.freeze({ connectTelegram, refresh });
  connectTelegram();
})();
