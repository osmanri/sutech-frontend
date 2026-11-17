/* Shared language choice and navigation for the public pages (about, demo, results).
   Language: ?lang= wins, then the last choice on this device, then the page default (data-default-lang on <html>). */
(() => {
  'use strict';
  const KEY = 'sutech:site-lang:v1';
  const LANGS = ['en', 'ru', 'kz'];
  const NAV = {
    en: {about: 'Project', demo: 'Try it', results: 'Results', bot: 'Open the bot'},
    ru: {about: 'Проект', demo: 'Попробовать', results: 'Результаты', bot: 'Открыть бота'},
    kz: {about: 'Жоба', demo: 'Байқап көру', results: 'Нәтижелер', bot: 'Ботты ашу'},
  };
  const root = document.documentElement;
  const listeners = [];
  function initial() {
    const p = new URLSearchParams(location.search).get('lang');
    const fromUrl = p === 'kk' ? 'kz' : p;
    if (LANGS.includes(fromUrl)) return fromUrl;
    try { const s = localStorage.getItem(KEY); if (LANGS.includes(s)) return s; } catch (_) { /* private mode */ }
    return LANGS.includes(root.dataset.defaultLang) ? root.dataset.defaultLang : 'en';
  }
  let lang = initial();
  function apply() {
    root.lang = lang === 'kz' ? 'kk' : lang;
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.textContent = NAV[lang][a.dataset.nav];
      if (a.dataset.nav !== 'bot') { const u = new URL(a.getAttribute('href'), location.href); u.searchParams.set('lang', lang); a.href = u.pathname.split('/').pop() + u.search; }
    });
    listeners.forEach(fn => fn(lang));
  }
  function set(next) {
    if (!LANGS.includes(next)) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (_) { /* private mode */ }
    const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
    apply();
  }
  window.SuSite = {
    get lang() { return lang; },
    onLang(fn) { listeners.push(fn); fn(lang); },
    set,
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => set(b.dataset.lang)));
    apply();
  });
})();
