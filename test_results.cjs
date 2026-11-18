// Results page: data integrity and translation parity (no browser needed).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/data/results.json', 'utf8'));
assert.equal(data.model_vs_model, true, 'the file must keep the model-vs-model flag');
assert.equal(data.combos.length, 4);
for (const c of data.combos) {
  assert.equal(c.n, 25);
  assert.equal(c.seasons_less, 25, 'claim "25 of 25 seasons" must be backed by the data');
  assert.ok(c.ci_low <= c.saving_pct && c.saving_pct <= c.ci_high, `${c.crop}/${c.method}: mean inside its interval`);
  assert.ok(c.worst_pct <= c.saving_pct && c.saving_pct <= c.best_pct, 'mean between worst and best season');
  assert.ok(c.sutech_stress_days === 0 && c.plain_calendar_stress_days > 30);
  assert.ok(c.sutech_m3_ha < c.calendar_m3_ha);
}
for (const m of ['drip', 'furrow']) {
  const byKey = Object.fromEntries(data.sensitivity_cotton[m].map(x => [x.scenario, x]));
  assert.ok(byKey['et0_bias_-20pct'].stress_days > 50, 'the bias scenario must show stress');
  assert.equal(byKey['et0_bias_-20pct_3level_check_7d'].stress_days, 0, 'weekly check removes the stress');
}
const source = fs.readFileSync(__dirname + '/js/results.js', 'utf8').replace(/\r\n/g, '\n');
const T = new Function(source.slice(source.indexOf('const T = ') + 'const T = '.length, source.indexOf('};\n  const root') + 1).replace(/^/, 'return '))();
const keys = o => Object.keys(o).sort().join();
assert.deepEqual(Object.keys(T).sort(), ['en', 'kz', 'ru']);
for (const l of ['kz', 'en']) {
  assert.equal(keys(T[l]), keys(T.ru), `${l}: same keys as ru`);
  assert.equal(keys(T[l].sc), keys(T.ru.sc), `${l}: same scenarios`);
  assert.equal(T[l].honest.length, T.ru.honest.length, `${l}: same number of caveats`);
  assert.equal(T[l].th.length, T.ru.th.length);
}
for (const l of ['ru', 'kz', 'en']) {
  for (const k of Object.keys(T[l].sc)) assert.ok(data.sensitivity_cotton.drip.some(x => x.scenario === k), `${l}: scenario ${k} exists in data`);
  assert.ok(T[l].honest.some(h => h.includes('{worst}')));
}
const html = fs.readFileSync(__dirname + '/results.html', 'utf8');
for (const id of html.match(/data-t="(\w+)"/g).map(x => x.slice(8, -1))) assert.ok(id in T.ru, `html key ${id} defined`);
console.log('results page data and translations: ok');
