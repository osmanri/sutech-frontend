/* Follow the host theme before first paint; Telegram takes priority in a Mini App. */
(() => {
  'use strict';
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const connected = new WeakSet();
  const storageKey = 'sutech:theme:v1';
  const copy = {
    ru: {label:'Тема', auto:'Как на устройстве', light:'Светлая', dark:'Тёмная'},
    kz: {label:'Тақырып', auto:'Құрылғыдағыдай', light:'Ашық', dark:'Қараңғы'},
    en: {label:'Theme', auto:'Use device theme', light:'Light', dark:'Dark'},
  };
  let language = 'ru';
  function readPreference() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved === 'light' || saved === 'dark' ? saved : 'auto';
    } catch (_) { return 'auto'; }
  }
  let preference = readPreference();
  let telegram = null;

  function syncLanguage(lang = root.lang) {
    language = copy[lang] ? lang : 'ru';
    const t = copy[language];
    const button = document.getElementById?.('themeToggle');
    if (!button) return;
    const label = `${t.label}: ${t[preference]}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    document.getElementById('themeOptions')?.setAttribute('aria-label', t.label);
    document.querySelectorAll('[data-theme-choice]').forEach(option => {
      option.setAttribute('aria-pressed', String(option.dataset.themeChoice === preference));
      option.querySelector('[data-theme-label]').textContent = t[option.dataset.themeChoice];
    });
    document.querySelectorAll('[data-theme-icon]').forEach(icon => {
      icon.classList.toggle('hidden', icon.dataset.themeIcon !== root.dataset.theme);
    });
  }

  function refresh() {
    const host = telegram || window.Telegram?.WebApp;
    const inTelegram = Boolean(host?.initData);
    const automatic = inTelegram && /^(dark|light)$/.test(host.colorScheme)
      ? host.colorScheme : media?.matches ? 'dark' : 'light';
    const scheme = preference === 'auto' ? automatic : preference;
    const background = scheme === 'dark' ? '#0e1712' : '#ffffff';
    root.dataset.theme = scheme;
    root.style.colorScheme = scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    syncLanguage(language);
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

  function setPreference(value) {
    if (!['auto','light','dark'].includes(value)) return;
    preference = value;
    try {
      if (value === 'auto') window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, value);
    } catch (_) { /* Manual selection still works if storage is unavailable. */ }
    refresh();
  }

  function initControl() {
    const button = document.getElementById('themeToggle');
    const menu = document.getElementById('themeOptions');
    if (!button || !menu) return;
    const close = () => { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); };
    button.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
    });
    document.querySelectorAll('[data-theme-choice]').forEach(option => {
      option.addEventListener('click', () => {
        setPreference(option.dataset.themeChoice);
        close();
        button.focus({preventScroll:true});
      });
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.theme-picker')) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) { close(); button.focus({preventScroll:true}); }
    });
    document.addEventListener('focusin', event => {
      if (!event.target.closest('.theme-picker')) close();
    });
    syncLanguage(root.lang);
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
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) { preference = readPreference(); refresh(); }
  });
  document.addEventListener('DOMContentLoaded', initControl, {once:true});
  window.SuTheme = Object.freeze({ connectTelegram, refresh, setPreference, syncLanguage });
  connectTelegram();
})();
