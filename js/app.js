/**
 * Su-Tech — Интеллектуальная система точного земледелия (Telegram WebApp)
 * Научный модуль расчета норм полива по модели FAO-56 Penman-Monteith
 * Все 4 блока на одной странице. Отправка sendData() ТОЛЬКО по финальной кнопке внизу!
 */

// ─── 1. Инициализация Telegram WebApp SDK ──────────────────────────────────────
const tg = window.Telegram?.WebApp || {
  ready: () => {},
  expand: () => {},
  close: () => {},
  sendData: (data) => console.log('Telegram.WebApp.sendData:', data),
  HapticFeedback: {
    impactOccurred: () => {},
    notificationOccurred: () => {}
  }
};

try {
  tg.ready();
  tg.expand();
} catch (err) {
  console.warn('Telegram WebApp не обнаружен, режим браузера:', err);
}

// ─── 2. Состояние приложения (State) ──────────────────────────────────────────
const state = {
  latitude: null,          // Широта (определяется кнопкой GPS)
  longitude: null,         // Долгота
  accuracy: null,          // Точность в метрах
  crop: 'cotton',          // Культура: 'cotton' | 'corn' | 'alfalfa' | 'tomato'
  area: 10.0,              // Площадь поля
  area_unit: 'hectare',    // 'hectare' | 'sotka'
  irrigation_type: 'drip', // 'drip' | 'furrow'
  lang: 'ru',              // Язык: 'ru' | 'kz'
  isRequestingGps: false,
};

// ─── 3. Словарь локализации (i18n: KZ / RU) ──────────────────────────────────
const I18N = {
  ru: {
    pageTitle: 'Su-Tech — Точное земледелие',
    pageDesc: 'Интеллектуальная система управления орошением на базе модели FAO-56 Penman-Monteith',
    headerSubtitle: 'Точное земледелие • РКНП «Дарын»',

    // Блок 1: Локация
    block1Title: 'Локация участка (GPS)',
    block1StatusWait: 'Ожидает GPS',
    block1StatusReady: 'Координаты определены',
    block1Desc: 'Определите координаты поля для автоматического запроса спутниковой радиации, ветра и влажности почвы по модели FAO-56.',
    btnLocationText: 'Определить GPS координаты',
    btnLocationLoading: 'Поиск спутников GPS...',
    gpsSearching: 'Определение точных спутниковых координат...',
    coordsCardTitle: 'Координаты зафиксированы',
    labelLat: 'Широта (Lat):',
    labelLon: 'Долгота (Lon):',
    demoCoordsText: 'Использовать координаты поля (Туркестанская обл.)',

    // Блок 2: Культура
    block2Title: 'Сельскохозяйственная культура',
    block2Desc: 'Выберите культуру для учета биологического коэффициента транспирации (Kc).',
    crops: {
      cotton:  { name: 'Хлопок', sub: 'Мақта' },
      corn:    { name: 'Кукуруза', sub: 'Жүгері' },
      alfalfa: { name: 'Люцерна', sub: 'Жоңышқа' },
      tomato:  { name: 'Томаты', sub: 'Қызанақ' },
    },

    // Блок 3: Площадь
    block3Title: 'Параметры поля',
    labelAreaUnit: 'Единица измерения:',
    unitText_sotka: 'Сотки (100 м²)',
    unitText_hectare: 'Гектары (10 000 м²)',
    labelAreaValue: 'Площадь участка:',
    unitBadge_sotka: 'соток',
    unitBadge_hectare: 'гектар',
    unitSuffix_sotka: 'сот.',
    unitSuffix_hectare: 'га',
    labelQuickPresets: 'Быстрый выбор:',
    areaCalcEquivalentLabel: 'Эквивалент:',
    equivFormat: (m2, sotka) => `${m2.toLocaleString('ru-RU')} м² (${sotka.toLocaleString('ru-RU')} соток)`,

    // Блок 4: Полив
    block4Title: 'Тип оросительной системы',
    irrig: {
      drip: {
        title: 'Капельный полив',
        desc: 'Адресная подача в прикорневую зону. Экономия воды до 40-50%.',
        badge: 'КПД 90%',
      },
      furrow: {
        title: 'Арычный полив',
        desc: 'Традиционный самотечный полив. Высокие потери на фильтрацию.',
        badge: 'КПД 50%',
      },
    },

    // Сводка и отправка
    summaryTitle: 'Сводка параметров:',
    sumLabelCoords: 'Локация:',
    sumLabelCrop: 'Культура:',
    sumLabelArea: 'Площадь:',
    sumLabelIrrig: 'Технология:',
    noCoordsYet: 'Не определены (нажмите GPS)',
    btnSubmitText: 'Рассчитать норму полива',
    submitHint: 'Сбор всех 4 параметров и спутниковый расчет по формуле FAO-56 Penman-Monteith',

    // Уведомления и ошибки
    errNoGpsSupport: '❌ Ваш браузер или устройство не поддерживает геолокацию.',
    errGpsDenied: '🔒 Доступ к GPS отклонен. Разрешите геолокацию или используйте демо-координаты.',
    errGpsTimeout: '⏱️ Превышено время ожидания GPS. Попробуйте еще раз или используйте демо-точку.',
    errGpsUnknown: '❌ Ошибка определения локации. Попробуйте снова.',
    gpsSuccessToast: '✅ Координаты поля успешно зафиксированы!',
    errNeedLocation: '⚠️ Сначала нажмите "Определить GPS координаты" в Блоке 1!',
    errInvalidArea: '⚠️ Введите площадь поля больше 0!',
    successPayloadSent: '✅ Данные отправлены в бот! Производится расчет по модели FAO-56...',
  },

  kz: {
    pageTitle: 'Su-Tech — Дәл егіншілік',
    pageDesc: 'FAO-56 Penman-Monteith моделі негізінде суаруды басқарудың зияткерлік жүйесі',
    headerSubtitle: 'Дәл егіншілік • РҒПК «Дарын»',

    // Блок 1: Локация
    block1Title: 'Алаңның орналасуы (GPS)',
    block1StatusWait: 'GPS күтілуде',
    block1StatusReady: 'Координаттар тіркелді',
    block1Desc: 'FAO-56 моделі бойынша күн радиациясы, жел және топырақ ылғалын автоматты түрде сұрау үшін алқап координаттарын анықтаңыз.',
    btnLocationText: 'GPS координаттарын анықтау',
    btnLocationLoading: 'GPS спутниктерін іздеу...',
    gpsSearching: 'Нақты спутниктік координаттар анықталуда...',
    coordsCardTitle: 'Координаттар тіркелді',
    labelLat: 'Ендік (Lat):',
    labelLon: 'Бойлық (Lon):',
    demoCoordsText: 'Алқаптың үлгі координаттары (Түркістан обл.)',

    // Блок 2: Культура
    block2Title: 'Ауыл шаруашылығы дақылы',
    block2Desc: 'Биологиялық транспирация коэффициентін (Kc) ескеру үшін дақылды таңдаңыз.',
    crops: {
      cotton:  { name: 'Мақта', sub: 'Хлопок' },
      corn:    { name: 'Жүгері', sub: 'Кукуруза' },
      alfalfa: { name: 'Жоңышқа', sub: 'Люцерна' },
      tomato:  { name: 'Қызанақ', sub: 'Томаты' },
    },

    // Блок 3: Площадь
    block3Title: 'Алқап параметрлері',
    labelAreaUnit: 'Өлшем бірлігі:',
    unitText_sotka: 'Соттық (100 м²)',
    unitText_hectare: 'Гектар (10 000 м²)',
    labelAreaValue: 'Учаске ауданы:',
    unitBadge_sotka: 'соттық',
    unitBadge_hectare: 'гектар',
    unitSuffix_sotka: 'сот.',
    unitSuffix_hectare: 'га',
    labelQuickPresets: 'Жылдам таңдау:',
    areaCalcEquivalentLabel: 'Эквивалент:',
    equivFormat: (m2, sotka) => `${m2.toLocaleString('ru-RU')} м² (${sotka.toLocaleString('ru-RU')} соттық)`,

    // Блок 4: Полив
    block4Title: 'Суару жүйесінің түрі',
    irrig: {
      drip: {
        title: 'Тамшылатып суару',
        desc: 'Тамыр аймағына дәл жеткізу. Суды 40-50%-ға дейін үнемдеу.',
        badge: 'ПӘК 90%',
      },
      furrow: {
        title: 'Арықпен суару',
        desc: 'Дәстүрлі өздігінен ағатын суару. Сүзілу мен булануға шығын жоғары.',
        badge: 'ПӘК 50%',
      },
    },

    // Сводка и отправка
    summaryTitle: 'Параметрлер қорытындысы:',
    sumLabelCoords: 'Орналасуы:',
    sumLabelCrop: 'Дақыл:',
    sumLabelArea: 'Ауданы:',
    sumLabelIrrig: 'Технология:',
    noCoordsYet: 'Анықталмаған (GPS басыңыз)',
    btnSubmitText: 'Суару нормасын есептеу',
    submitHint: 'Барлық 4 параметрді жинау және FAO-56 Penman-Monteith формуласымен есептеу',

    // Уведомления и ошибки
    errNoGpsSupport: '❌ Құрылғыңыз немесе браузер геолокацияны қолдамайды.',
    errGpsDenied: '🔒 GPS рұқсаты берілмеді. Геолокацияны қосыңыз немесе үлгі нүктені таңдаңыз.',
    errGpsTimeout: '⏱️ GPS күту уақыты өтіп кетті. Қайталап көріңіз немесе үлгі нүктені басыңыз.',
    errGpsUnknown: '❌ Орналасқан жерді анықтау қатесі. Қайталап көріңіз.',
    gpsSuccessToast: '✅ Алқап координаттары сәтті тіркелді!',
    errNeedLocation: '⚠️ Алдымен 1-блокта "GPS координаттарын анықтау" түймесін басыңыз!',
    errInvalidArea: '⚠️ 0-ден үлкен алқап ауданын енгізіңіз!',
    successPayloadSent: '✅ Деректер ботқа жіберілді! FAO-56 моделі бойынша есептеу жүргізілуде...',
  },
};

// ─── 4. Управление языком (KZ / RU) ───────────────────────────────────────────
function initLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang')?.toLowerCase();

  if (langParam === 'kz' || langParam === 'ru') {
    state.lang = langParam;
  } else {
    state.lang = 'ru';
  }
  applyLanguage(state.lang);
}

function setLanguage(lang) {
  if (state.lang === lang) return;
  state.lang = lang;

  // Обновляем query-параметр без перезагрузки
  const url = new URL(window.location);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);

  applyLanguage(lang);
  updateSummaryCard();
}

function applyLanguage(lang) {
  const t = I18N[lang] || I18N.ru;

  document.getElementById('htmlRoot').setAttribute('lang', lang);
  document.getElementById('pageTitle').textContent = t.pageTitle;
  document.getElementById('pageDesc').setAttribute('content', t.pageDesc);
  document.getElementById('headerSubtitle').textContent = t.headerSubtitle;

  // Переключатель в шапке
  const btnKz = document.getElementById('langBtnKz');
  const btnRu = document.getElementById('langBtnRu');
  if (lang === 'kz') {
    btnKz.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all bg-emerald-500 text-slate-950 shadow-sm';
    btnRu.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-emerald-300 hover:text-white';
  } else {
    btnRu.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all bg-emerald-500 text-slate-950 shadow-sm';
    btnKz.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all text-emerald-300 hover:text-white';
  }

  // Блок 1
  document.getElementById('block1Title').textContent = t.block1Title;
  document.getElementById('block1Desc').textContent = t.block1Desc;
  if (!state.isRequestingGps) {
    document.getElementById('btnLocationText').textContent = t.btnLocationText;
  } else {
    document.getElementById('btnLocationText').textContent = t.btnLocationLoading;
  }
  document.getElementById('coordsCardTitle').innerHTML = `<span>✅</span> ${t.coordsCardTitle}`;
  document.getElementById('labelLat').textContent = t.labelLat;
  document.getElementById('labelLon').textContent = t.labelLon;
  document.getElementById('demoCoordsText').textContent = t.demoCoordsText;
  updateBlock1StatusPill();

  // Блок 2
  document.getElementById('block2Title').textContent = t.block2Title;
  document.getElementById('block2Desc').textContent = t.block2Desc;
  for (const cropKey of ['cotton', 'corn', 'alfalfa', 'tomato']) {
    document.getElementById(`cropName_${cropKey}`).textContent = t.crops[cropKey].name;
    document.getElementById(`cropSub_${cropKey}`).textContent = t.crops[cropKey].sub;
  }

  // Блок 3
  document.getElementById('block3Title').textContent = t.block3Title;
  document.getElementById('labelAreaUnit').textContent = t.labelAreaUnit;
  document.getElementById('unitText_sotka').textContent = t.unitText_sotka;
  document.getElementById('unitText_hectare').textContent = t.unitText_hectare;
  document.getElementById('labelAreaValue').textContent = t.labelAreaValue;
  document.getElementById('labelQuickPresets').textContent = t.labelQuickPresets;
  document.getElementById('areaCalcEquivalentLabel').textContent = t.areaCalcEquivalentLabel;
  updateAreaUnitUI();

  // Блок 4
  document.getElementById('block4Title').textContent = t.block4Title;
  document.getElementById('irrigTitle_drip').textContent = t.irrig.drip.title;
  document.getElementById('irrigDesc_drip').textContent = t.irrig.drip.desc;
  document.getElementById('irrigTitle_furrow').textContent = t.irrig.furrow.title;
  document.getElementById('irrigDesc_furrow').textContent = t.irrig.furrow.desc;

  // Сводка и кнопка
  document.getElementById('summaryTitle').textContent = t.summaryTitle;
  document.getElementById('sumLabelCoords').textContent = t.sumLabelCoords;
  document.getElementById('sumLabelCrop').textContent = t.sumLabelCrop;
  document.getElementById('sumLabelArea').textContent = t.sumLabelArea;
  document.getElementById('sumLabelIrrig').textContent = t.sumLabelIrrig;
  document.getElementById('btnSubmitText').textContent = t.btnSubmitText;
  document.getElementById('submitHint').textContent = t.submitHint;
}

function updateBlock1StatusPill() {
  const t = I18N[state.lang] || I18N.ru;
  const pill = document.getElementById('block1StatusPill');

  if (state.latitude !== null && state.longitude !== null) {
    pill.className = 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    pill.textContent = `✅ ${t.block1StatusReady}`;
  } else {
    pill.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30';
    pill.textContent = t.block1StatusWait;
  }
}

// ─── 5. Геолокация (ТОЛЬКО получение координат, БЕЗ sendData!) ───────────────
function requestGeolocation() {
  if (state.isRequestingGps) return;

  const t = I18N[state.lang] || I18N.ru;

  if (!navigator.geolocation) {
    showToast(t.errNoGpsSupport, 'error');
    return;
  }

  state.isRequestingGps = true;
  const btn = document.getElementById('btnGetLocation');
  const btnText = document.getElementById('btnLocationText');
  const btnIcon = document.getElementById('btnLocationIcon');
  const statusBlock = document.getElementById('gpsStatusBlock');
  const statusText = document.getElementById('gpsStatusText');

  btn.classList.add('opacity-75');
  btnIcon.textContent = '⏳';
  btnText.textContent = t.btnLocationLoading;

  statusBlock.classList.remove('hidden');
  statusText.textContent = t.gpsSearching;

  try {
    tg.HapticFeedback?.impactOccurred('light');
  } catch (e) {}

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.isRequestingGps = false;
      btn.classList.remove('opacity-75');
      btnIcon.textContent = '🛰️';
      btnText.textContent = t.btnLocationText;
      statusBlock.classList.add('hidden');

      // Сохраняем координаты в состояние
      state.latitude = position.coords.latitude;
      state.longitude = position.coords.longitude;
      state.accuracy = Math.round(position.coords.accuracy || 8);

      // Обновляем отображение в Блоке 1 и в Сводке (БЕЗ закрытия и БЕЗ sendData!)
      renderCoordinates();
      updateBlock1StatusPill();
      updateSummaryCard();
      showToast(t.gpsSuccessToast, 'success');

      try {
        tg.HapticFeedback?.notificationOccurred('success');
      } catch (e) {}
    },
    (error) => {
      state.isRequestingGps = false;
      btn.classList.remove('opacity-75');
      btnIcon.textContent = '🛰️';
      btnText.textContent = t.btnLocationText;
      statusBlock.classList.add('hidden');

      let msg = t.errGpsUnknown;
      if (error.code === 1) msg = t.errGpsDenied;
      else if (error.code === 3) msg = t.errGpsTimeout;

      showToast(msg, 'error');
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
}

function setDemoCoordinates() {
  const t = I18N[state.lang] || I18N.ru;

  // Опытный поливной участок (Туркестанская область, Отырарский район)
  state.latitude = 43.301540;
  state.longitude = 68.256850;
  state.accuracy = 5;

  renderCoordinates();
  updateBlock1StatusPill();
  updateSummaryCard();
  showToast(t.gpsSuccessToast, 'success');

  try {
    tg.HapticFeedback?.impactOccurred('medium');
  } catch (e) {}
}

function renderCoordinates() {
  if (state.latitude === null || state.longitude === null) return;

  const card = document.getElementById('coordsCard');
  card.classList.remove('hidden');

  document.getElementById('displayLat').textContent = `${state.latitude.toFixed(6)}°`;
  document.getElementById('displayLon').textContent = `${state.longitude.toFixed(6)}°`;
  document.getElementById('coordsAccuracy').textContent = `±${state.accuracy || 5} м`;
}

// ─── 6. Выбор культуры (Блок 2) ───────────────────────────────────────────────
function selectCrop(cropKey) {
  state.crop = cropKey;

  for (const key of ['cotton', 'corn', 'alfalfa', 'tomato']) {
    const card = document.getElementById(`cropCard_${key}`);
    const check = document.getElementById(`check_${key}`);

    if (key === cropKey) {
      card.classList.add('card-selected');
      check.classList.remove('hidden');
    } else {
      card.classList.remove('card-selected');
      check.classList.add('hidden');
    }
  }

  updateSummaryCard();

  try {
    tg.HapticFeedback?.impactOccurred('light');
  } catch (e) {}
}

// ─── 7. Параметры поля: площадь и единицы (Блок 3) ───────────────────────────
function setAreaUnit(unit) {
  if (state.area_unit === unit) return;
  state.area_unit = unit;

  updateAreaUnitUI();
  updateSummaryCard();

  try {
    tg.HapticFeedback?.impactOccurred('light');
  } catch (e) {}
}

function updateAreaUnitUI() {
  const t = I18N[state.lang] || I18N.ru;
  const btnSotka = document.getElementById('unitBtn_sotka');
  const btnHectare = document.getElementById('unitBtn_hectare');
  const badge = document.getElementById('currentAreaUnitBadge');
  const suffix = document.getElementById('inputUnitSuffix');

  if (state.area_unit === 'hectare') {
    btnHectare.className = 'py-2 px-3 rounded-lg text-xs font-bold transition-all bg-emerald-500 text-slate-950 shadow-md';
    btnSotka.className = 'py-2 px-3 rounded-lg text-xs font-bold transition-all text-slate-300 hover:text-white';
    badge.textContent = t.unitBadge_hectare;
    suffix.textContent = t.unitSuffix_hectare;
  } else {
    btnSotka.className = 'py-2 px-3 rounded-lg text-xs font-bold transition-all bg-emerald-500 text-slate-950 shadow-md';
    btnHectare.className = 'py-2 px-3 rounded-lg text-xs font-bold transition-all text-slate-300 hover:text-white';
    badge.textContent = t.unitBadge_sotka;
    suffix.textContent = t.unitSuffix_sotka;
  }

  recalculateAreaEquivalent();
}

function handleAreaChange(val) {
  const num = parseFloat(val);
  if (!isNaN(num) && num > 0) {
    state.area = num;
  } else {
    state.area = 0;
  }
  recalculateAreaEquivalent();
  updateSummaryCard();
}

function setPresetArea(val) {
  state.area = val;
  document.getElementById('fieldAreaInput').value = val;
  recalculateAreaEquivalent();
  updateSummaryCard();

  try {
    tg.HapticFeedback?.impactOccurred('light');
  } catch (e) {}
}

function recalculateAreaEquivalent() {
  const t = I18N[state.lang] || I18N.ru;
  const equivEl = document.getElementById('areaInM2');

  let m2 = 0;
  let sotka = 0;

  if (state.area_unit === 'hectare') {
    m2 = Math.round(state.area * 10000);
    sotka = Math.round(state.area * 100);
  } else {
    m2 = Math.round(state.area * 100);
    sotka = Math.round(state.area);
  }

  equivEl.textContent = t.equivFormat(m2, sotka);
}

// ─── 8. Тип полива (Блок 4) ───────────────────────────────────────────────────
function selectIrrigation(type) {
  state.irrigation_type = type;

  for (const key of ['drip', 'furrow']) {
    const card = document.getElementById(`irrigCard_${key}`);
    const check = document.getElementById(`checkIrrig_${key}`);

    if (key === type) {
      card.classList.add('card-selected');
      check.classList.remove('hidden');
    } else {
      card.classList.remove('card-selected');
      check.classList.add('hidden');
    }
  }

  updateSummaryCard();

  try {
    tg.HapticFeedback?.impactOccurred('light');
  } catch (e) {}
}

// ─── 9. Сводная карточка параметров ──────────────────────────────────────────
function updateSummaryCard() {
  const t = I18N[state.lang] || I18N.ru;

  // GPS
  const coordsVal = document.getElementById('sumValCoords');
  if (state.latitude !== null && state.longitude !== null) {
    coordsVal.textContent = `${state.latitude.toFixed(4)}°, ${state.longitude.toFixed(4)}°`;
    coordsVal.className = 'font-mono text-emerald-300 font-semibold text-[11px]';
  } else {
    coordsVal.textContent = t.noCoordsYet;
    coordsVal.className = 'font-mono text-amber-300/80 font-medium text-[11px]';
  }

  // Культура
  const cropInfo = t.crops[state.crop];
  document.getElementById('sumValCrop').textContent = `${cropInfo.name} (${cropInfo.sub})`;

  // Площадь
  const unitLabel = state.area_unit === 'hectare' ? t.unitBadge_hectare : t.unitBadge_sotka;
  document.getElementById('sumValArea').textContent = `${state.area} ${unitLabel}`;

  // Полив
  const irrigInfo = t.irrig[state.irrigation_type];
  document.getElementById('sumValIrrig').textContent = `${irrigInfo.title} (${irrigInfo.badge})`;
}

// ─── 10. ФИНАЛЬНАЯ ОТПРАВКА: ТОЛЬКО по нажатию на кнопку внизу! ───────────────
function submitFinalCalculation() {
  const t = I18N[state.lang] || I18N.ru;

  // 1. Проверка наличия координат
  if (state.latitude === null || state.longitude === null) {
    showToast(t.errNeedLocation, 'warning');
    document.getElementById('block1').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 2. Проверка площади
  if (!state.area || state.area <= 0) {
    showToast(t.errInvalidArea, 'warning');
    document.getElementById('block3').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 3. Сборка полного JSON объекта
  const payload = {
    latitude: Number(state.latitude.toFixed(6)),
    longitude: Number(state.longitude.toFixed(6)),
    crop: state.crop,
    area: Number(state.area),
    area_unit: state.area_unit,
    irrigation_type: state.irrigation_type,
  };

  const payloadString = JSON.stringify(payload);
  console.log('Отправка в бота Su-Tech через sendData():', payloadString);

  showToast(t.successPayloadSent, 'success');

  try {
    tg.HapticFeedback?.notificationOccurred('success');
  } catch (e) {}

  // 4. Отправка в бот и закрытие WebApp
  setTimeout(() => {
    try {
      tg.sendData(payloadString);
    } catch (err) {
      console.error('Ошибка tg.sendData:', err);
    }

    try {
      tg.close();
    } catch (e) {}
  }, 400);
}

// ─── 11. Всплывающие уведомления (Toast) ──────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;

  clearTimeout(toastTimer);

  let bg = 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40 shadow-emerald-950/80';
  if (type === 'error') {
    bg = 'bg-rose-950/95 text-rose-200 border-rose-500/50 shadow-rose-950/80';
  } else if (type === 'warning') {
    bg = 'bg-amber-950/95 text-amber-200 border-amber-500/50 shadow-amber-950/80';
  } else if (type === 'success') {
    bg = 'bg-emerald-900/95 text-emerald-100 border-emerald-400/60 shadow-emerald-950/80';
  }

  toast.className = `fixed top-4 left-4 right-4 z-50 p-3.5 rounded-xl text-xs font-semibold text-center border shadow-2xl backdrop-blur-md transition-all ${bg}`;
  toast.textContent = message;
  toast.classList.remove('hidden');

  try {
    if (type === 'error' || type === 'warning') {
      tg.HapticFeedback?.notificationOccurred('warning');
    }
  } catch (e) {}

  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// ─── 12. Инициализация при загрузке DOM ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  recalculateAreaEquivalent();
  updateSummaryCard();
});
