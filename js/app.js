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
  window.Telegram.WebApp.expand();
  window.Telegram.WebApp.ready();
  tg.ready();
  tg.expand();
} catch (err) {
  console.warn('[Su-Tech] Telegram WebApp не обнаружен, режим браузера:', err);
}

// ─── 2. Состояние приложения ───────────────────────────────────────────────
let currentCrop = 'cotton';
let selectedCrop = currentCrop; // Псевдоним для совместимости
let currentArea = 10.0;
let currentUnit = 'hectare';
let currentIrrigation = 'drip';
let currentFieldType = 'open';
let currentSaline = 'no';

// Экспорт в window для прямого доступа и отладки
window.currentCrop = currentCrop;
window.selectedCrop = selectedCrop;
window.currentArea = currentArea;
window.currentUnit = currentUnit;
window.currentIrrigation = currentIrrigation;
window.currentFieldType = currentFieldType;
window.currentSaline = currentSaline;

const state = {
  latitude:         null,
  longitude:        null,
  accuracy:         null,
  crop:             currentCrop,
  area:             currentArea,
  area_unit:        currentUnit,
  irrigation_type:  currentIrrigation,
  field_type:       currentFieldType,
  is_saline:        currentSaline,
  lang:             'ru',
  isRequestingGps:  false,
};

// ─── 3. Данные культур (Kc-коэффициенты FAO-56, строго 8 культур) ────────────
const CROPS = {
  wheat:     { kc: 1.10 },
  cotton:    { kc: 1.15 },
  corn:      { kc: 1.20 },
  alfalfa:   { kc: 1.05 },
  melon:     { kc: 1.05 },
  tomato:    { kc: 1.15 },
  potato:    { kc: 1.10 },
  other:     { kc: 1.00 },
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
    pageTitle:      'Su-Tech — Smart Irrigation',
    pageDesc:       'Интеллектуальная система управления орошением на базе модели FAO-56 Penman-Monteith',
    headerSubtitle: 'Smart Irrigation System',

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

    block2Title:  'Сельскохозяйственная культура',
    block2Desc:   'Выберите культуру для учёта биологического коэффициента транспирации (Kc).',
    crops: {
      wheat:     { name: 'Пшеница',         sub: 'Бидай'            },
      cotton:    { name: 'Хлопок',          sub: 'Мақта'            },
      corn:      { name: 'Кукуруза',        sub: 'Жүгері'           },
      alfalfa:   { name: 'Люцерна',         sub: 'Жоңышқа'          },
      melon:     { name: 'Бахча',           sub: 'Бақша'            },
      tomato:    { name: 'Томаты',          sub: 'Қызанақ'          },
      potato:    { name: 'Картофель',       sub: 'Картоп'           },
      other:     { name: 'Другая культура', sub: 'Басқа дақыл'      },
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

    // Два новых переключателя
    labelFieldType:          'Тип участка:',
    fieldText_open:          '☀️ Открытое поле',
    fieldText_greenhouse:    '🏡 Теплица',
    fieldTypeBadge_open:     'Открытое поле',
    fieldTypeBadge_greenhouse:'Теплица',

    labelSalinity:           'Засоленность почвы:',
    salineText_no:           'Обычная почва',
    salineText_yes:          '🧂 Солончак',
    salineBadge_no:          'Обычная почва',
    salineBadge_yes:         'Солончак (+15%)',

    block4Title: 'Тип оросительной системы',
    block4Desc:  'Выберите метод полива для корректного расчёта коэффициента эффективности применения воды.',
    irrig: {
      drip:       { title: 'Капельный полив',      desc: 'Адресная подача в прикорневую зону. Экономия воды 40–50%.', badge: 'КПД 90%' },
      sprinkler:  { title: 'Дождевание',            desc: 'Имитация дождя через форсунки. Равномерное распределение по площади.', badge: 'КПД 75%' },
      pivot:      { title: 'Фронтальный (Pivot)',   desc: 'Круговая дождевальная машина. Оптимален для крупных открытых участков.', badge: 'КПД 80%' },
      furrow:     { title: 'Арычный полив',         desc: 'Традиционный самотечный полив. Высокие потери на фильтрацию.', badge: 'КПД 50%' },
      subsurface: { title: 'Подпочвенное',          desc: 'Трубки под поверхностью почвы. Минимум испарения, максимум эффективности.', badge: 'КПД 95%' },
    },

    summaryTitle:      'Сводка параметров',
    sumLabelCoords:    'Локация:',
    sumLabelCrop:      'Культура:',
    sumLabelArea:      'Площадь:',
    sumLabelIrrig:     'Технология:',
    sumLabelFieldType: 'Тип участка:',
    sumLabelSaline:    'Почва:',
    noCoordsYet:       'Не определены (нажмите GPS)',
    btnSubmitText:     '💧 Рассчитать норму полива (FAO-56)',
    submitHint:        'Спутниковый анализ и расчёт по формуле FAO-56 Penman-Monteith',

    errNoGpsSupport:    'Ваш браузер не поддерживает геолокацию.',
    errGpsDenied:       'Доступ к GPS отклонён. Разрешите геолокацию или используйте демо-координаты.',
    errGpsTimeout:      'Превышено время ожидания GPS. Попробуйте ещё раз или используйте демо-точку.',
    errGpsUnknown:      'Ошибка определения локации. Попробуйте снова.',
    gpsSuccessToast:    'Координаты поля успешно зафиксированы!',
    errNeedLocation:    'Сначала определите GPS координаты в Блоке 1.',
    errInvalidArea:     'Введите площадь поля больше 0 и менее 50 000.',
    successPayloadSent: 'Данные отправлены в бот! Расчёт по модели FAO-56...',
  },

  kz: {
    pageTitle:      'Su-Tech — Smart Irrigation',
    pageDesc:       'FAO-56 Penman-Monteith моделі негізінде суаруды басқарудың зияткерлік жүйесі',
    headerSubtitle: 'Smart Irrigation System',

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

    block2Title:  'Ауыл шаруашылығы дақылы',
    block2Desc:   'Биологиялық транспирация коэффициентін (Kc) ескеру үшін дақылды таңдаңыз.',
    crops: {
      wheat:     { name: 'Бидай',           sub: 'Пшеница'          },
      cotton:    { name: 'Мақта',           sub: 'Хлопок'           },
      corn:      { name: 'Жүгері',          sub: 'Кукуруза'         },
      alfalfa:   { name: 'Жоңышқа',         sub: 'Люцерна'          },
      melon:     { name: 'Бақша',           sub: 'Бахча'            },
      tomato:    { name: 'Қызанақ',         sub: 'Томаты'           },
      potato:    { name: 'Картоп',          sub: 'Картофель'        },
      other:     { name: 'Басқа дақыл',     sub: 'Другая культура'  },
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

    // Екі жаңа қосқыш
    labelFieldType:          'Алқап түрі:',
    fieldText_open:          '☀️ Ашық алқап',
    fieldText_greenhouse:    '🏡 Жылыжай',
    fieldTypeBadge_open:     'Ашық алқап',
    fieldTypeBadge_greenhouse:'Жылыжай',

    labelSalinity:           'Топырақтың тұздануы:',
    salineText_no:           'Қалыпты топырақ',
    salineText_yes:          '🧂 Сортаң',
    salineBadge_no:          'Қалыпты топырақ',
    salineBadge_yes:         'Сортаң (+15%)',

    block4Title: 'Суару жүйесінің түрі',
    block4Desc:  'Су пайдалану тиімділік коэффициентін дұрыс есептеу үшін суару әдісін таңдаңыз.',
    irrig: {
      drip:       { title: 'Тамшылатып суару',   desc: 'Тамыр аймағына дәл жеткізу. Суды 40–50%-ға дейін үнемдеу.', badge: 'ПӘК 90%' },
      sprinkler:  { title: 'Жаңбырлатып суару',  desc: 'Форсунка арқылы жаңбыр имитациясы. Ауданда бірқалыпты бөлу.', badge: 'ПӘК 75%' },
      pivot:      { title: 'Фронталды (Pivot)',   desc: 'Айналмалы жаңбырлату машинасы. Ірі ашық учаскелерге оңтайлы.', badge: 'ПӘК 80%' },
      furrow:     { title: 'Арықпен суару',       desc: 'Дәстүрлі өздігінен ағатын суару. Сүзілу мен булануға шығын жоғары.', badge: 'ПӘК 50%' },
      subsurface: { title: 'Топырақасты суару',   desc: 'Топырақ асты трубалары. Минимум булану, максимум тиімділік.', badge: 'ПӘК 95%' },
    },

    summaryTitle:      'Параметрлер қорытындысы',
    sumLabelCoords:    'Орналасуы:',
    sumLabelCrop:      'Дақыл:',
    sumLabelArea:      'Ауданы:',
    sumLabelIrrig:     'Технология:',
    sumLabelFieldType: 'Алқап түрі:',
    sumLabelSaline:    'Топырақ:',
    noCoordsYet:       'Анықталмаған (GPS басыңыз)',
    btnSubmitText:     '💧 Суару нормасын есептеу (FAO-56)',
    submitHint:        'Спутниктік талдау және FAO-56 Penman-Monteith формуласымен есептеу',

    errNoGpsSupport:    'Құрылғыңыз немесе браузер геолокацияны қолдамайды.',
    errGpsDenied:       'GPS рұқсаты берілмеді. Геолокацияны қосыңыз немесе үлгі нүктені таңдаңыз.',
    errGpsTimeout:      'GPS күту уақыты өтіп кетті. Қайталап көріңіз немесе үлгі нүктені басыңыз.',
    errGpsUnknown:      'Орналасқан жерді анықтау қатесі. Қайталап көріңіз.',
    gpsSuccessToast:    'Алқап координаттары сәтті тіркелді!',
    errNeedLocation:    'Алдымен 1-блокта GPS координаттарын анықтаңыз.',
    errInvalidArea:     '0-ден үлкен және 50 000-нан кем алқап ауданын енгізіңіз.',
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

  // Lang buttons — Tailwind: toggle active style
  _setLangBtn('langBtnKz', lang === 'kz');
  _setLangBtn('langBtnRu', lang === 'ru');

  // Block 1 — GPS
  document.getElementById('block1Title').textContent = t.block1Title;
  document.getElementById('block1Desc').textContent  = t.block1Desc;
  document.getElementById('btnLocationText').textContent =
    state.isRequestingGps ? t.btnLocationLoading : t.btnLocationText;
  document.getElementById('coordsCardTitle').textContent = t.coordsCardTitle;
  document.getElementById('labelLat').textContent    = t.labelLat;
  document.getElementById('labelLon').textContent    = t.labelLon;
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

  // Block 3 — Area & New Toggles
  document.getElementById('block3Title').textContent          = t.block3Title;
  document.getElementById('labelAreaUnit').textContent        = t.labelAreaUnit;
  document.getElementById('unitText_sotka').textContent       = t.unitText_sotka;
  document.getElementById('unitText_hectare').textContent     = t.unitText_hectare;
  document.getElementById('labelAreaValue').textContent       = t.labelAreaValue;
  document.getElementById('labelQuickPresets').textContent    = t.labelQuickPresets;
  document.getElementById('areaCalcEquivalentLabel').textContent = t.areaCalcEquivalentLabel;
  updateAreaUnitUI();

  // Field Type
  const labelFieldType = document.getElementById('labelFieldType');
  if (labelFieldType) labelFieldType.textContent = t.labelFieldType;
  const fieldTextOpen = document.getElementById('fieldText_open');
  if (fieldTextOpen) fieldTextOpen.textContent = t.fieldText_open;
  const fieldTextGh = document.getElementById('fieldText_greenhouse');
  if (fieldTextGh) fieldTextGh.textContent = t.fieldText_greenhouse;
  updateFieldTypeUI();

  // Salinity
  const labelSalinity = document.getElementById('labelSalinity');
  if (labelSalinity) labelSalinity.textContent = t.labelSalinity;
  const salineTextNo = document.getElementById('salineText_no');
  if (salineTextNo) salineTextNo.textContent = t.salineText_no;
  const salineTextYes = document.getElementById('salineText_yes');
  if (salineTextYes) salineTextYes.textContent = t.salineText_yes;
  updateSalinityUI();

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
  const sumLabelFieldType = document.getElementById('sumLabelFieldType');
  if (sumLabelFieldType) sumLabelFieldType.textContent = t.sumLabelFieldType;
  const sumLabelSaline = document.getElementById('sumLabelSaline');
  if (sumLabelSaline) sumLabelSaline.textContent = t.sumLabelSaline;
  document.getElementById('btnSubmitText').textContent  = t.btnSubmitText;
  document.getElementById('submitHint').textContent     = t.submitHint;
}

function updateBlock1StatusPill() {
  const t    = I18N[state.lang] || I18N.ru;
  const pill = document.getElementById('block1StatusPill');
  if (!pill) return;

  // Tailwind classes — Bold 700, xs, uppercase, tracking-wide labels
  const baseClasses = 'text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full whitespace-nowrap';
  if (state.latitude !== null && state.longitude !== null) {
    pill.className = `${baseClasses} bg-success-bg text-[#14532D]`;
    pill.textContent = t.block1StatusReady;
  } else {
    pill.className = `${baseClasses} bg-warning-bg text-[#78350F]`;
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

function renderCoordinates() {
  if (state.latitude === null || state.longitude === null) return;

  const card = document.getElementById('coordsCard');
  card.classList.add('is-visible');

  document.getElementById('displayLat').textContent   = `${state.latitude.toFixed(6)}°`;
  document.getElementById('displayLon').textContent   = `${state.longitude.toFixed(6)}°`;
  document.getElementById('coordsAccuracy').textContent = `±${state.accuracy || 5} м`;
}

// ─── 8. Выбор культуры (Блок 2) ──────────────────────────────────────────
const ALL_CROPS = Object.keys(CROPS);

function selectCrop(cropKey) {
  if (!cropKey || !CROPS[cropKey]) return;
  currentCrop = cropKey;
  selectedCrop = cropKey;
  window.currentCrop = cropKey;
  window.selectedCrop = cropKey;
  state.crop = cropKey;

  const cropCards = document.querySelectorAll('.crop-card');
  cropCards.forEach(card => {
    const isSelected = (card.dataset.crop === cropKey) || (card.id === `cropCard_${cropKey}`);
    if (isSelected) {
      card.classList.add('card-selected', 'active', 'border-emerald-500', 'ring-2', 'ring-emerald-500');
      card.setAttribute('aria-checked', 'true');
      const check = card.querySelector('.crop-check');
      if (check) {
        check.classList.remove('hidden');
        check.classList.add('flex');
      }
    } else {
      card.classList.remove('card-selected', 'active', 'border-emerald-500', 'ring-2', 'ring-emerald-500');
      card.setAttribute('aria-checked', 'false');
      const check = card.querySelector('.crop-check');
      if (check) {
        check.classList.add('hidden');
        check.classList.remove('flex');
      }
    }
  });

  updateSummaryCard();
  triggerHaptic('light');
}

function initCropCards() {
  const cropCards = document.querySelectorAll('.crop-card');
  cropCards.forEach(card => {
    card.addEventListener('click', function () {
      const crop = this.dataset.crop;
      if (!crop) return;
      selectCrop(crop);
    });
  });
}

// ─── 9. Параметры поля (Блок 3) ──────────────────────────────────────────
function setAreaUnit(unit) {
  currentUnit = unit;
  window.currentUnit = unit;
  state.area_unit = unit;
  updateAreaUnitUI();
  updateSummaryCard();
  triggerHaptic('light');
}

function updateAreaUnitUI() {
  const t      = I18N[state.lang] || I18N.ru;
  const isHect = state.area_unit === 'hectare';

  // Toggle buttons — Tailwind classes per skill weight spec
  const btnSotka   = document.getElementById('unitBtn_sotka');
  const btnHectare = document.getElementById('unitBtn_hectare');
  const activeClass   = 'flex-1 h-10 rounded-xl text-sm font-semibold cursor-pointer bg-white/90 text-primary border-none shadow-sm transition-all duration-200';
  const inactiveClass = 'flex-1 h-10 rounded-xl text-sm font-medium cursor-pointer text-muted bg-transparent border-none transition-all duration-200 hover:text-foreground';
  if (btnSotka)   btnSotka.className   = isHect ? inactiveClass : activeClass;
  if (btnHectare) btnHectare.className = isHect ? activeClass   : inactiveClass;
  btnSotka?.setAttribute('aria-pressed',   String(!isHect));
  btnHectare?.setAttribute('aria-pressed', String(isHect));

  document.getElementById('currentAreaUnitBadge').textContent =
    isHect ? t.unitBadge_hectare : t.unitBadge_sotka;
  document.getElementById('inputUnitSuffix').textContent =
    isHect ? t.unitSuffix_hectare : t.unitSuffix_sotka;

  recalculateAreaEquivalent();
}

function handleAreaChange(val) {
  const num = parseFloat(val);
  currentArea = (!isNaN(num) && num > 0) ? num : 0;
  window.currentArea = currentArea;
  state.area = currentArea;
  recalculateAreaEquivalent();
  updateSummaryCard();
}

function setPresetArea(val) {
  currentArea = val;
  window.currentArea = currentArea;
  state.area = val;
  const input = document.getElementById('fieldAreaInput');
  if (input) input.value = val;
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
  currentIrrigation = type;
  window.currentIrrigation = currentIrrigation;
  state.irrigation_type = type;

  for (const key of ALL_IRRIG) {
    const card = document.getElementById(`irrigCard_${key}`);
    if (!card) continue;
    const isSelected = key === type;
    card.classList.toggle('card-selected', isSelected);
    card.classList.toggle('active', isSelected);
    card.classList.toggle('is-selected', isSelected);
    card.setAttribute('aria-checked', String(isSelected));
  }

  updateSummaryCard();
  triggerHaptic('light');
}

// ─── 9.1 Новые переключатели: Тип участка и Засоленность ───────────────────
function setFieldType(type) {
  if (type !== 'open' && type !== 'greenhouse') return;
  currentFieldType = type;
  window.currentFieldType = type;
  state.field_type = type;
  updateFieldTypeUI();
  updateSummaryCard();
  triggerHaptic('light');
}

function updateFieldTypeUI() {
  const t = I18N[state.lang] || I18N.ru;
  const isOpen = state.field_type === 'open';
  const btnOpen = document.getElementById('fieldTypeBtn_open');
  const btnGh   = document.getElementById('fieldTypeBtn_greenhouse');
  const activeClass   = 'flex-1 h-10 rounded-inner text-sm font-semibold cursor-pointer bg-surface text-primary border-none shadow-card transition-all duration-normal';
  const inactiveClass = 'flex-1 h-10 rounded-inner text-sm font-medium cursor-pointer text-muted bg-transparent border-none transition-all duration-normal hover:text-foreground';

  if (btnOpen) btnOpen.className = isOpen ? activeClass : inactiveClass;
  if (btnGh)   btnGh.className   = isOpen ? inactiveClass : activeClass;
  btnOpen?.setAttribute('aria-pressed', String(isOpen));
  btnGh?.setAttribute('aria-pressed', String(!isOpen));

  const badge = document.getElementById('fieldTypeBadge');
  if (badge) {
    badge.textContent = isOpen ? t.fieldTypeBadge_open : t.fieldTypeBadge_greenhouse;
    badge.className = isOpen ?
      'text-[10px] px-2 py-0.5 rounded-pill bg-success-bg text-[#14532D] font-semibold' :
      'text-[10px] px-2 py-0.5 rounded-pill bg-warning-bg text-[#78350F] font-semibold';
  }
}

function setSalinity(saline) {
  if (saline !== 'no' && saline !== 'yes') return;
  currentSaline = saline;
  window.currentSaline = saline;
  state.is_saline = saline;
  updateSalinityUI();
  updateSummaryCard();
  triggerHaptic('light');
}

function updateSalinityUI() {
  const t = I18N[state.lang] || I18N.ru;
  const isNormal = state.is_saline === 'no';
  const btnNo  = document.getElementById('salinityBtn_no');
  const btnYes = document.getElementById('salinityBtn_yes');
  const activeClass   = 'flex-1 h-10 rounded-inner text-sm font-semibold cursor-pointer bg-surface text-primary border-none shadow-card transition-all duration-normal';
  const inactiveClass = 'flex-1 h-10 rounded-inner text-sm font-medium cursor-pointer text-muted bg-transparent border-none transition-all duration-normal hover:text-foreground';

  if (btnNo)  btnNo.className  = isNormal ? activeClass : inactiveClass;
  if (btnYes) btnYes.className = isNormal ? inactiveClass : activeClass;
  btnNo?.setAttribute('aria-pressed', String(isNormal));
  btnYes?.setAttribute('aria-pressed', String(!isNormal));

  const badge = document.getElementById('salinityBadge');
  if (badge) {
    badge.textContent = isNormal ? t.salineBadge_no : t.salineBadge_yes;
    badge.className = isNormal ?
      'text-[10px] px-2 py-0.5 rounded-pill bg-info-bg text-[#1E3A5F] font-semibold' :
      'text-[10px] px-2 py-0.5 rounded-pill bg-warning-bg text-[#78350F] font-semibold';
  }
}

// ─── 11. Сводная карточка ─────────────────────────────────────────────────
function updateSummaryCard() {
  const t = I18N[state.lang] || I18N.ru;

  // GPS coords — Tailwind classes: Mono xs for data, accent color when warning
  const coordsVal = document.getElementById('sumValCoords');
  if (state.latitude !== null && state.longitude !== null) {
    coordsVal.textContent = `${state.latitude.toFixed(4)}°, ${state.longitude.toFixed(4)}°`;
    coordsVal.className = 'text-xs font-semibold text-primary';
  } else {
    coordsVal.textContent = t.noCoordsYet;
    coordsVal.className = 'text-xs font-semibold text-accent';
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

  // Field Type
  const fieldTypeVal = document.getElementById('sumValFieldType');
  if (fieldTypeVal) {
    fieldTypeVal.textContent = state.field_type === 'open' ? t.fieldTypeBadge_open : t.fieldTypeBadge_greenhouse;
  }

  // Salinity
  const salineVal = document.getElementById('sumValSaline');
  if (salineVal) {
    salineVal.textContent = state.is_saline === 'no' ? t.salineBadge_no : t.salineBadge_yes;
  }
}

// ─── 12. Финальная отправка ───────────────────────────────────────────────
function submitFinalCalculation() {
  const t = I18N[state.lang] || I18N.ru;

  // 1. Проверка координат
  if (state.latitude === null || state.longitude === null) {
    showToast(t.errNeedLocation, 'warning');
    document.getElementById('block1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 2. ДИНАМИЧЕСКИЙ сбор данных с экрана (Real-time State Inspection)

  // Культура (crop): считываем с выбранной карточки
  const activeCropCard = document.querySelector('.crop-card.card-selected, .crop-card.active, .crop-card[aria-checked="true"]');
  if (activeCropCard && activeCropCard.dataset.crop) {
    currentCrop = activeCropCard.dataset.crop;
  } else if (!currentCrop) {
    currentCrop = state.crop || 'cotton';
  }
  selectedCrop = currentCrop;
  state.crop = currentCrop;
  window.currentCrop = currentCrop;
  window.selectedCrop = currentCrop;

  // Площадь (area): считываем актуальное число из поля ввода
  const areaInput = document.getElementById('fieldAreaInput');
  if (areaInput) {
    const parsedArea = parseFloat(areaInput.value);
    if (!isNaN(parsedArea)) {
      currentArea = parsedArea;
    }
  }
  state.area = currentArea;
  window.currentArea = currentArea;

  // Валидация площади: строго больше 0 и менее 50 000
  if (!currentArea || currentArea <= 0 || currentArea >= 50000) {
    showToast(t.errInvalidArea, 'warning');
    document.getElementById('block3')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Единица площади (area_unit): гектар или сотка
  const isHectActive = document.getElementById('unitBtn_hectare')?.getAttribute('aria-pressed') === 'true';
  currentUnit = isHectActive ? 'hectare' : (state.area_unit || 'hectare');
  state.area_unit = currentUnit;
  window.currentUnit = currentUnit;

  // Метод полива (irrigation_type): считываем с активной карточки
  const activeIrrigCard = document.querySelector('.irrig-card.card-selected, .irrig-card.active, .irrig-card.is-selected, [id^="irrigCard_"][aria-checked="true"]');
  if (activeIrrigCard) {
    currentIrrigation = activeIrrigCard.id.replace('irrigCard_', '');
  } else if (!currentIrrigation) {
    currentIrrigation = state.irrigation_type || 'drip';
  }
  state.irrigation_type = currentIrrigation;
  window.currentIrrigation = currentIrrigation;

  // Тип участка (field_type): считываем из data-field активной кнопки
  const activeFieldBtn = document.querySelector('[data-field][aria-pressed="true"]');
  if (activeFieldBtn && activeFieldBtn.dataset.field) {
    currentFieldType = activeFieldBtn.dataset.field;
  } else {
    currentFieldType = state.field_type || 'open';
  }
  state.field_type = currentFieldType;
  window.currentFieldType = currentFieldType;

  // Засоленность (is_saline): считываем из data-saline активной кнопки
  const activeSalineBtn = document.querySelector('[data-saline][aria-pressed="true"]');
  if (activeSalineBtn && activeSalineBtn.dataset.saline) {
    currentSaline = activeSalineBtn.dataset.saline;
  } else {
    currentSaline = state.is_saline || 'no';
  }
  state.is_saline = currentSaline;
  window.currentSaline = currentSaline;

  // Собираем динамический payload strictly по спецификации:
  // { latitude, longitude, crop, area, area_unit, irrigation_type, field_type, is_saline }
  const payload = {
    latitude:         Number(state.latitude.toFixed(6)),
    longitude:        Number(state.longitude.toFixed(6)),
    crop:             currentCrop,
    area:             Number(currentArea),
    area_unit:        currentUnit,
    irrigation_type:  currentIrrigation,
    field_type:       currentFieldType,
    is_saline:        currentSaline,
    kc:               CROPS[currentCrop]?.kc ?? 1.0,
    irrigation_eff:   IRRIGATION_EFFICIENCY[currentIrrigation] ?? 0.75,
    lang:             state.lang,
  };
  if (state.accuracy) {
    payload.accuracy = state.accuracy;
  }

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

  // Tailwind toast classes per type
  const baseClass = 'fixed top-4 left-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-center border shadow-md backdrop-blur-md';
  const typeClasses = {
    success: 'bg-success-bg text-[#14532D] border-[rgba(22,163,74,0.3)]',
    warning: 'bg-warning-bg text-[#78350F] border-[rgba(217,119,6,0.3)]',
    error:   'bg-error-bg text-[#7F1D1D] border-[rgba(220,38,38,0.3)]',
    info:    'bg-info-bg text-[#1E3A5F] border-[rgba(30,95,168,0.3)]',
  };
  toast.className = `${baseClass} ${typeClasses[type] || typeClasses.info} toast-enter`;
  toast.textContent = message;
  toast.style.display = 'block';

  // Trigger transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.classList.add('toast-visible'); toast.classList.remove('toast-enter'); });
  });

  if (type === 'error' || type === 'warning') triggerHaptic('warning');

  _toastTimer = setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3800);
}

// ─── 14. Вспомогательные функции ─────────────────────────────────────────
/**
 * Устанавливает стиль кнопки языка — Tailwind-классы.
 * Активная: bg-primary text-white shadow. Неактивная: прозрачный фон, muted.
 */
function _setLangBtn(id, isActive) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isActive) {
    el.className = 'h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer bg-primary text-white border-none shadow-sm transition-all duration-150';
  } else {
    el.className = 'h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer text-muted bg-transparent border-none transition-all duration-150 hover:text-foreground';
  }
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
  updateFieldTypeUI();
  updateSalinityUI();
  updateSummaryCard();
  addKeyboardCardSupport();
  initCropCards();

  // Pre-select default state UI
  selectCrop(state.crop);
  selectIrrigation(state.irrigation_type);
  setAreaUnit(state.area_unit);

  lucide.createIcons();
});
