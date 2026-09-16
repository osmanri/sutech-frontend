/**
 * Su-Tech — Интеллектуальная система точного земледелия (Telegram WebApp)
 * Научный модуль расчета норм полива по модели FAO-56 Penman-Monteith
 * Двуязычная поддержка (KZ / RU)
 */

// ─── 1. Инициализация Telegram WebApp SDK ──────────────────────────────────────
const tg = window.Telegram?.WebApp || {
  ready: () => {},
  expand: () => {},
  close: () => {},
  sendData: (data) => console.log('Telegram.WebApp.sendData:', data),
  BackButton: {
    show: () => {},
    hide: () => {},
    onClick: (fn) => {},
    offClick: (fn) => {}
  },
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
  step: 1,                 // Текущий шаг визарда: 1..4
  latitude: null,          // Широта
  longitude: null,         // Долгота
  accuracy: null,          // Точность GPS (м)
  crop: 'cotton',          // Культура: 'cotton' | 'corn' | 'alfalfa' | 'tomato'
  area: 10.0,              // Площадь
  area_unit: 'hectare',    // 'sotka' | 'hectare'
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

    // Индикаторы шагов
    stepLabelIndicator: (step) => `Шаг ${step} из 4`,
    stepTitles: {
      1: 'Локация участка',
      2: 'Выбор культуры',
      3: 'Параметры поля',
      4: 'Тип полива и расчет',
    },
    stepTabs: {
      1: 'Локация',
      2: 'Культура',
      3: 'Площадь',
      4: 'Полив',
    },

    // Шаг 1: Локация
    step1Header: 'Геопозиция участка',
    step1Desc: 'Система запросит метеоданные (радиацию, ветер, влажность почвы) в точке координат по модели FAO-56.',
    btnLocationText: 'Определить GPS координаты',
    btnLocationLoading: 'Поиск спутников GPS...',
    gpsSearching: 'Определение точных спутниковых координат...',
    coordsCardTitle: 'Координаты зафиксированы',
    labelLat: 'Широта (Lat):',
    labelLon: 'Долгота (Lon):',
    demoCoordsText: 'Использовать координаты поля (Туркестанская обл.)',
    step1Privacy: 'Координаты передаются исключительно в Open-Meteo API для расчёта фактической эвапотранспирации поля.',

    // Шаг 2: Культура
    step2Header: 'Сельскохозяйственная культура',
    step2Desc: 'Коэффициент культуры (Kc) определяет биологическое водопотребление растения на данном этапе вегетации.',
    crops: {
      cotton:  { name: 'Хлопок', sub: 'Мақта' },
      corn:    { name: 'Кукуруза', sub: 'Жүгері' },
      alfalfa: { name: 'Люцерна', sub: 'Жоңышқа' },
      tomato:  { name: 'Томаты', sub: 'Қызанақ' },
    },
    step2KcNote: 'Коэффициенты Kc откалиброваны по полевым методикам FAO Irrigation and Drainage Paper 56.',

    // Шаг 3: Площадь
    step3Header: 'Параметры поля',
    step3Desc: 'Укажите площадь поливного сектора для масштабирования суммарной нормы подачи воды.',
    labelAreaUnit: 'Единица измерения площади:',
    unitText_sotka: 'Сотки (100 м²)',
    unitText_hectare: 'Гектары (10 000 м²)',
    labelAreaValue: 'Площадь участка:',
    unitBadge_sotka: 'соток',
    unitBadge_hectare: 'гектар',
    unitSuffix_sotka: 'сот.',
    unitSuffix_hectare: 'га',
    labelQuickPresets: 'Быстрый выбор:',
    areaCalcEquivalentLabel: 'Эквивалент в метрах:',
    equivFormat: (m2, sotka) => `${m2.toLocaleString('ru-RU')} м² (${sotka.toLocaleString('ru-RU')} сот.)`,

    // Шаг 4: Полив
    step4Header: 'Тип оросительной системы',
    step4Desc: 'Коэффициент полезного действия (КПД) определяет технологические потери воды при доставке к корням.',
    irrig: {
      drip: {
        title: 'Капельный полив',
        desc: 'Адресная подача в прикорневую зону. Минимальное испарение, экономия воды до 40-50%.',
        badge: 'КПД 90%',
      },
      furrow: {
        title: 'Арычный полив',
        desc: 'Традиционный самотечный способ. Потери до 50% объема на фильтрацию и испарение.',
        badge: 'КПД 50%',
      },
    },
    summaryTitle: 'Итоговые параметры расчета:',
    sumLabelCoords: 'Локация:',
    sumLabelCrop: 'Культура:',
    sumLabelArea: 'Площадь:',
    sumLabelIrrig: 'Технология:',
    noCoordsYet: 'Не определены',

    // Кнопки навигации
    btnPrevText: 'Назад',
    btnNextText: 'Далее',
    btnSubmitText: 'Рассчитать норму полива',

    // Ошибки и уведомления
    errNoGpsSupport: '❌ Ваш браузер или устройство не поддерживает геолокацию.',
    errGpsDenied: '🔒 Доступ к геопозиции отклонен. Разрешите GPS в настройках или нажмите демо-координаты.',
    errGpsTimeout: '⏱️ Превышено время ожидания GPS. Попробуйте еще раз или используйте демо-точку.',
    errGpsUnknown: '❌ Ошибка определения локации. Попробуйте снова.',
    errNeedLocation: '⚠️ Сначала определите координаты участка (GPS или демо-точка)!',
    errInvalidArea: '⚠️ Введите корректную площадь участка (больше 0)!',
    successPayloadSent: '✅ Данные переданы! Бот производит расчет по модели FAO-56...',
  },

  kz: {
    pageTitle: 'Su-Tech — Дәл егіншілік',
    pageDesc: 'FAO-56 Penman-Monteith моделі негізінде суаруды басқарудың зияткерлік жүйесі',
    headerSubtitle: 'Дәл егіншілік • РҒПК «Дарын»',

    // Индикаторы шагов
    stepLabelIndicator: (step) => `${step}-қадам (барлығы 4)`,
    stepTitles: {
      1: 'Учаскенің орналасуы',
      2: 'Дақылды таңдау',
      3: 'Алқап параметрлері',
      4: 'Суару түрі және есептеу',
    },
    stepTabs: {
      1: 'Орналасу',
      2: 'Дақыл',
      3: 'Алаң',
      4: 'Суару',
    },

    // Шаг 1: Локация
    step1Header: 'Учаскенің геопозициясы',
    step1Desc: 'Жүйе FAO-56 моделі бойынша нүктедегі метеодеректерді (күн радиациясы, жел, топырақ ылғалы) сұрайды.',
    btnLocationText: 'GPS координаттарын анықтау',
    btnLocationLoading: 'GPS спутниктерін іздеу...',
    gpsSearching: 'Нақты спутниктік координаттар анықталуда...',
    coordsCardTitle: 'Координаттар тіркелді',
    labelLat: 'Ендік (Lat):',
    labelLon: 'Бойлық (Lon):',
    demoCoordsText: 'Алқаптың үлгі координаттары (Түркістан обл.)',
    step1Privacy: 'Координаттар тек алқаптың нақты эвапотранспирациясын есептеу үшін Open-Meteo API-ге жіберіледі.',

    // Шаг 2: Культура
    step2Header: 'Ауыл шаруашылығы дақылы',
    step2Desc: 'Дақыл коэффициенті (Kc) өсімдіктің вегетация кезеңіндегі биологиялық су қажеттілігін анықтайды.',
    crops: {
      cotton:  { name: 'Мақта', sub: 'Хлопок' },
      corn:    { name: 'Жүгері', sub: 'Кукуруза' },
      alfalfa: { name: 'Жоңышқа', sub: 'Люцерна' },
      tomato:  { name: 'Қызанақ', sub: 'Томаты' },
    },
    step2KcNote: 'Kc коэффициенттері FAO Irrigation and Drainage Paper 56 әдістемесіне сәйкес калибрленген.',

    // Шаг 3: Площадь
    step3Header: 'Алқап параметрлері',
    step3Desc: 'Жалпы су беру нормасын масштабтау үшін суармалы сектордың көлемін көрсетіңіз.',
    labelAreaUnit: 'Ауданның өлшем бірлігі:',
    unitText_sotka: 'Соттық (100 м²)',
    unitText_hectare: 'Гектар (10 000 м²)',
    labelAreaValue: 'Учаске ауданы:',
    unitBadge_sotka: 'соттық',
    unitBadge_hectare: 'гектар',
    unitSuffix_sotka: 'сот.',
    unitSuffix_hectare: 'га',
    labelQuickPresets: 'Жылдам таңдау:',
    areaCalcEquivalentLabel: 'Метрдегі баламасы:',
    equivFormat: (m2, sotka) => `${m2.toLocaleString('ru-RU')} м² (${sotka.toLocaleString('ru-RU')} сот.)`,

    // Шаг 4: Полив
    step4Header: 'Суару жүйесінің түрі',
    step4Desc: 'Пайдалы әсер коэффициенті (ПӘК) суды тамырға жеткізу кезіндегі технологиялық шығындарды анықтайды.',
    irrig: {
      drip: {
        title: 'Тамшылатып суару',
        desc: 'Тамыр аймағына дәл жеткізу. Ең аз булану, суды 40-50%-ға дейін үнемдеу.',
        badge: 'ПӘК 90%',
      },
      furrow: {
        title: 'Арықпен суару',
        desc: 'Дәстүрлі өздігінен ағатын әдіс. Сүзілу мен булануға 50%-ға дейін шығын болады.',
        badge: 'ПӘК 50%',
      },
    },
    summaryTitle: 'Есептеудің қорытынды параметрлері:',
    sumLabelCoords: 'Орналасуы:',
    sumLabelCrop: 'Дақыл:',
    sumLabelArea: 'Ауданы:',
    sumLabelIrrig: 'Технология:',
    noCoordsYet: 'Анықталмаған',

    // Кнопки навигации
    btnPrevText: 'Артқа',
    btnNextText: 'Келесі',
    btnSubmitText: 'Суару мөлшерін есептеу',

    // Ошибки и уведомления
    errNoGpsSupport: '❌ Құрылғыңыз немесе браузер геолокацияны қолдамайды.',
    errGpsDenied: '🔒 Геопозицияға рұқсат берілмеді. GPS қосыңыз немесе үлгі координаттарды басыңыз.',
    errGpsTimeout: '⏱️ GPS күту уақыты өтіп кетті. Қайталап көріңіз немесе үлгі нүктені таңдаңыз.',
    errGpsUnknown: '❌ Орналасқан жерді анықтау қатесі. Қайталап көріңіз.',
    errNeedLocation: '⚠️ Алдымен учаскенің координаттарын анықтаңыз (GPS немесе үлгі нүкте)!',
    errInvalidArea: '⚠️ Алқаптың дұрыс ауданын енгізіңіз (0-ден үлкен)!',
    successPayloadSent: '✅ Деректер жіберілді! Бот FAO-56 моделі бойынша есептеу жүргізуде...',
  },
};

// ─── 4. Управление языком интерфейса ───────────────────────────────────────────
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

  // Обновляем query-параметр без перезагрузки страницы
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

  // Индикаторы шагов
  document.getElementById('stepLabelIndicator').textContent = t.stepLabelIndicator(state.step);
  document.getElementById('stepTitleIndicator').textContent = t.stepTitles[state.step];
  document.getElementById('stepTabName1').textContent = t.stepTabs[1];
  document.getElementById('stepTabName2').textContent = t.stepTabs[2];
  document.getElementById('stepTabName3').textContent = t.stepTabs[3];
  document.getElementById('stepTabName4').textContent = t.stepTabs[4];

  // Шаг 1
  document.getElementById('step1Header').firstElementChild.textContent = t.step1Header;
  document.getElementById('step1Desc').textContent = t.step1Desc;
  if (!state.isRequestingGps) {
    document.getElementById('btnLocationText').textContent = t.btnLocationText;
  } else {
    document.getElementById('btnLocationText').textContent = t.btnLocationLoading;
  }
  document.getElementById('coordsCardTitle').innerHTML = `<span>✅</span> ${t.coordsCardTitle}`;
  document.getElementById('labelLat').textContent = t.labelLat;
  document.getElementById('labelLon').textContent = t.labelLon;
  document.getElementById('demoCoordsText').textContent = t.demoCoordsText;
  document.getElementById('step1Privacy').textContent = t.step1Privacy;

  // Шаг 2
  document.getElementById('step2Header').firstElementChild.textContent = t.step2Header;
  document.getElementById('step2Desc').textContent = t.step2Desc;
  for (const cropKey of ['cotton', 'corn', 'alfalfa', 'tomato']) {
    document.getElementById(`cropName_${cropKey}`).textContent = t.crops[cropKey].name;
    document.getElementById(`cropSub_${cropKey}`).textContent = t.crops[cropKey].sub;
  }
  document.getElementById('step2KcNote').textContent = t.step2KcNote;

  // Шаг 3
  document.getElementById('step3Header').firstElementChild.textContent = t.step3Header;
  document.getElementById('step3Desc').textContent = t.step3Desc;
  document.getElementById('labelAreaUnit').textContent = t.labelAreaUnit;
  document.getElementById('unitText_sotka').textContent = t.unitText_sotka;
  document.getElementById('unitText_hectare').textContent = t.unitText_hectare;
  document.getElementById('labelAreaValue').textContent = t.labelAreaValue;
  document.getElementById('labelQuickPresets').textContent = t.labelQuickPresets;
  document.getElementById('areaCalcEquivalentLabel').textContent = t.areaCalcEquivalentLabel;
  updateAreaUnitUI();

  // Шаг 4
  document.getElementById('step4Header').firstElementChild.textContent = t.step4Header;
  document.getElementById('step4Desc').textContent = t.step4Desc;
  document.getElementById('irrigTitle_drip').textContent = t.irrig.drip.title;
  document.getElementById('irrigDesc_drip').textContent = t.irrig.drip.desc;
  document.getElementById('irrigTitle_furrow').textContent = t.irrig.furrow.title;
  document.getElementById('irrigDesc_furrow').textContent = t.irrig.furrow.desc;

  document.getElementById('summaryTitle').textContent = t.summaryTitle;
  document.getElementById('sumLabelCoords').textContent = t.sumLabelCoords;
  document.getElementById('sumLabelCrop').textContent = t.sumLabelCrop;
  document.getElementById('sumLabelArea').textContent = t.sumLabelArea;
  document.getElementById('sumLabelIrrig').textContent = t.sumLabelIrrig;

  // Кнопки навигации
  document.getElementById('btnPrevText').textContent = t.btnPrevText;
  updateNavButtons();
}

// ─── 5. Геолокация (GPS и Демо) ───────────────────────────────────────────────
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
  const statusSpinner = document.getElementById('gpsStatusSpinner');
  const statusText = document.getElementById('gpsStatusText');

  btn.classList.add('opacity-75');
  btnIcon.textContent = '⏳';
  btnText.textContent = t.btnLocationLoading;

  statusBlock.className = 'w-full mt-3 p-3 rounded-xl text-xs flex items-center justify-center gap-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 animate-pulse';
  statusBlock.classList.remove('hidden');
  statusSpinner.classList.remove('hidden');
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

      state.latitude = position.coords.latitude;
      state.longitude = position.coords.longitude;
      state.accuracy = Math.round(position.coords.accuracy || 10);

      renderCoordinates();
      updateSummaryCard();

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
  // Координаты опытного поливного участка в Туркестанской области (Отырарский район, бассейн Сырдарьи)
  state.latitude = 43.301540;
  state.longitude = 68.256850;
  state.accuracy = 5;

  renderCoordinates();
  updateSummaryCard();

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
  document.getElementById('coordsAccuracy').textContent = `±${state.accuracy || 8} м`;
}

// ─── 6. Выбор культуры (Crop Selection) ───────────────────────────────────────
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

// ─── 7. Параметры поля (Area & Units) ─────────────────────────────────────────
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
    btnHectare.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition-all bg-emerald-500 text-slate-950 shadow-md';
    btnSotka.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-slate-300 hover:text-white';
    badge.textContent = t.unitBadge_hectare;
    suffix.textContent = t.unitSuffix_hectare;
  } else {
    btnSotka.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition-all bg-emerald-500 text-slate-950 shadow-md';
    btnHectare.className = 'py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-slate-300 hover:text-white';
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

// ─── 8. Тип полива (Irrigation Selection) ─────────────────────────────────────
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

// ─── 9. Сводная карточка (Summary Card) ───────────────────────────────────────
function updateSummaryCard() {
  const t = I18N[state.lang] || I18N.ru;

  // GPS
  const coordsVal = document.getElementById('sumValCoords');
  if (state.latitude !== null && state.longitude !== null) {
    coordsVal.textContent = `${state.latitude.toFixed(4)}°, ${state.longitude.toFixed(4)}°`;
  } else {
    coordsVal.textContent = t.noCoordsYet;
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

// ─── 10. Пошаговая навигация (Wizard Engine) ──────────────────────────────────
function goToStep(targetStep) {
  if (targetStep === state.step) return;

  // При переходе вперед проверяем обязательные поля
  if (targetStep > state.step) {
    if (!validateCurrentStep()) return;
  }

  setStep(targetStep);
}

function nextStep() {
  if (!validateCurrentStep()) return;

  if (state.step < 4) {
    setStep(state.step + 1);
  }
}

function prevStep() {
  if (state.step > 1) {
    setStep(state.step - 1);
  }
}

function setStep(newStep) {
  state.step = newStep;
  const t = I18N[state.lang] || I18N.ru;

  // 1. Переключение экранов
  for (let i = 1; i <= 4; i++) {
    const pane = document.getElementById(`stepPane${i}`);
    if (i === newStep) {
      pane.classList.remove('hidden-pane');
      pane.classList.add('active-pane');
    } else {
      pane.classList.remove('active-pane');
      pane.classList.add('hidden-pane');
    }
  }

  // 2. Обновление прогресс-бара
  const progressPercent = (newStep / 4) * 100;
  document.getElementById('progressBar').style.width = `${progressPercent}%`;

  // 3. Обновление иконок табов
  document.getElementById('stepLabelIndicator').textContent = t.stepLabelIndicator(newStep);
  document.getElementById('stepTitleIndicator').textContent = t.stepTitles[newStep];

  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`stepDot${i}`);
    const name = document.getElementById(`stepTabName${i}`);

    if (i === newStep) {
      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300';
      name.className = 'text-[10px] text-emerald-300 font-bold tracking-tight';
    } else if (i < newStep) {
      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all bg-emerald-700 text-white shadow-sm';
      name.className = 'text-[10px] text-emerald-400/80 font-medium tracking-tight';
    } else {
      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all bg-emerald-900/50 text-emerald-400/50 border border-emerald-500/20';
      name.className = 'text-[10px] text-slate-400 font-medium tracking-tight';
    }
  }

  // 4. Кнопки навигации и Telegram BackButton
  updateNavButtons();

  // Скролл вверх окна
  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    tg.HapticFeedback?.impactOccurred('light');
  } catch (e) {}
}

function updateNavButtons() {
  const t = I18N[state.lang] || I18N.ru;
  const btnPrev = document.getElementById('btnPrevStep');
  const btnNext = document.getElementById('btnNextStep');
  const btnNextText = document.getElementById('btnNextText');
  const btnNextIcon = document.getElementById('btnNextIcon');

  if (state.step === 1) {
    btnPrev.classList.add('hidden');
    try {
      tg.BackButton?.hide();
    } catch (e) {}
  } else {
    btnPrev.classList.remove('hidden');
    try {
      tg.BackButton?.show();
      tg.BackButton?.onClick(prevStep);
    } catch (e) {}
  }

  if (state.step === 4) {
    btnNextText.textContent = t.btnSubmitText;
    btnNextIcon.textContent = '🚀';
    btnNext.className = 'flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 border border-emerald-100/40';
  } else {
    btnNextText.textContent = t.btnNextText;
    btnNextIcon.textContent = '→';
    btnNext.className = 'flex-1 py-3.5 px-6 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-300 hover:from-emerald-300 hover:to-green-300 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 border border-emerald-200/40';
  }
}

function validateCurrentStep() {
  const t = I18N[state.lang] || I18N.ru;

  if (state.step === 1) {
    if (state.latitude === null || state.longitude === null) {
      showToast(t.errNeedLocation, 'warning');
      return false;
    }
  }

  if (state.step === 3) {
    if (!state.area || state.area <= 0) {
      showToast(t.errInvalidArea, 'warning');
      return false;
    }
  }

  return true;
}

function handleNextOrSubmit() {
  if (state.step < 4) {
    nextStep();
  } else {
    submitIrrigationCalculation();
  }
}

// ─── 11. Отправка данных в Telegram (sendData) ───────────────────────────────
function submitIrrigationCalculation() {
  const t = I18N[state.lang] || I18N.ru;

  if (!validateCurrentStep()) return;

  // Сборка полного JSON объекта
  const payload = {
    latitude: Number(state.latitude.toFixed(6)),
    longitude: Number(state.longitude.toFixed(6)),
    crop: state.crop,
    area: Number(state.area),
    area_unit: state.area_unit,
    irrigation_type: state.irrigation_type,
  };

  const payloadString = JSON.stringify(payload);
  console.log('Отправка в бота Su-Tech:', payloadString);

  showToast(t.successPayloadSent, 'success');

  try {
    tg.HapticFeedback?.notificationOccurred('success');
  } catch (e) {}

  // Отправка в бот через Telegram.WebApp.sendData()
  setTimeout(() => {
    try {
      tg.sendData(payloadString);
    } catch (err) {
      console.error('Ошибка tg.sendData:', err);
    }

    try {
      tg.close();
    } catch (e) {}
  }, 500);
}

// ─── 12. Всплывающие уведомления (Toast) ──────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;

  clearTimeout(toastTimer);

  let bg = 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30';
  if (type === 'error') {
    bg = 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-900/50';
  } else if (type === 'warning') {
    bg = 'bg-amber-950/90 text-amber-200 border-amber-500/40 shadow-amber-900/50';
  } else if (type === 'success') {
    bg = 'bg-emerald-900/90 text-emerald-100 border-emerald-400 shadow-emerald-900/50';
  }

  toast.className = `fixed top-5 left-4 right-4 z-50 p-3.5 rounded-xl text-xs font-semibold text-center border shadow-2xl backdrop-blur-md transition-all ${bg}`;
  toast.textContent = message;
  toast.classList.remove('hidden');

  try {
    if (type === 'error' || type === 'warning') {
      tg.HapticFeedback?.notificationOccurred('warning');
    }
  } catch (e) {}

  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// ─── 13. Инициализация при загрузке страницы ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLanguage();
  recalculateAreaEquivalent();
  updateSummaryCard();
});
