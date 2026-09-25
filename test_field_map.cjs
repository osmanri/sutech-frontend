// Run: node frontend/test_field_map.cjs (no external dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const elements = new Map();
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
for (const [, id] of html.matchAll(/id="([^"]+)"/g)) {
  elements.set(id, {
    value: '', style: {}, textContent: '', classList: { add() {}, remove() {}, toggle() {} },
    attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; }, scrollIntoView() {},
    focus() {}, closest() { return null; }, addEventListener() {},
  });
}
// Model the input defaults used by the real WebApp.
for (const tag of html.matchAll(/<input\b[^>]*>/g)) {
  const id = tag[0].match(/id="([^"]+)"/)?.[1];
  const value = tag[0].match(/value="([^"]*)"/)?.[1];
  if (id && value !== undefined) elements.get(id).value = value;
}
let sent;
let gpsSuccess;
let lastFlyTo;
const layers = [];
const tileRequests = [];
const layer = () => ({ addTo() { return this; }, on() { return this; }, setLatLng() { return this; } });
const L = {
  map: () => ({ ...layer(), setView() { return this; }, flyTo(...args) { lastFlyTo = args; }, removeLayer() {}, invalidateSize() {} }),
  control: { zoom: layer },
  tileLayer: url => {
    const tile = { ...layer(), handlers: {}, on(name, handler) { this.handlers[name] = handler; return this; } };
    tileRequests.push({ url, tile });
    return tile;
  }, marker: layer,
  layerGroup: () => ({ ...layer(), clearLayers() { layers.length = 0; } }),
  polygon: (points, options) => { layers.push({ points, options }); return layer(); },
  polyline: layer, circleMarker: layer, circle: layer,
};
const tg = { initData: 'test-launch', ready() {}, expand() {}, close() {}, sendData(value) { sent = JSON.parse(value); } };
const context = vm.createContext({
  console: { log() {}, warn() {}, error() {} }, L,
  window: { L, Telegram: { WebApp: tg }, matchMedia: () => ({ matches: true }), addEventListener() {} },
  document: { getElementById: id => elements.get(id), querySelectorAll: () => [], querySelector: () => null, addEventListener() {} },
  navigator: { geolocation: { getCurrentPosition(success) { gpsSuccess = success; } } },
  setTimeout(callback, delay) { if (delay < 10000) callback(); }, clearTimeout() {}, requestAnimationFrame(callback) { callback(); },
});
vm.runInContext(fs.readFileSync(`${__dirname}/js/balance.js`, 'utf8'), context);
vm.runInContext(fs.readFileSync(`${__dirname}/js/app.js`, 'utf8'), context);
const run = code => vm.runInContext(code, context);
elements.get('soilType').value = 'loam';
elements.get('growthDay').value = '60';
elements.get('moistureCondition').value = 'normal';
run("window.SuBalance.init('cotton', 'open', 'ru')");
const near = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
assert.equal(run('state.latitude'), null, 'A new farmer must not inherit Atyrau as their field');
assert.equal(run('state.longitude'), null);
assert.equal(run('state.area'), 0, 'The sample 10 ha must not count as entered data');
assert.match(html, /<option value="" selected data-copy="selectRegionPrompt">/);
assert.match(html, /id="fieldAreaInput"[\s\S]*?value="" placeholder=/);
run('submitFinalCalculation()');
assert.equal(sent, undefined, 'No location or area must never send a calculation');

// First-paint mobile slider uses rendered rectangles, not offsets from another ancestor.
const indicator = { style: {} };
const switcher = {
  getBoundingClientRect: () => ({ left: 100, width: 180 }),
  querySelector: () => indicator,
  classList: { contains: () => false, add() {} },
};
elements.get('langBtnRu').getBoundingClientRect = () => ({ left: 103, width: 48 });
const originalQuerySelector = context.document.querySelector;
context.document.querySelector = selector => selector === '.language-switch' ? switcher : null;
run("positionLanguageIndicator('ru')");
assert.equal(indicator.style.width, '48px');
assert.equal(indicator.style.transform, 'translate3d(3px, 0, 0)');
context.document.querySelector = originalQuerySelector;

// Approximately 100 x 100 metres at the equator, independently specified in degrees.
const square = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.00089831528412 },
  { lat: 0.00090436947705, lng: 0.00089831528412 }, { lat: 0.00090436947705, lng: 0 }];
context.square = square;
near(run('calculatePolygonArea(square)'), 10000, 0.1);
near(run('calculatePolygonArea([...square].reverse())'), 10000, 0.1);
near(run('calculatePolygonArea(square.slice(0, 3))'), 5000, 0.1);
assert.equal(run('calculatePolygonArea([])'), 0);
assert.equal(run('isSimpleFieldPolygon([square[0], square[2], square[1], square[3]])'), false);
assert.equal(run('isSimpleFieldPolygon([square[0], square[1], square[1], square[3]])'), false);
assert.equal(run('isSimpleFieldPolygon([{lat:0,lng:0},{lat:0,lng:1},{lat:0,lng:2}])'), false);
// The same angular rectangle covers less ground at northern latitudes.
const northRatio = run('calculatePolygonArea(square.map(p => ({lat:p.lat + 60,lng:p.lng}))) / calculatePolygonArea(square)');
assert.ok(northRatio > 0.50 && northRatio < 0.51);

run('initFieldMap()');
assert.match(tileRequests[0].url, /World_Imagery/, 'The default basemap must be satellite imagery');
// A blocked tile provider must not leave the user with a permanently grey map.
tileRequests[0].tile.handlers.tileerror();
assert.ok(tileRequests.length > 1, 'Grey map: failed tile provider has no automatic fallback');
assert.notEqual(tileRequests[0].url, tileRequests[1].url);
assert.match(tileRequests[1].url, /World_Street_Map/, 'Street map must remain available as a fallback');
tileRequests[1].tile.handlers.tileerror();
assert.equal(run('mapTilesFailed'), true, 'Both sources failing must show a recovery state');
const failedCount = tileRequests.length;
run('retryFieldMap()');
assert.equal(tileRequests.length, failedCount + 1);
tileRequests.at(-1).tile.handlers.tileload();
assert.equal(run('mapTilesFailed'), false, 'Successful retry must clear the error');
run('square.forEach(addFieldPoint)');
assert.equal(elements.get('fieldAreaInput').readOnly, false, 'Map selection must not lock manual area input');
near(Number(elements.get('fieldAreaInput').value), 1, 0.00001);
assert.equal(layers[0].options.fillColor, '#087FE0');
assert.equal(layers[0].options.fillOpacity, 0.25);
run("setAreaUnit('sotka')");
near(Number(elements.get('fieldAreaInput').value), 100, 0.001);
run('submitFinalCalculation()');
near(sent.area, 100, 0.001);
assert.equal(sent.area_unit, 'sotka');
assert.equal(sent.pump_power_kw, 22);
assert.equal(sent.pump_productivity_m3h, 60);
assert.equal(sent.energy_kwh_m3, undefined);
assert.equal(sent.latitude, 0);
assert.equal(sent.balance_version, 2);
assert.equal(sent.moisture_condition, 'normal');
assert.equal(sent.yesterday_deficit, undefined);
assert.deepEqual(sent.stage_days, [30,50,60,55]);
assert.equal(sent.kc, undefined, 'Legacy fixed Kc must not override the stage calculation');
run('undoFieldPoint()');
near(run('mappedAreaM2'), 5000, 0.1);
run('resetFieldContour()');
assert.equal(run('state.area'), 0);
assert.equal(elements.get('fieldAreaInput').readOnly, false);
run('addFieldPoint({lat: 44, lng: 65})');
elements.get('fieldAreaInput').value = '2.5';
run("handleAreaChange('2.5')");
assert.equal(run('fieldMode'), 'manual', 'Typing area must leave incomplete map mode');
assert.equal(run('fieldPoints.length'), 0, 'Manual area must clear the stale map contour');
near(run('state.area'), 2.5);
for (const unit of ['hectare', 'sotka']) {
  run(`setAreaUnit('${unit}')`);
  for (const value of ['6,7', '6.7']) {
    elements.get('fieldAreaInput').value = value;
    run(`handleAreaChange('${value}')`);
    near(run('state.area'), 6.7);
    sent = undefined;
    run('isSubmitting = false; submitFinalCalculation()');
    assert.ok(sent, 'Decimal area must submit');
    near(sent.area, 6.7);
    assert.equal(sent.area_unit, unit);
  }
}
run("handleAreaChange('1'); setAreaUnit('hectare')");
near(run('state.area'), 0.01);
elements.get('fieldAreaInput').value = '';
sent = undefined;
run('submitFinalCalculation()');
assert.equal(sent, undefined, 'Empty manual area must not send the previous value');

run('requestGeolocation()');
gpsSuccess({ coords: { latitude: 44, longitude: 65, accuracy: 12 } });
assert.equal(lastFlyTo[1], 17);
assert.equal(run('state.latitude'), 44);
assert.equal(elements.get('btnUndoPoint').disabled, false);
run('clearCurrentLocation()');
assert.equal(run('state.latitude'), null);
assert.equal(run('state.longitude'), null);
assert.equal(elements.get('btnUndoPoint').disabled, true);
run('requestGeolocation()');
gpsSuccess({ coords: { latitude: 44, longitude: 65, accuracy: 12 } });
elements.get('fieldRadiusInput').value = '100';
run('usePointRadius()');
near(run('mappedAreaM2'), Math.PI * 10000);
run("setAreaUnit('sotka'); setAreaUnit('hectare')");
near(run('state.area'), Math.PI);
elements.get('fieldRadiusInput').value = '-1';
run('updatePointRadius()');
assert.equal(run('state.area'), 0);
run("state.lang = 'kz'; updateMapUI()");
assert.equal(elements.get('btnResetContour').textContent, 'Контурды тазарту');
run('resetFieldContour(); square.forEach(addFieldPoint); requestGeolocation()');
gpsSuccess({ coords: { latitude: 45, longitude: 66, accuracy: 10 } });
assert.equal(run('state.latitude'), 0, 'GPS must not relocate a drawn field');
run('resetFieldContour(); window.L = undefined; updateMapUI()');
assert.equal(elements.get('btnUseRadius').disabled, true);
assert.equal(elements.get('fieldAreaInput').readOnly, false);
// Mandatory inputs fail closed, including empty and malformed decimals.
elements.get('moistureCondition').value = '';
assert.equal(run('window.SuBalance.payload()'), null);
elements.get('moistureCondition').value = 'dry';
assert.equal(run('window.SuBalance.payload().moisture_condition'), 'dry');
elements.get('stageInitial').value = '32';
run("window.SuBalance.sync('wheat','open','kz'); window.SuBalance.sync('cotton','open','ru')");
assert.equal(elements.get('stageInitial').value, '32', 'Keep edited calendar when switching crops');
run("window.SuBalance.sync('wheat','open','ru')");
assert.deepEqual(
  ['stageInitial','stageDevelopment','stageMiddle','stageLate'].map(id => Number(elements.get(id).value)),
  [20,25,60,30],
  'Selecting a crop must fill its standard stage calendar'
);
run("window.SuBalance.sync('cotton','open','ru')");
run("window.SuBalance.sync('cotton','greenhouse','ru')");
assert.equal(run('window.SuBalance.complete()'), true, 'Greenhouse must work without expert ET0 input');
assert.equal(run('window.SuBalance.payload().greenhouse_et0'), undefined, 'Empty expert override must stay absent');
elements.get('greenhouseEt0').value = '2,5';
near(run('window.SuBalance.payload().greenhouse_et0'), 2.5);
run("window.SuBalance.sync('other','open','ru')");
assert.equal(run('window.SuBalance.payload()'), null);
elements.get('customKc').value = '1,1';
elements.get('customP').value = '0,5';
elements.get('customRoot').value = '0,8';
near(run('window.SuBalance.payload().custom_root_depth'), .8);
// Pump fields accept local decimals and reject a zero flow before submission.
elements.get('powerPrice').value = '25,5';
elements.get('pumpPower').value = '22,5';
elements.get('pumpProductivity').value = '60,5';
near(run('window.SuBalance.payload().pump_power_kw'), 22.5);
near(run('window.SuBalance.payload().pump_productivity_m3h'), 60.5);
for (const invalid of ['0', '-1', 'NaN', 'Infinity', '6,7,8']) {
  elements.get('pumpProductivity').value = invalid;
  assert.equal(run('window.SuBalance.payload()'), null);
}
elements.get('pumpProductivity').value = '60';
elements.get('powerPrice').value = '';
assert.equal(run('window.SuBalance.payload().power_price'), null, 'Tariff remains optional');
// A regular browser must not claim that a Telegram calculation was sent.
run("window.SuBalance.sync('wheat','open','ru')");
elements.get('moistureCondition').value = 'normal';
elements.get('fieldAreaInput').value = '1';
run("handleAreaChange('1')");
run('state.latitude = 44; state.longitude = 65; isSubmitting = false');
tg.initData = '';
sent = undefined;
run('submitFinalCalculation()');
assert.equal(sent, undefined, 'Outside Telegram there is no real sendData delivery');
tg.initData = 'test-launch';
console.log('PASS: map, decimal input, pump payload, calendars, greenhouse and custom crop validation');
