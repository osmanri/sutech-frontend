const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(`${__dirname}/js/theme.js`, 'utf8');

function setup({dark = false, host, legacyMedia = false, storage = new Map(), blockedStorage = false} = {}) {
  const events = {}, mediaEvents = {};
  const root = {dataset: {}, style: {}};
  const meta = {setAttribute(name, value) { this[name] = value; }};
  const media = {matches: dark};
  media[legacyMedia ? 'addListener' : 'addEventListener'] = legacyMedia
    ? fn => mediaEvents.change = fn : (name, fn) => mediaEvents[name] = fn;
  const window = {matchMedia: () => media, addEventListener: (name, fn) => events[name] = fn};
  window.localStorage = {
    getItem(key) { if(blockedStorage) throw Error('blocked'); return storage.get(key) || null; },
    setItem(key,value) { if(blockedStorage) throw Error('blocked'); storage.set(key,value); },
    removeItem(key) { if(blockedStorage) throw Error('blocked'); storage.delete(key); },
  };
  if (host) window.Telegram = {WebApp: host};
  vm.runInNewContext(source, {window, document: {documentElement: root, querySelector: () => meta, addEventListener() {}}});
  return {window, root, meta, events, change(dark) { media.matches = dark; mediaEvents.change(); }};
}
function telegram(version = 8) {
  const calls = [], listeners = [];
  const host = {initData: 'theme-test', colorScheme: 'dark', calls, listeners,
    isVersionAtLeast: value => Number(value) <= version,
    onEvent: (name, fn) => listeners.push({name, fn}),
    setHeaderColor: value => calls.push(['header', value]),
    setBackgroundColor: value => calls.push(['background', value]),
    setBottomBarColor: value => calls.push(['bottom', value])};
  return host;
}
test('device theme applies before paint and follows live changes', () => {
  for (const dark of [false, true]) {
    const app = setup({dark});
    assert.equal(app.root.dataset.theme, dark ? 'dark' : 'light');
    app.change(!dark);
    assert.equal(app.root.dataset.theme, dark ? 'light' : 'dark');
    assert.equal(app.root.style.colorScheme, app.root.dataset.theme);
    assert.equal(app.meta.content, dark ? '#ffffff' : '#0e1712');
  }
});
test('SDK default light outside Telegram does not override device dark mode', () => {
  const host = telegram(); host.initData = ''; host.colorScheme = 'light';
  const app = setup({dark: true, host});
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(host.calls.length, 0);
});
test('Telegram has priority over device, follows themeChanged and syncs chrome', () => {
  const host = telegram(), app = setup({host});
  assert.equal(app.root.dataset.theme, 'dark');
  app.change(false);
  assert.equal(app.root.dataset.theme, 'dark');
  host.colorScheme = 'light'; host.listeners[0].fn();
  assert.equal(app.root.dataset.theme, 'light');
  assert.deepEqual(host.calls.slice(-3), [['header','#ffffff'],['background','#ffffff'],['bottom','#ffffff']]);
});
test('late Telegram SDK connects and repeated connection registers one listener', () => {
  const app = setup(), host = telegram();
  app.window.Telegram = {WebApp: host}; app.events['telegram-ready']();
  app.window.SuTheme.connectTelegram(host);
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(host.listeners.length, 1);
});
test('older clients use supported chrome calls and header keyword', () => {
  const old = telegram(6.5); setup({host: old});
  assert.deepEqual(old.calls, [['header','bg_color'],['background','#0e1712']]);
  const oldest = telegram(6); setup({host: oldest});
  assert.equal(oldest.calls.length, 0);
});
test('one unsupported chrome setter cannot break page theme or remaining setters', () => {
  const host = telegram(); host.setHeaderColor = () => {throw new Error('unsupported');};
  const app = setup({host});
  assert.equal(app.root.dataset.theme, 'dark');
  assert.deepEqual(host.calls, [['background','#0e1712'],['bottom','#0e1712']]);
});
test('legacy media listener and invalid Telegram scheme fall back to device', () => {
  const host = telegram(); host.colorScheme = 'unknown';
  const app = setup({legacyMedia: true, host}); app.change(true);
  assert.equal(app.root.dataset.theme, 'dark');
});
test('manual choice persists across reloads and overrides device and Telegram', () => {
  const storage = new Map(), app = setup({storage});
  app.window.SuTheme.setPreference('dark');
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(setup({storage}).root.dataset.theme, 'dark');
  const host = telegram(); host.colorScheme = 'light';
  const miniApp = setup({host, storage});
  host.listeners[0].fn(); miniApp.change(false);
  assert.equal(miniApp.root.dataset.theme, 'dark');
});
test('returning to automatic clears saved choice and follows the host again', () => {
  const storage = new Map([['sutech:theme:v1','light']]), app = setup({dark:true,storage});
  assert.equal(app.root.dataset.theme, 'light');
  app.window.SuTheme.setPreference('auto');
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(storage.size, 0);
  app.change(false);
  assert.equal(app.root.dataset.theme, 'light');
});
test('invalid saved values are ignored and blocked storage does not break switching', () => {
  const app = setup({dark:true,storage:new Map([['sutech:theme:v1','invalid']])});
  assert.equal(app.root.dataset.theme, 'dark');
  app.window.SuTheme.setPreference('wrong');
  assert.equal(app.root.dataset.theme, 'dark');
  const blocked = setup({blockedStorage:true});
  blocked.window.SuTheme.setPreference('dark');
  assert.equal(blocked.root.dataset.theme, 'dark');
});
test('storage events synchronize another tab', () => {
  const storage = new Map(), app = setup({storage});
  storage.set('sutech:theme:v1','dark');
  app.events.storage({key:'sutech:theme:v1'});
  assert.equal(app.root.dataset.theme, 'dark');
  storage.clear(); app.events.storage({key:null});
  assert.equal(app.root.dataset.theme, 'light');
});
