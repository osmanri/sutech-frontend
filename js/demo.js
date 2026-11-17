// Browser demo: the bot's own calculation engine (sutech-engine.js is a byte-for-byte copy of the bot's balance.js),
// run on a preset field. Nothing is sent anywhere; no Telegram needed.
import {parseField, calculate, SOILS, METHODS, CROPS, VERSION} from './sutech-engine.js';

// Identical to DEMO_FIELD / DEMO_WEATHER in the bot (serverless/tgcloud/lib/demo.js).
export const DEMO = {crop: 'wheat', soil_type: 'loam', irrigation_type: 'drip', area: 1, day_of_growth: 60,
  moisture_condition: 'dry', et0: 5, rain: 0, pump_power_kw: 22, pump_productivity_m3h: 60, power_price: 25};

export const COPY = {
  en: {
    title: 'Try Su-Tech in your browser', eyebrow: 'Live demo · no Telegram needed',
    lead: 'The same calculation engine as the Telegram bot, running here on a preset field. Change any input and every step is recomputed.',
    inputs: 'Field and weather', reset: "Reset to the bot's demo field",
    crop: 'Crop', soil: 'Soil', method: 'Irrigation', area: 'Area, ha', day: 'Days since sowing', moisture: 'Soil moisture yesterday',
    et0: 'Reference evaporation ET₀, mm/day', rain: 'Rain today, mm', pump: 'Pump', power: 'Power, kW', flow: 'Flow, m³/h', price: 'Tariff, ₸/kWh',
    result: "Today's advice", apply: 'Apply', hours: 'Pump time', cost: 'Electricity', none: 'No irrigation today',
    status: {critical: 'Water now: moisture is below the stress limit', irrigate: 'Irrigation is needed today', deferred: 'No irrigation needed today'},
    how: 'How it is calculated (FAO-56)', yesterday: 'yesterday', deficit: 'Deficit', decision: 'Decision', volume: 'Volume', area_w: 'area',
    ks1: 'Ks = 1: yesterday the root-zone depletion had not yet passed RAW, so the crop was not stressed.',
    ksLow: 'Ks < 1: the depletion was already beyond RAW, so the crop was transpiring less (FAO-56 eq. 84).',
    rainRule: 'Effective rain: below 5 mm counts as 0, otherwise 75 % (project rule).',
    trigger: 'Irrigation trigger = min(technology threshold {t} mm, RAW)',
    dec: {critical: 'deficit is above RAW: water now', irrigate: 'deficit reached the trigger: irrigate', deferred: 'deficit is below the trigger: wait'},
    note: 'This is a model calculation, not a measurement on a real field. Soil and crop parameters are project values, not a local calibration. In the bot, ET₀ and rain come from the Open-Meteo forecast for the field; here you set them yourself.',
    engine: 'Engine', open: 'Calculate your own field in the bot',
    crops: {wheat: 'Wheat', cotton: 'Cotton', corn: 'Maize', alfalfa: 'Alfalfa', melon: 'Melon', tomato: 'Tomato', potato: 'Potato'},
    soils: {sand: 'Sand', loam: 'Loam', clay: 'Clay'},
    methods: {drip: 'Drip', subsurface: 'Subsurface drip', sprinkler: 'Sprinkler', pivot: 'Centre pivot', furrow: 'Furrow'},
    moist: {recent: 'Recently watered / rain', normal: 'Normal', dry: 'Dry'},
    unit: {h: 'h', m3: 'm³', mm: 'mm', d: 'd'},
  },
  ru: {
    title: 'Попробуйте Su-Tech в браузере', eyebrow: 'Живое демо · Telegram не нужен',
    lead: 'Тот же расчётный движок, что и в Telegram-боте, работает здесь на заранее заданном поле. Измените любой параметр — все шаги пересчитаются.',
    inputs: 'Поле и погода', reset: 'Вернуть демо-поле бота',
    crop: 'Культура', soil: 'Почва', method: 'Способ полива', area: 'Площадь, га', day: 'Дней от посева', moisture: 'Влажность почвы вчера',
    et0: 'Испаряемость ET₀, мм/сут', rain: 'Дождь сегодня, мм', pump: 'Насос', power: 'Мощность, кВт', flow: 'Подача, м³/ч', price: 'Тариф, ₸/кВт·ч',
    result: 'Совет на сегодня', apply: 'Подать', hours: 'Работа насоса', cost: 'Электричество', none: 'Сегодня не поливать',
    status: {critical: 'Поливать сейчас: запас влаги ниже порога стресса', irrigate: 'Сегодня нужен полив', deferred: 'Сегодня можно не поливать'},
    how: 'Как это посчитано (FAO-56)', yesterday: 'вчера', deficit: 'Дефицит', decision: 'Решение', volume: 'Объём', area_w: 'площадь',
    ks1: 'Ks = 1: вчера дефицит ещё не превысил RAW, растение не испытывало стресса.',
    ksLow: 'Ks < 1: дефицит уже больше RAW, растение испаряет меньше (FAO-56, ур. 84).',
    rainRule: 'Эффективный дождь: меньше 5 мм не учитывается, иначе 75 % (правило проекта).',
    trigger: 'Порог полива = min(порог технологии {t} мм, RAW)',
    dec: {critical: 'дефицит больше RAW: поливать сейчас', irrigate: 'дефицит достиг порога: поливать', deferred: 'дефицит ниже порога: ждать'},
    note: 'Это расчёт по модели, а не измерение на реальном поле. Параметры почвы и культуры — значения проекта, не местная калибровка. В боте ET₀ и дождь берутся из прогноза Open-Meteo для поля, здесь вы задаёте их сами.',
    engine: 'Движок', open: 'Рассчитать своё поле в боте',
    crops: {wheat: 'Пшеница', cotton: 'Хлопок', corn: 'Кукуруза', alfalfa: 'Люцерна', melon: 'Бахча', tomato: 'Томаты', potato: 'Картофель'},
    soils: {sand: 'Песок', loam: 'Суглинок', clay: 'Глина'},
    methods: {drip: 'Капельный', subsurface: 'Подпочвенный', sprinkler: 'Дождевание', pivot: 'Фронтальный (pivot)', furrow: 'Арычный'},
    moist: {recent: 'Недавно полито / дождь', normal: 'Нормальная', dry: 'Сухая'},
    unit: {h: 'ч', m3: 'м³', mm: 'мм', d: 'дн.'},
  },
  kz: {
    title: 'Su-Tech-ті браузерде байқап көріңіз', eyebrow: 'Тірі демо · Telegram қажет емес',
    lead: 'Telegram-боттағы есептеу қозғалтқышы мұнда алдын ала берілген алқапта жұмыс істейді. Кез келген параметрді өзгертіңіз — барлық қадам қайта есептеледі.',
    inputs: 'Алқап және ауа райы', reset: 'Боттың демо алқабын қайтару',
    crop: 'Дақыл', soil: 'Топырақ', method: 'Суару тәсілі', area: 'Аудан, га', day: 'Егілгеннен бергі күн', moisture: 'Кешегі топырақ ылғалдылығы',
    et0: 'Буланушылық ET₀, мм/тәул', rain: 'Бүгінгі жауын, мм', pump: 'Сорғы', power: 'Қуаты, кВт', flow: 'Беруі, м³/сағ', price: 'Тариф, ₸/кВт·сағ',
    result: 'Бүгінгі кеңес', apply: 'Беру', hours: 'Сорғы жұмысы', cost: 'Электр қуаты', none: 'Бүгін суармау',
    status: {critical: 'Қазір суару: ылғал қоры стресс шегінен төмен', irrigate: 'Бүгін суару қажет', deferred: 'Бүгін суармаса болады'},
    how: 'Бұл қалай есептелді (FAO-56)', yesterday: 'кеше', deficit: 'Тапшылық', decision: 'Шешім', volume: 'Көлем', area_w: 'аудан',
    ks1: 'Ks = 1: кеше тапшылық RAW-дан әлі аспаған, өсімдік стресс көрмеген.',
    ksLow: 'Ks < 1: тапшылық RAW-дан асқан, өсімдік азырақ буландырады (FAO-56, 84-теңдеу).',
    rainRule: 'Тиімді жауын: 5 мм-ден аз болса есептелмейді, әйтпесе 75 % (жоба ережесі).',
    trigger: 'Суару шегі = min(технология шегі {t} мм, RAW)',
    dec: {critical: 'тапшылық RAW-дан көп: қазір суару', irrigate: 'тапшылық шекке жетті: суару', deferred: 'тапшылық шектен төмен: күту'},
    note: 'Бұл нақты алқаптағы өлшеу емес, модель есебі. Топырақ пен дақыл параметрлері — жоба мәндері, жергілікті калибрлеу емес. Ботта ET₀ мен жауын алқапқа арналған Open-Meteo болжамынан алынады, мұнда оларды өзіңіз бересіз.',
    engine: 'Қозғалтқыш', open: 'Өз алқабыңызды ботта есептеу',
    crops: {wheat: 'Бидай', cotton: 'Мақта', corn: 'Жүгері', alfalfa: 'Жоңышқа', melon: 'Бақша', tomato: 'Қызанақ', potato: 'Картоп'},
    soils: {sand: 'Құм', loam: 'Саз балшық', clay: 'Саз'},
    methods: {drip: 'Тамшылатып', subsurface: 'Жер асты тамшылатып', sprinkler: 'Жаңбырлатып', pivot: 'Фронтальды (pivot)', furrow: 'Арықпен'},
    moist: {recent: 'Жақында суарылды / жауын', normal: 'Қалыпты', dry: 'Құрғақ'},
    unit: {h: 'сағ', m3: 'м³', mm: 'мм', d: 'күн'},
  },
};

export const seasonLength = crop => CROPS[crop][4].reduce((a, b) => a + b, 0);

export function compute(input) {
  const field = parseField({balance_version: 2, crop: input.crop, soil_type: input.soil_type, irrigation_type: input.irrigation_type,
    area: input.area, area_unit: 'hectare', day_of_growth: input.day_of_growth, moisture_condition: input.moisture_condition,
    pump_power_kw: input.pump_power_kw, pump_productivity_m3h: input.pump_productivity_m3h, power_price: input.power_price});
  return {field, result: calculate(field, input.et0, input.rain)};
}

export function formatter(lang) {
  const loc = lang === 'en' ? 'en-US' : lang === 'kz' ? 'kk-KZ' : 'ru-RU';
  return (n, d = 1) => new Intl.NumberFormat(loc, {minimumFractionDigits: d, maximumFractionDigits: d}).format(n);
}

// Every step as {title, formula, value}; shared by the page and the tests.
export function explain(field, r, input, lang) {
  const t = COPY[lang], f = formatter(lang), u = t.unit;
  const [fc, wp] = SOILS[field.soil], [tech, eff] = METHODS[field.method];
  const steps = [
    {title: 'TAW', formula: `1000 × (θfc − θwp) × Zr = 1000 × (${f(fc, 2)} − ${f(wp, 2)}) × ${f(field.zr, 2)}`, value: `${f(r.taw)} ${u.mm}`},
    {title: 'RAW', formula: `p × TAW = ${f(field.p, 2)} × ${f(r.taw)}`, value: `${f(r.raw)} ${u.mm}`},
    {title: 'ETc', formula: `Ks × Kc × ET₀ = ${f(r.ks, 2)} × ${f(field.kc, 2)} × ${f(r.et0)}`, value: `${f(r.etc)} ${u.mm}`, note: r.ks >= 1 ? t.ks1 : t.ksLow},
    {title: t.deficit, formula: `${t.yesterday} + ETc − Peff = ${f(field.yesterday)} + ${f(r.etc)} − ${f(r.peff)}`, value: `${f(r.deficit)} ${u.mm}`, note: input.rain > 0 ? t.rainRule : ''},
    {title: t.decision, formula: `${t.trigger.replace('{t}', f(tech, 0))} = ${f(r.threshold)} ${u.mm}`, value: t.dec[r.status]},
  ];
  if (r.status !== 'deferred') {
    steps.push({title: t.volume, formula: `${t.deficit} × 10 × ${t.area_w} ÷ η = ${f(r.deficit)} × 10 × ${f(field.area_ha, 2)} ÷ ${f(eff, 2)}`, value: `${f(r.gross_m3, 0)} ${u.m3}`});
    steps.push({title: t.pump, formula: `${f(r.gross_m3, 0)} ÷ ${f(field.pump_productivity_m3h, 0)} = ${f(r.ai_time_hours)} ${u.h}; ${f(r.ai_time_hours)} × ${f(field.pump_power_kw, 0)} kW × ${f(field.power_price, 0)} ₸`, value: `${f(r.cost, 0)} ₸`});
  }
  return steps;
}

if (typeof document !== 'undefined') {
  const $ = id => document.getElementById(id);
  let input = {...DEMO};
  const fields = {
    crop: ['select', 'crops', Object.keys(CROPS)], soil_type: ['select', 'soils', Object.keys(SOILS)],
    irrigation_type: ['select', 'methods', Object.keys(METHODS)], moisture_condition: ['select', 'moist', ['recent', 'normal', 'dry']],
    area: ['number'], day_of_growth: ['range'], et0: ['range'], rain: ['range'],
    pump_power_kw: ['number'], pump_productivity_m3h: ['number'], power_price: ['number'],
  };
  function fillSelects(lang) {
    for (const [k, [kind, dict, keys]] of Object.entries(fields)) {
      if (kind !== 'select') continue;
      const sel = $(k), names = COPY[lang][dict];
      sel.replaceChildren(...keys.map(v => Object.assign(document.createElement('option'), {value: v, textContent: names[v]})));
      sel.value = input[k];
    }
  }
  function syncControls() {
    const max = seasonLength(input.crop);
    $('day_of_growth').max = String(max);
    if (input.day_of_growth > max) input.day_of_growth = max;
    for (const k of Object.keys(fields)) $(k).value = input[k];
  }
  function render() {
    const lang = window.SuSite?.lang || 'en', t = COPY[lang], f = formatter(lang);
    document.title = `Su-Tech — ${t.title}`;
    document.querySelectorAll('[data-c]').forEach(n => { n.textContent = t[n.dataset.c]; });
    $('out-day').textContent = `${input.day_of_growth} ${t.unit.d}`;
    $('out-et0').textContent = `${f(input.et0)} ${t.unit.mm}`;
    $('out-rain').textContent = `${f(input.rain)} ${t.unit.mm}`;
    let field, r;
    try { ({field, result: r} = compute(input)); } catch (_) { $('status').textContent = '—'; return; }
    $('status').textContent = t.status[r.status];
    $('status').dataset.status = r.status;
    $('m3').textContent = r.status === 'deferred' ? t.none : `${f(r.gross_m3, 0)} ${t.unit.m3}`;
    $('hours').textContent = r.status === 'deferred' ? '—' : `${f(r.ai_time_hours)} ${t.unit.h}`;
    $('cost').textContent = r.status === 'deferred' ? '—' : `${f(r.cost, 0)} ₸`;
    $('steps').replaceChildren(...explain(field, r, input, lang).map(s => {
      const li = document.createElement('li');
      const h = document.createElement('div'); h.className = 'step-head';
      const b = document.createElement('b'); b.textContent = s.title;
      const v = document.createElement('span'); v.className = 'step-value'; v.textContent = s.value;
      h.append(b, v);
      const code = document.createElement('code'); code.textContent = s.formula;
      li.append(h, code);
      if (s.note) { const p = document.createElement('p'); p.className = 'muted small'; p.textContent = s.note; li.append(p); }
      return li;
    }));
    $('engine').textContent = `${t.engine}: ${VERSION}`;
  }
  document.addEventListener('DOMContentLoaded', () => {
    for (const [k, [kind]] of Object.entries(fields)) {
      $(k).addEventListener('input', e => {
        const v = e.target.value;
        input[k] = kind === 'select' ? v : Number(v);
        if (k === 'crop') syncControls();
        render();
      });
    }
    $('reset').addEventListener('click', () => { input = {...DEMO}; syncControls(); render(); });
    window.SuSite.onLang(lang => { fillSelects(lang); syncControls(); render(); });
  });
}
