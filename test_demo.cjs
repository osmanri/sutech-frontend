// Browser demo: runs the bot's engine copy on the bot's demo field and explains every step.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {pathToFileURL} = require('node:url');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sutech-demo-'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
  for (const f of ['sutech-engine.js', 'crops-data.js', 'demo.js']) fs.copyFileSync(path.join(__dirname, 'js', f), path.join(dir, f));
  const demo = await import(pathToFileURL(path.join(dir, 'demo.js')).href);

  const {result: r, field} = demo.compute(demo.DEMO);
  assert.strictEqual(r.status, 'critical');
  assert.ok(Math.abs(r.taw - 187.5) < 1e-9 && Math.abs(r.raw - 103.125) < 1e-9 && Math.abs(r.deficit - 108.875) < 1e-9);
  assert.ok(Math.abs(r.gross_m3 - 1088.75 / 0.9) < 1e-9);
  assert.ok(Math.abs(r.cost - 1088.75 / 0.9 / 60 * 22 * 25) < 1e-9);

  for (const lang of ['en', 'ru', 'kz']) {
    const steps = demo.explain(field, r, demo.DEMO, lang);
    assert.strictEqual(steps.length, 7, lang);
    steps.forEach(s => assert.ok(s.title && s.formula && s.value, `${lang} step`));
    assert.deepStrictEqual(Object.keys(demo.COPY[lang]).sort(), Object.keys(demo.COPY.en).sort(), `${lang} keys`);
  }
  const split = demo.explain(field, r, demo.DEMO, 'en').find(x => x.title === demo.COPY.en.pump);
  assert.ok(split && /split over 2 days/.test(split.note), 'demo (1 210 m3 vs 1 200 m3/day) shows the pump split');
  const wait = demo.compute({...demo.DEMO, moisture_condition: 'recent', et0: 2});
  assert.strictEqual(wait.result.status, 'deferred');
  assert.strictEqual(demo.explain(wait.field, wait.result, demo.DEMO, 'en').length, 5, 'no volume or pump step when waiting');

  const html = fs.readFileSync(path.join(__dirname, 'demo.html'), 'utf8');
  for (const id of ['crop', 'soil_type', 'irrigation_type', 'area', 'moisture_condition', 'day_of_growth', 'et0', 'rain',
    'pump_power_kw', 'pump_productivity_m3h', 'power_price', 'reset', 'status', 'm3', 'hours', 'cost', 'steps', 'engine'])
    assert.ok(html.includes(`id="${id}"`), `demo.html has #${id}`);
  for (const key of new Set([...html.matchAll(/data-c="(\w+)"/g)].map(m => m[1]))) assert.ok(key in demo.COPY.en, `copy for ${key}`);

  // about.js: every language has the same sections with the same number of items
  const src = fs.readFileSync(path.join(__dirname, 'js', 'about.js'), 'utf8');
  const sandbox = {document: {addEventListener() {}}, window: {}};
  new Function('document', 'window', src.replace("document.addEventListener('DOMContentLoaded'", 'window.C = C; document.addEventListener(\'DOMContentLoaded\''))(sandbox.document, sandbox.window);
  const C = sandbox.window.C;
  for (const lang of ['ru', 'kz']) for (const [k, v] of Object.entries(C.en)) {
    assert.ok(k in C[lang], `about ${lang}.${k}`);
    if (Array.isArray(v)) assert.strictEqual(C[lang][k].length, v.length, `about ${lang}.${k} length`);
  }
  // Crop picker: the catalog the Mini App shows equals the crops the engine knows.
  const vm = require('vm');
  const pickerBox = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'js', 'crops-catalog.js'), 'utf8'), pickerBox);
  const picked = JSON.parse(JSON.stringify(pickerBox.window.SU_CROPS));  // leave the vm realm
  const engine = await import(pathToFileURL(path.join(dir, 'sutech-engine.js')).href);
  assert.deepStrictEqual(picked.map(c => c.key), Object.keys(engine.CROPS), 'picker list = engine crops');
  for (const c of picked) {
    assert.ok(c.names.ru && c.names.kz && c.names.en, `${c.key} has three names`);
    assert.deepStrictEqual(c.stages, engine.CROPS[c.key][4], `${c.key} default calendar = engine calendar`);
  }
  const html2 = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(html2.indexOf('js/crops-catalog.js') < html2.indexOf('js/balance.js'), 'catalog must load before balance.js');
  assert.ok(html2.includes('id="cropMore"'), 'picker present');
  // Privacy page: the same sections in all three languages; every public page links to it.
  const pv = fs.readFileSync(path.join(__dirname, 'js', 'privacy.js'), 'utf8');
  const box = {document: {addEventListener() {}, getElementById() {}}, window: {}};
  vm.runInNewContext(pv.replace("document.addEventListener('DOMContentLoaded'", "window.C = C; document.addEventListener('DOMContentLoaded'"), box);
  const P = JSON.parse(JSON.stringify(box.window.C));
  for (const lang of ['ru', 'kz']) assert.strictEqual(P[lang].sections.length, P.en.sections.length, `privacy ${lang} sections`);
  for (const lang of ['en', 'ru', 'kz']) for (const [h, items] of P[lang].sections) assert.ok(h && items.length, 'privacy section filled');
  for (const page of ['about.html', 'demo.html', 'results.html']) assert.ok(fs.readFileSync(path.join(__dirname, page), 'utf8').includes('privacy.html'), `${page} links to privacy`);
  console.log('demo and about tests passed');
})().catch(e => { console.error(e); process.exit(1); });
