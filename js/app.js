/**
 * Su-Tech — Интеллектуальная система точного земледелия (Telegram WebApp)
 * Расчёт норм полива по модели FAO-56 Penman-Monteith
 * Design System: Clean Light Agro (master.md v1.0)
 * v3.0.0 — 8 культур, 5 методов полива, Vanilla CSS tokens
 */

// ─── 1. Инициализация Telegram WebApp SDK ──────────────────────────────────
const tg = window.Telegram?.WebApp || {
  ready:   () => {},
  expand:  () => {},
  close:   () => {},
  sendData: (data) => console.log('[Su-Tech] Telegram.WebApp.sendData:', data),
  HapticFeedback: {
    impactOccurred:       () => {},
    notificationOccurred: () => {},
  },
};

try {
  tg.ready();
  tg.expand();
} catch (err) {
  console.warn('[Su-Tech] Telegram WebApp не обнаружен, режим браузера:', err);
}

// ─── 2. Состояние приложения ───────────────────────────────────────────────
const state = {
  latitude:         null,
  longitude:        null,
  accuracy:         null,
  crop:             'cotton',       // 8 культур
  area:             10.0,
  area_unit:        'hectare',      // 'hectare' | 'sotka'
  irrigation_type:  'drip',         // 5 методов
  lang:             'ru',           // 'ru' | 'kz'
  isRequestingGps:  false,
};

// ─── 3. Данные культур (Kc-коэффициенты FAO-56) ───────────────────────────
const CROPS = {
  wheat:     { kc: 1.10 },
  cotton:    { kc: 1.15 },
  corn:      { kc: 1.20 },
  rice:      { kc: 1.25 },
  alfalfa:   { kc: 1.05 },
  tomato:    { kc: 1.15 },
  sunflower: { kc: 1.00 },
  potato:    { kc: 1.10 },
};

// ─── 4. Данные методов полива ─────────────────────────────────────────────
const IRRIGATION_EFFICIENCY = {
  drip:       0.90,
  sprinkler:  0.75,
  pivot:      0.80,
  furrow:     0.50,
  subsurface: 0.95,
};

// ─── 5. Словарь локализации (i18n: KZ / RU) ──────────────────────────────
const I18N = {
  ru: {
    pageTitle:      'Su-Tech — Точное земледелие',
    pageDesc:       'Интеллектуальная система управления орошением на базе модели FAO-56 Penman-Monteith',
    headerSubtitle: 'Точное земледелие • РКНП «Дарын»',

    block1Title:        'Локация участка (GPS)',
    block1StatusWait:   'Ожидает GPS',
    block1StatusReady:  'Координаты определены',
    block1Desc:         'Определите координаты поля для автоматического запроса спутниковой радиации, ветра и влажности почвы по модели FAO-56.',
    btnLocationText:    'Определить GPS координаты',
    btnLocationLoading: 'Поиск спутников...',
    gpsSearching:       'Определение точных спутниковых координат...',
    coordsCardTitle:    'Координаты зафиксированы',
    labelLat:           'Широта (Lat):',
    labelLon:           'Долгота (Lon):',
    demoCoordsText:     'Использовать координаты поля (Туркестанская обл.)',

    block2Title:  'Сельскохозяйственная культура',
    block2Desc:   'Выберите культуру для учёта биологического коэффициента транспирации (Kc).',
    crops: {
      wheat:     { name: 'Пшеница',    sub: 'Бидай'     },
      cotton:    { name: 'Хлопок',     sub: 'Мақта'     },
      corn:      { name: 'Кукуруза',   sub: 'Жүгері'    },
      rice:      { name: 'Рис',        sub: 'Күріш'     },
      alfalfa:   { name: 'Люцерна',    sub: 'Жоңышқа'   },
      tomato:    { name: 'Томаты',     sub: 'Қызанақ'   },
      sunflower: { name: 'Подсолн.',   sub: 'Күнбағыс'  },
      potato:    { name: 'Картофель',  sub: 'Картоп'    },
    },

    block3Title:             'Параметры поля',
    labelAreaUnit:           'Единица измерения:',
    unitText_sotka:          'Сотки',
    unitText_hectare:        'Гектары',
    labelAreaValue:          'Площадь участка:',
    unitBadge_sotka:         'соток',
    unitBadge_hectare:       'гектар',
    unitSuffix_sotka:        'сот.',
    unitSuffix_hectare:      'га',
    labelQuickPresets:       'Быстрый выбор:',
    areaCalcEquivalentLabel: 'Эквивалент:',
    equivFormat: (m2, sotka) =>
      `${m2.toLocaleString('ru-RU')} м² (${sotka.toLocaleString('ru-RU')} соток)`,

    block4Title: 'Тип оросительной системы',
    block4Desc:  'Выберите метод полива для корректного расчёта коэффициента эффективности применения воды.',
    irrig: {
      drip:       { title: 'Капельный полив',      desc: 'Адресная подача в прикорневую зону. Экономия воды 40–50%.', badge: 'КПД 90%' },
      sprinkler:  { title: 'Дождевание',            desc: 'Имитация дождя через форсунки. Равномерное распределение по площади.', badge: 'КПД 75%' },
      pivot:      { title: 'Фронтальный (Pivot)',   desc: 'Круговая дождевальная машина. Оптимален для крупных открытых участков.', badge: 'КПД 80%' },
      furrow:     { title: 'Арычный полив',         desc: 'Традиционный самотечный полив. Высокие потери на фильтрацию.', badge: 'КПД 50%' },
      subsurface: { title: 'Подпочвенное',          desc: 'Трубки под поверхностью почвы. Минимум испарения, максимум эффективности.', badge: 'КПД 95%' },
    },

    summaryTitle:   'Сводка параметров',
    sumLabelCoords: 'Локация:',
    sumLabelCrop:   'Культура:',
    sumLabelArea:   'Площадь:',
    sumLabelIrrig:  'Технология:',
    noCoordsYet:    'Не определены (нажмите GPS)',
    btnSubmitText:  'Рассчитать норму полива',
    submitHint:     'Спутниковый анализ и расчёт по формуле FAO-56 Penman-Monteith',

    errNoGpsSupport:    'Ваш браузер не поддерживает геолокацию.',
    errGpsDenied:       'Доступ к GPS отклонён. Разрешите геолокацию или используйте демо-координаты.',
    errGpsTimeout:      'Превышено время ожидания GPS. Попробуйте ещё раз или используйте демо-точку.',
    errGpsUnknown:      'Ошибка определения локации. Попробуйте снова.',
    gpsSuccessToast:    'Координаты поля успешно зафиксированы!',
    errNeedLocation:    'Сначала определите GPS координаты в Блоке 1.',
    errInvalidArea:     'Введите площадь поля больше 0.',
    successPayloadSent: 'Данные отправлены в бот! Расчёт по модели FAO-56...',
  },

  kz: {
    pageTitle:      'Su-Tech — Дәл егіншілік',
    pageDesc:       'FAO-56 Penman-Monteith моделі негізінде суаруды басқарудың зияткерлік жүйесі',
    headerSubtitle: 'Дәл егіншілік • РҒПК «Дарын»',

    block1Title:        'Алаңның орналасуы (GPS)',
    block1StatusWait:   'GPS күтілуде',
    block1StatusReady:  'Координаттар тіркелді',
    block1Desc:         'FAO-56 моделі бойынша күн радиациясы, жел және топырақ ылғалын автоматты түрде сұрау үшін алқап координаттарын анықтаңыз.',
    btnLocationText:    'GPS координаттарын анықтау',
    btnLocationLoading: 'Спутниктер іздеу...',
    gpsSearching:       'Нақты спутниктік координаттар анықталуда...',
    coordsCardTitle:    'Координаттар тіркелді',
    labelLat:           'Ендік (Lat):',
    labelLon:           'Бойлық (Lon):',
    demoCoordsText:     'Алқаптың үлгі координаттары (Түркістан обл.)',

    block2Title:  'Ауыл шаруашылығы дақылы',
    block2Desc:   'Биологиялық транспирация коэффициентін (Kc) ескеру үшін дақылды таңдаңыз.',
    crops: {
      wheat:     { name: 'Бидай',     sub: 'Пшеница'   },
      cotton:    { name: 'Мақта',     sub: 'Хлопок'    },
      corn:      { name: 'Жүгері',    sub: 'Кукуруза'  },
      rice:      { name: 'Күріш',     sub: 'Рис'       },
      alfalfa:   { name: 'Жоңышқа',  sub: 'Люцерна'   },
      tomato:    { name: 'Қызанақ',  sub: 'Томаты'    },
      sunflower: { name: 'Күнбағыс', sub: 'Подсолн.'  },
      potato:    { name: 'Картоп',   sub: 'Картофель' },
    },

    block3Title:             'Алқап параметрлері',
    labelAreaUnit:           'Өлшем бірлігі:',
    unitText_sotka:          'Соттық',
    unitText_hectare:        'Гектар',
    labelAreaValue:          'Учаске ауданы:',
    unitBadge_sotka:         'соттық',
    unitBadge_hectare:       'гектар',
    unitSuffix_sotka:        'сот.',
    unitSuffix_hectare:      'га',
    labelQuickPresets:       'Жылдам таңдау:',
    areaCalcEquivalentLabel: 'Эквивалент:',
    equivFormat: (m2, sotka) =>
      `${m2.toLocaleString('ru-RU')} м² (${sotka.toLocaleString('ru-RU')} соттық)`,

    block4Title: 'Суару жүйесінің түрі',
    block4Desc:  'Су пайдалану тиімділік коэффициентін дұрыс есептеу үшін суару әдісін таңдаңыз.',
    irrig: {
      drip:       { title: 'Тамшылатып суару',   desc: 'Тамыр аймағына дәл жеткізу. Суды 40–50%-ға дейін үнемдеу.', badge: 'ПӘК 90%' },
      sprinkler:  { title: 'Жаңбырлатып суару',  desc: 'Форсунка арқылы жаңбыр имитациясы. Ауданда бірқалыпты бөлу.', badge: 'ПӘК 75%' },
      pivot:      { title: 'Фронталды (Pivot)',   desc: 'Айналмалы жаңбырлату машинасы. Ірі ашық учаскелерге оңтайлы.', badge: 'ПӘК 80%' },
      furrow:     { title: 'Арықпен суару',       desc: 'Дәстүрлі өздігінен ағатын суару. Сүзілу мен булануға шығын жоғары.', badge: 'ПӘК 50%' },
      subsurface: { title: 'Топырақасты суару',   desc: 'Топырақ асты трубалары. Минимум булану, максимум тиімділік.', badge: 'ПӘК 95%' },
    },

    summaryTitle:   'Параметрлер қорытындысы',
    sumLabelCoords: 'Орналасуы:',
    sumLabelCrop:   'Дақыл:',
    sumLabelArea:   'Ауданы:',
    sumLabelIrrig:  'Технология:',
    noCoordsYet:    'Анықталмаған (GPS басыңыз)',
    btnSubmitText:  'Суару нормасын есептеу',
    submitHint:     'Спутниктік талдау және FAO-56 Penman-Monteith формуласымен есептеу',

    errNoGpsSupport:    'Құрылғыңыз немесе браузер геолокацияны қолдамайды.',
    errGpsDenied:       'GPS рұқсаты берілмеді. Геолокацияны қосыңыз немесе үлгі нүктені таңдаңыз.',
    errGpsTimeout:      'GPS күту уақыты өтіп кетті. Қайталап көріңіз немесе үлгі нүктені басыңыз.',
    errGpsUnknown:      'Орналасқан жерді анықтау қатесі. Қайталап көріңіз.',
    gpsSuccessToast:    'Алқап координаттары сәтті тіркелді!',
    errNeedLocation:    'Алдымен 1-блокта GPS координаттарын анықтаңыз.',
    errInvalidArea:     '0-ден үлкен алқап ауданын енгізіңіз.',
    successPayloadSent: 'Деректер ботқа жіберілді! FAO-56 моделі бойынша есептеу жүргізілуде...',
  },
};

// ─── 6. Языковое управление ───────────────────────────────────────────────
function initLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang')?.toLowerCase();
  state.lang = (langParam === 'kz' || langParam === 'ru') ? langParam : 'ru';
  applyLanguage(state.lang);
}

function setLanguage(lang) {
  if (state.lang === lang) return;
  state.lang = lang;
  const url = new URL(window.location);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);
  applyLanguage(lang);
  updateSummaryCard();
  triggerHaptic('light');
}

function applyLanguage(lang) {
  const t = I18N[lang] || I18N.ru;

  document.getElementById('htmlRoot').setAttribute('lang', lang);
  document.title = t.pageTitle;
  document.getElementById('pageDesc').setAttribute('content', t.pageDesc);
  document.getElementById('headerSubtitle').textContent = t.headerSubtitle;

  // Lang buttons — master.md: is-active class
  setActive('langBtnKz', lang === 'kz');
  setActive('langBtnRu', lang === 'ru');

  // Block 1 — GPS
  document.getElementById('block1Title').textContent = t.block1Title;
  document.getElementById('block1Desc').textContent  = t.block1Desc;
  document.getElementById('btnLocationText').textContent =
    state.isRequestingGps ? t.btnLocationLoading : t.btnLocationText;
  document.getElementById('coordsCardTitle').textContent = t.coordsCardTitle;
  document.getElementById('labelLat').textContent    = t.labelLat;
  document.getElementById('labelLon').textContent    = t.labelLon;
  document.getElementById('demoCoordsText').textContent = t.demoCoordsText;
  updateBlock1StatusPill();

  // Block 2 — Crop
  document.getElementById('block2Title').textContent = t.block2Title;
  document.getElementById('block2Desc').textContent  = t.block2Desc;
  for (const cropKey of Object.keys(CROPS)) {
    const el = document.getElementById(`cropName_${cropKey}`);
    const sub = document.getElementById(`cropSub_${cropKey}`);
    if (el) el.textContent = t.crops[cropKey]?.name ?? cropKey;
    if (sub) sub.textContent = t.crops[cropKey]?.sub ?? '';
  }

  // Block 3 — Area
  document.getElementById('block3Title').textContent          = t.block3Title;
  document.getElementById('labelAreaUnit').textContent        = t.labelAreaUnit;
  document.getElementById('unitText_sotka').textContent       = t.unitText_sotka;
  document.getElementById('unitText_hectare').textContent     = t.unitText_hectare;
  document.getElementById('labelAreaValue').textContent       = t.labelAreaValue;
  document.getElementById('labelQuickPresets').textContent    = t.labelQuickPresets;
  document.getElementById('areaCalcEquivalentLabel').textContent = t.areaCalcEquivalentLabel;
  updateAreaUnitUI();

  // Block 4 — Irrigation
  document.getElementById('block4Title').textContent = t.block4Title;
  document.getElementById('block4Desc').textContent  = t.block4Desc;
  for (const key of Object.keys(IRRIGATION_EFFICIENCY)) {
    const titleEl = document.getElementById(`irrigTitle_${key}`);
    const descEl  = document.getElementById(`irrigDesc_${key}`);
    const badgeEl = document.getElementById(`irrigBadge_${key}`);
    if (titleEl) titleEl.textContent = t.irrig[key]?.title ?? key;
    if (descEl)  descEl.textContent  = t.irrig[key]?.desc ?? '';
    if (badgeEl) badgeEl.textContent = t.irrig[key]?.badge ?? '';
  }

  // Summary & submit
  document.getElementById('summaryTitle').textContent   = t.summaryTitle;
  document.getElementById('sumLabelCoords').textContent = t.sumLabelCoords;
  document.getElementById('sumLabelCrop').textContent   = t.sumLabelCrop;
  document.getElementById('sumLabelArea').textContent   = t.sumLabelArea;
  document.getElementById('sumLabelIrrig').textContent  = t.sumLabelIrrig;
  document.getElementById('btnSubmitText').textContent  = t.btnSubmitText;
  document.getElementById('submitHint').textContent     = t.submitHint;
}

function updateBlock1StatusPill() {
  const t    = I18N[state.lang] || I18N.ru;
  const pill = document.getElementById('block1StatusPill');
  if (!pill) return;

  if (state.latitude !== null && state.longitude !== null) {
    pill.className = 'status-badge status-badge--ok';
    pill.textContent = t.block1StatusReady;
  } else {
    pill.className = 'status-badge status-badge--warning';
    pill.textContent = t.block1StatusWait;
  }
}

// ─── 7. Геолокация ────────────────────────────────────────────────────────
function requestGeolocation() {
  if (state.isRequestingGps) return;

  const t = I18N[state.lang] || I18N.ru;

  if (!navigator.geolocation) {
    showToast(t.errNoGpsSupport, 'error');
    return;
  }

  state.isRequestingGps = true;
  const btn       = document.getElementById('btnGetLocation');
  const btnText   = document.getElementById('btnLocationText');
  const statusBlk = document.getElementById('gpsStatusBlock');
  const statusTxt = document.getElementById('gpsStatusText');

  btn.setAttribute('aria-busy', 'true');
  btn.classList.add('is-loading');
  btnText.textContent = t.btnLocationLoading;
  statusBlk.classList.add('is-visible');
  statusTxt.textContent = t.gpsSearching;

  triggerHaptic('light');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.isRequestingGps = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('is-loading');
      btnText.textContent = t.btnLocationText;
      statusBlk.classList.remove('is-visible');

      state.latitude  = position.coords.latitude;
      state.longitude = position.coords.longitude;
      state.accuracy  = Math.round(position.coords.accuracy || 8);

      renderCoordinates();
      updateBlock1StatusPill();
      updateSummaryCard();
      showToast(t.gpsSuccessToast, 'success');
      triggerHaptic('success');
    },
    (error) => {
      state.isRequestingGps = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('is-loading');
      btnText.textContent = t.btnLocationText;
      statusBlk.classList.remove('is-visible');

      const msg =
        error.code === 1 ? t.errGpsDenied :
        error.code === 3 ? t.errGpsTimeout : t.errGpsUnknown;

      showToast(msg, 'error');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function setDemoCoordinates() {
  // Опытный поливной участок — Туркестанская область, Отырарский район
  state.latitude  = 43.301540;
  state.longitude = 68.256850;
  state.accuracy  = 5;

  renderCoordinates();
  updateBlock1StatusPill();
  updateSummaryCard();

  const t = I18N[state.lang] || I18N.ru;
  showToast(t.gpsSuccessToast, 'success');
  triggerHaptic('medium');
}

function renderCoordinates() {
  if (state.latitude === null || state.longitude === null) return;

  const card = document.getElementById('coordsCard');
  card.classList.add('is-visible');

  document.getElementById('displayLat').textContent   = `${state.latitude.toFixed(6)}°`;
  document.getElementById('displayLon').textContent   = `${state.longitude.toFixed(6)}°`;
  document.getElementById('coordsAccuracy').textContent = `±${state.accuracy || 5} м`;
}

// ─── 8. Выбор культуры (Блок 2) — 8 культур ──────────────────────────────
const ALL_CROPS = Object.keys(CROPS);

function selectCrop(cropKey) {
  if (!CROPS[cropKey]) return;
  state.crop = cropKey;

  for (const key of ALL_CROPS) {
    const card = document.getElementById(`cropCard_${key}`);
    if (!card) continue;
    const isSelected = key === cropKey;
    card.classList.toggle('is-selected', isSelected);
    card.setAttribute('aria-checked', String(isSelected));
  }

  updateSummaryCard();
  triggerHaptic('light');
}

// ─── 9. Параметры поля (Блок 3) ──────────────────────────────────────────
function setAreaUnit(unit) {
  if (state.area_unit === unit) return;
  state.area_unit = unit;
  updateAreaUnitUI();
  updateSummaryCard();
  triggerHaptic('light');
}

function updateAreaUnitUI() {
  const t      = I18N[state.lang] || I18N.ru;
  const isHect = state.area_unit === 'hectare';

  // Toggle buttons — master.md irrigation-toggle pattern
  const btnSotka   = document.getElementById('unitBtn_sotka');
  const btnHectare = document.getElementById('unitBtn_hectare');
  setActive(btnSotka,   !isHect, /* byRef */ true);
  setActive(btnHectare,  isHect, /* byRef */ true);
  btnSotka.setAttribute('aria-pressed',   String(!isHect));
  btnHectare.setAttribute('aria-pressed', String(isHect));

  document.getElementById('currentAreaUnitBadge').textContent =
    isHect ? t.unitBadge_hectare : t.unitBadge_sotka;
  document.getElementById('inputUnitSuffix').textContent =
    isHect ? t.unitSuffix_hectare : t.unitSuffix_sotka;

  recalculateAreaEquivalent();
}

function handleAreaChange(val) {
  const num = parseFloat(val);
  state.area = (!isNaN(num) && num > 0) ? num : 0;
  recalculateAreaEquivalent();
  updateSummaryCard();
}

function setPresetArea(val) {
  state.area = val;
  document.getElementById('fieldAreaInput').value = val;
  recalculateAreaEquivalent();
  updateSummaryCard();
  triggerHaptic('light');
}

function recalculateAreaEquivalent() {
  const t     = I18N[state.lang] || I18N.ru;
  const el    = document.getElementById('areaInM2');
  const isHect = state.area_unit === 'hectare';

  const m2    = isHect ? Math.round(state.area * 10000) : Math.round(state.area * 100);
  const sotka = isHect ? Math.round(state.area * 100)   : Math.round(state.area);

  el.textContent = t.equivFormat(m2, sotka);
}

// ─── 10. Выбор метода полива (Блок 4) — 5 методов ────────────────────────
const ALL_IRRIG = Object.keys(IRRIGATION_EFFICIENCY);

function selectIrrigation(type) {
  if (!IRRIGATION_EFFICIENCY.hasOwnProperty(type)) return;
  state.irrigation_type = type;

  for (const key of ALL_IRRIG) {
    const card = document.getElementById(`irrigCard_${key}`);
    if (!card) continue;
    const isSelected = key === type;
    card.classList.toggle('is-selected', isSelected);
    card.setAttribute('aria-checked', String(isSelected));
  }

  updateSummaryCard();
  triggerHaptic('light');
}

// ─── 11. Сводная карточка ─────────────────────────────────────────────────
function updateSummaryCard() {
  const t = I18N[state.lang] || I18N.ru;

  // GPS coords
  const coordsVal = document.getElementById('sumValCoords');
  if (state.latitude !== null && state.longitude !== null) {
    coordsVal.textContent = `${state.latitude.toFixed(4)}°, ${state.longitude.toFixed(4)}°`;
    coordsVal.classList.remove('summary-item-value--warn');
  } else {
    coordsVal.textContent = t.noCoordsYet;
    coordsVal.classList.add('summary-item-value--warn');
  }

  // Crop
  const cropInfo = t.crops[state.crop] || { name: state.crop, sub: '' };
  document.getElementById('sumValCrop').textContent =
    `${cropInfo.name} (${cropInfo.sub})`;

  // Area
  const unitLabel = state.area_unit === 'hectare' ?
    t.unitBadge_hectare : t.unitBadge_sotka;
  document.getElementById('sumValArea').textContent =
    `${state.area} ${unitLabel}`;

  // Irrigation
  const irrigInfo = t.irrig[state.irrigation_type] || { title: state.irrigation_type, badge: '' };
  document.getElementById('sumValIrrig').textContent =
    `${irrigInfo.title} (${irrigInfo.badge})`;
}

// ─── 12. Финальная отправка ───────────────────────────────────────────────
function submitFinalCalculation() {
  const t = I18N[state.lang] || I18N.ru;

  // Validate coordinates
  if (state.latitude === null || state.longitude === null) {
    showToast(t.errNeedLocation, 'warning');
    document.getElementById('block1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Validate area
  if (!state.area || state.area <= 0) {
    showToast(t.errInvalidArea, 'warning');
    document.getElementById('block3')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Build payload
  const payload = {
    latitude:         Number(state.latitude.toFixed(6)),
    longitude:        Number(state.longitude.toFixed(6)),
    crop:             state.crop,
    kc:               CROPS[state.crop]?.kc ?? 1.0,
    area:             Number(state.area),
    area_unit:        state.area_unit,
    irrigation_type:  state.irrigation_type,
    irrigation_eff:   IRRIGATION_EFFICIENCY[state.irrigation_type] ?? 0.75,
    lang:             state.lang,
  };

  const payloadString = JSON.stringify(payload);
  console.log('[Su-Tech] sendData payload:', payloadString);

  showToast(t.successPayloadSent, 'success');
  triggerHaptic('success');

  // Press animation on submit button (master.md §7.3)
  const btn = document.getElementById('btnSubmitAll');
  if (btn) {
    btn.style.transform = 'scale(0.97)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
  }

  setTimeout(() => {
    try { tg.sendData(payloadString); } catch (err) { console.error('[Su-Tech] sendData error:', err); }
    try { tg.close(); } catch (_) {}
  }, 420);
}

// ─── 13. Toast-уведомления (master.md §TOAST) ────────────────────────────
let _toastTimer = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;

  clearTimeout(_toastTimer);

  // Remove all type classes
  toast.className = 'app-toast';

  // Apply type class
  const typeMap = { success: 'success', warning: 'warning', error: 'error', info: 'info' };
  toast.classList.add(`app-toast--${typeMap[type] || 'info'}`);
  toast.textContent = message;

  // Show (force reflow for transition)
  toast.style.display = 'block';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.classList.add('is-visible'); });
  });

  if (type === 'error' || type === 'warning') triggerHaptic('warning');

  _toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3800);
}

// ─── 14. Вспомогательные функции ─────────────────────────────────────────
/**
 * Добавляет/убирает класс is-active по id-строке или по DOM-элементу.
 * @param {string|HTMLElement} target
 * @param {boolean} active
 * @param {boolean} byRef — если true, target уже является Element
 */
function setActive(target, active, byRef = false) {
  const el = byRef ? target : document.getElementById(target);
  if (!el) return;
  el.classList.toggle('is-active', active);
}

/**
 * Haptic feedback (Telegram WebApp or silent).
 * @param {'light'|'medium'|'heavy'|'success'|'warning'|'error'} type
 */
function triggerHaptic(type) {
  try {
    if (['light', 'medium', 'heavy'].includes(type)) {
      tg.HapticFeedback?.impactOccurred(type);
    } else {
      tg.HapticFeedback?.notificationOccurred(type);
    }
  } catch (_) {}
}

// ─── 15. Keyboard support (Enter/Space) для crop и irrig cards ────────────
function addKeyboardCardSupport() {
  document.querySelectorAll('[role="radio"]').forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// ─── 16. DOMContentLoaded — Инициализация ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  recalculateAreaEquivalent();
  updateSummaryCard();
  addKeyboardCardSupport();

  // Pre-select default state UI
  selectCrop(state.crop);
  selectIrrigation(state.irrigation_type);
  setAreaUnit(state.area_unit);
});
