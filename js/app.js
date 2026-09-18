/**
 * Su-Tech — Интеллектуальная система точного земледелия (Telegram WebApp)
 * Расчёт норм полива по модели FAO-56 Penman-Monteith
 * Design System: Su-Tech / marine blue, ink and warm stone
 * Palette: marine #247C9C, ink #182D3B, stone #F5F3EF, copper #B9764D
 * v4.0.0 — локальные стили и Leaflet, резервная подложка, адаптивная карта
 */

// ─── 1. Инициализация Telegram WebApp SDK ──────────────────────────────────
let tg = window.Telegram?.WebApp || {
  ready:   () => {},
  expand:  () => {},
  close:   () => {},
  sendData: (data) => console.log('[Su-Tech] Telegram.WebApp.sendData:', data),
  HapticFeedback: {
    impactOccurred:       () => {},
    notificationOccurred: () => {},
  },
};

function connectTelegram() {
  if (!window.Telegram?.WebApp) return;
  tg = window.Telegram.WebApp;
  try {
    tg.ready();
    tg.expand();
    tg.onEvent?.('viewportChanged', () => fieldMap?.invalidateSize({ pan: false }));
  } catch (err) {
    console.warn('[Su-Tech] Telegram initialization:', err);
  }
}
window.addEventListener('telegram-ready', connectTelegram);

// ─── 2. Состояние приложения ───────────────────────────────────────────────
let currentCrop = 'cotton';
let selectedCrop = currentCrop; // Псевдоним для совместимости
let currentArea = 10.0;
let currentUnit = 'hectare';
let currentIrrigation = 'drip';
let currentFieldType = 'open';
let currentSaline = 'no';
let isSubmitting = false;
let fieldMap = null;
let gpsMarker = null;
let fieldLayers = null;
let fieldPoints = [];
let fieldMode = 'manual';
let mappedAreaM2 = 0;
let radiusCenter = null;
let mapTilesFailed = false;
let mapBasemap = 'streets';
let activeTileLayer = null;
let tileWatchdog = null;
let tileAttempt = 0;
let mapResizeObserver = null;

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

// ─── 3. Данные культур (Kc-коэффициенты FAO-56, 9 культур) ─────────────────
const CROPS = {
  wheat:     { kc: 1.10 },
  cotton:    { kc: 1.15 },
  corn:      { kc: 1.20 },
  rice:      { kc: 1.25 },
  alfalfa:   { kc: 1.05 },
  melon:     { kc: 1.05 },
  tomato:    { kc: 1.15 },
  potato:    { kc: 1.10 },
  other:     { kc: 1.00 },
};

// ─── 4. Данные методов полива (5 методов) ─────────────────────────────────
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
    headerSubtitle: 'Smart Irrigation',

    block1Title:        'Карта вашего поля',
    block1StatusWait:   'Ожидает GPS',
    block1StatusReady:  'Координаты определены',
    block1Desc:         'Найдите поле по GPS и отметьте его углы по порядку. Площадь рассчитается автоматически.',
    mapLabel: 'Карта поля',
    mapHint: 'Нажмите на карту: минимум 3 точки. С клавиатуры: стрелки для сдвига, кнопка «Добавить центр карты» для точки.',
    btnResetContour: '🔄 Сбросить контур',
    btnUseRadius: 'Использовать радиус точки',
    btnUndoPoint: 'Убрать геопозицию',
    btnAddCenter: 'Добавить центр карты',
    radiusLabel: 'Радиус, м',
    mapAreaLabel: 'Площадь по карте · приблизительно',
    mapManual: 'Можно ввести площадь вручную в блоке 3.',
    mapIncomplete: 'Отметьте минимум 3 угла поля.',
    mapInvalid: 'Линии пересекаются или площадь равна нулю. Уберите последнюю точку.',
    mapReady: 'Площадь подставлена в блок 3. Для ручного ввода сбросьте контур.',
    mapRadiusHint: 'Нажмите на карту, чтобы переместить центр круга. Для контура нажмите «Сбросить контур».',
    mapRadiusInvalid: 'Введите радиус от 1 до 10 000 м.',
    mapUnavailable: 'Карта не загрузилась. Доступны GPS и ручной ввод площади.',
    mapTilesUnavailable: 'Подложка карты недоступна. Проверьте соединение и обновите страницу.',
    mapPoint: 'Точка на карте',
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
      rice:      { name: 'Рис',             sub: 'Күріш'            },
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

    // Два переключателя
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
      sprinkler:  { title: 'Дождевание',            desc: 'Имитация дождя через форсунки. Равномерное распределение.', badge: 'КПД 75%' },
      pivot:      { title: 'Фронтальный (Pivot)',   desc: 'Круговая дождевальная машина. Оптимален для крупных массивов.', badge: 'КПД 80%' },
      furrow:     { title: 'Арычный полив',         desc: 'Традиционный самотечный полив. Высокие потери на фильтрацию.', badge: 'КПД 50%' },
      subsurface: { title: 'Подпочвенное',          desc: 'Трубки под поверхностью почвы. Минимальное испарение, максимум эффекта.', badge: 'КПД 95%' },
    },

    summaryTitle:      'Сводка параметров',
    sumLabelCoords:    'Локация:',
    sumLabelCrop:      'Культура:',
    sumLabelArea:      'Площадь:',
    sumLabelIrrig:     'Технология:',
    sumLabelFieldType: 'Тип участка:',
    sumLabelSaline:    'Почва:',
    noCoordsYet:       'Не определены (нажмите GPS)',
    btnSubmitText:      '💧 Рассчитать норму полива (FAO-56)',
    submitHint:        'Спутниковый анализ и расчёт по формуле FAO-56 Penman-Monteith',
    summaryStatusReady:'ГОТОВО К РАСЧЁТУ',
    summaryStatusIncomplete:'ЗАПОЛНИТЕ ПАРАМЕТРЫ',

    errNoGpsSupport:    'Ваш браузер не поддерживает геолокацию.',
    errGpsDenied:       'Доступ к GPS отклонён. Разрешите геолокацию или выберите поле на карте.',
    errGpsTimeout:      'Превышено время ожидания GPS. Попробуйте ещё раз или выберите поле на карте.',
    errGpsUnknown:      'Ошибка определения локации. Попробуйте снова.',
    gpsSuccessToast:    'Координаты поля успешно зафиксированы!',
    errNeedLocation:    'Сначала определите GPS или выберите точку поля на карте.',
    errInvalidArea:     'Введите площадь поля больше 0 и менее 50 000.',
    successPayloadSent: 'Данные отправлены в бот! Расчёт по модели FAO-56...',
  },

  kz: {
    pageTitle:      'Su-Tech — Smart Irrigation',
    pageDesc:       'FAO-56 Penman-Monteith моделі негізінде суаруды басқарудың зияткерлік жүйесі',
    headerSubtitle: 'Smart Irrigation',

    block1Title:        'Алқап картасы',
    block1StatusWait:   'GPS күтілуде',
    block1StatusReady:  'Координаттар тіркелді',
    block1Desc:         'Алқапты GPS арқылы тауып, бұрыштарын ретімен белгілеңіз. Ауданы автоматты есептеледі.',
    mapLabel: 'Алқап картасы',
    mapHint: 'Картада кемінде 3 нүкте белгілеңіз. Пернетақта: жылжыту үшін бағыттауыштар, нүкте үшін «Карта ортасын қосу».',
    btnResetContour: '🔄 Контурды тазарту',
    btnUseRadius: 'Нүкте радиусын пайдалану',
    btnUndoPoint: 'Геопозицияны жою',
    btnAddCenter: 'Карта ортасын қосу',
    radiusLabel: 'Радиус, м',
    mapAreaLabel: 'Карта бойынша аудан · шамамен',
    mapManual: 'Ауданды 3-блокта қолмен енгізуге болады.',
    mapIncomplete: 'Алқаптың кемінде 3 бұрышын белгілеңіз.',
    mapInvalid: 'Сызықтар қиылысады немесе аудан нөлге тең. Соңғы нүктені жойыңыз.',
    mapReady: 'Аудан 3-блокқа енгізілді. Қолмен енгізу үшін контурды тазалаңыз.',
    mapRadiusHint: 'Шеңбер ортасын жылжыту үшін картаны басыңыз. Контур үшін «Контурды тазарту» түймесін басыңыз.',
    mapRadiusInvalid: '1–10 000 м аралығындағы радиусты енгізіңіз.',
    mapUnavailable: 'Карта жүктелмеді. GPS пен ауданды қолмен енгізу қолжетімді.',
    mapTilesUnavailable: 'Карта қабаты қолжетімсіз. Байланысты тексеріп, бетті жаңартыңыз.',
    mapPoint: 'Картадағы нүкте',
    btnLocationText:    'GPS координаттарын анықтау',
    btnLocationLoading: 'Спутниктер іздеу...',
    gpsSearching:       'Нақты спутниктік координаттар анықталуда...',
    coordsCardTitle:    'Координаттар тіркелді',
    labelLat:           'Ендік (Lat):',
    labelLon:           'Бойлық (Lon):',

    block2Title:  'Ауыл шаруашылығы дақылы',
    block2Desc:   'Биологиялық транспирация коэффициентін (Kc) ескеру үшін дақылды таңдаңыз.',
    crops: {
      wheat:     { name: 'Бидай',           sub: 'Пшеница' },
      cotton:    { name: 'Мақта',           sub: 'Хлопок' },
      corn:      { name: 'Жүгері',          sub: 'Кукуруза' },
      rice:      { name: 'Күріш',           sub: 'Рис' },
      alfalfa:   { name: 'Жоңышқа',         sub: 'Люцерна' },
      melon:     { name: 'Бақша',           sub: 'Бахча' },
      tomato:    { name: 'Қызанақ',         sub: 'Томаты' },
      potato:    { name: 'Картоп',          sub: 'Картофель' },
      other:     { name: 'Басқа дақыл',     sub: 'Другая культура' },
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

    // Екі қосқыш
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
      drip:       { title: 'Тамшылатып',          desc: 'Тамыр аймағына дәл жеткізу. Суды 40–50% үнемдеу.', badge: 'ПӘК 90%' },
      sprinkler:  { title: 'Жаңбырлатып',         desc: 'Форсунка арқылы жаңбыр имитациясы. Біркелкі таралу.', badge: 'ПӘК 75%' },
      pivot:      { title: 'Фронталды (Pivot)',   desc: 'Айналмалы жаңбырлату машинасы. Ірі алқаптар үшін оңтайлы.', badge: 'ПӘК 80%' },
      furrow:     { title: 'Арықпен',             desc: 'Дәстүрлі өздігінен ағатын суару. Сүзілуге жоғары шығын.', badge: 'ПӘК 50%' },
      subsurface: { title: 'Топырақішілік',       desc: 'Топырақ асты түтіктері. Минималды булану, максималды нәтиже.', badge: 'ПӘК 95%' },
    },

    summaryTitle:      'Параметрлер қорытындысы',
    sumLabelCoords:    'Орналасуы:',
    sumLabelCrop:      'Дақыл:',
    sumLabelArea:      'Ауданы:',
    sumLabelIrrig:     'Технология:',
    sumLabelFieldType: 'Алқап түрі:',
    sumLabelSaline:    'Топырақ:',
    noCoordsYet:       'Анықталмаған (GPS басыңыз)',
    btnSubmitText:      '💧 Суару нормасын есептеу',
    submitHint:        'Спутниктік талдау және FAO-56 Penman-Monteith формуласымен есептеу',
    summaryStatusReady:'ЕСЕПТЕУГЕ ДАЙЫН',
    summaryStatusIncomplete:'ПАРАМЕТРЛЕРДІ ТОЛТЫРЫҢЫЗ',

    errNoGpsSupport:    'Құрылғыңыз немесе браузер геолокацияны қолдамайды.',
    errGpsDenied:       'GPS рұқсаты берілмеді. Геолокацияны қосыңыз немесе картадан алқапты таңдаңыз.',
    errGpsTimeout:      'GPS күту уақыты өтіп кетті. Қайталап көріңіз немесе картадан алқапты таңдаңыз.',
    errGpsUnknown:      'Орналасқан жерді анықтау қатесі. Қайталап көріңіз.',
    gpsSuccessToast:    'Алқап координаттары сәтті тіркелді!',
    errNeedLocation:    'Алдымен GPS арқылы немесе картадан алқап нүктесін таңдаңыз.',
    errInvalidArea:     '0-ден үлкен және 50 000-нан кем алқап ауданын енгізіңіз.',
    successPayloadSent: 'Деректер ботқа жіберілді! FAO-56 моделі бойынша есептеу жүргізілуде...',
  },
};

const UI_COPY = {
  ru: {
    navMap: 'Карта поля', navSettings: 'Параметры', navCalculation: 'Расчет',
    workspaceLabel: 'ВАШЕ ПОЛЕ. ВАШИ РЕШЕНИЯ.', pageHeading: 'Каждая капля — по делу.',
    pageIntro: 'Очертите поле. Выберите культуру. Узнайте, сколько воды нужно сегодня.',
    methodNote: 'Расчет на основе погоды и потребности культуры', mapEyebrow: '01 / ГРАНИЦЫ УЧАСТКА',
    satellite: 'Спутник', streets: 'Схема', mapDrawLabel: 'Нажмите, чтобы добавить угол поля',
    mapErrorTitle: 'Не удалось загрузить карту', mapErrorBody: 'Проверьте соединение и повторите загрузку. Площадь можно ввести вручную.',
    retryMap: 'Повторить загрузку', noteTitle: 'Точность начинается с границ',
    noteBody: 'Отмечайте углы по порядку. Минимум три точки — и площадь автоматически появится в расчете. Спутниковая подложка поможет найти границы.',
    summaryEyebrow: 'ГОТОВЫ К СЛЕДУЮЩЕМУ ШАГУ?', footerNote: 'Вода с заботой о будущем.',
  },
  kz: {
    navMap: 'Алқап картасы', navSettings: 'Параметрлер', navCalculation: 'Есептеу',
    workspaceLabel: 'СІЗДІҢ АЛҚАП. СІЗДІҢ ШЕШІМ.', pageHeading: 'Әр тамшы — өз орнымен.',
    pageIntro: 'Алқапты белгілеңіз. Дақылды таңдаңыз. Бүгін қанша су қажет екенін біліңіз.',
    methodNote: 'Ауа райы мен дақыл қажеттілігіне негізделген есеп', mapEyebrow: '01 / АЛҚАП ШЕКАРАСЫ',
    satellite: 'Спутник', streets: 'Сызба', mapDrawLabel: 'Алқап бұрышын қосу үшін басыңыз',
    mapErrorTitle: 'Картаны жүктеу мүмкін болмады', mapErrorBody: 'Байланысты тексеріп, қайта жүктеңіз. Ауданды қолмен енгізуге болады.',
    retryMap: 'Қайта жүктеу', noteTitle: 'Дәлдік шекарадан басталады',
    noteBody: 'Бұрыштарды ретімен белгілеңіз. Кемінде үш нүкте — аудан есепке автоматты енгізіледі. Спутниктік карта шекараны табуға көмектеседі.',
    summaryEyebrow: 'КЕЛЕСІ ҚАДАМҒА ДАЙЫНСЫЗ БА?', footerNote: 'Болашаққа қамқорлықпен суару.',
  },
};
Object.assign(I18N.ru, {
  block1Title: 'Ваше поле на карте', block1Desc: 'Найдите участок и обозначьте его границы.',
  block1StatusWait: 'Выберите поле', block1StatusReady: 'Участок выбран',
  btnLocationText: 'Моя геопозиция', btnResetContour: 'Сбросить контур', btnUndoPoint: 'Убрать геопозицию', btnAddCenter: 'Точка в центре', btnUseRadius: 'По радиусу', mapAreaLabel: 'Площадь',
  mapHint: 'Минимум 3 точки по границе.',
  mapAreaLabel: 'Площадь', mapReady: 'Добавлено в расчет. Для ручного ввода сбросьте контур.',
  mapRadiusHint: 'Нажмите на карту, чтобы переместить круг. Измените радиус ниже.',
  block2Title: 'Что выращиваете?', block2Desc: 'Каждой культуре — своя норма воды.',
  block3Title: 'Условия на участке', block4Title: 'Как поливаете?', block4Desc: 'Учтем эффективность вашей системы.',
  fieldText_open: 'Открытое поле', fieldText_greenhouse: 'Теплица', salineText_yes: 'Солончак',
  summaryTitle: 'Ваш расчет полива', btnSubmitText: 'Рассчитать полив',
  submitHint: 'Метеоданные и расчет FAO–56 придут коротким отчетом в Telegram.',
  noCoordsYet: 'Выберите поле на карте',
});
Object.assign(I18N.kz, {
  block1Title: 'Картадағы алқабыңыз', block1Desc: 'Алқапты тауып, шекарасын белгілеңіз.',
  block1StatusWait: 'Алқапты таңдаңыз', block1StatusReady: 'Алқап таңдалды',
  btnLocationText: 'Менің орным', btnResetContour: 'Контурды тазарту', btnUndoPoint: 'Геопозицияны жою', btnAddCenter: 'Ортадағы нүкте', btnUseRadius: 'Радиус бойынша', mapAreaLabel: 'Аудан',
  mapHint: 'Шекарада кемінде 3 нүкте.',
  mapAreaLabel: 'Аудан', mapReady: 'Есепке енгізілді. Қолмен енгізу үшін контурды тазалаңыз.',
  mapRadiusHint: 'Шеңберді жылжыту үшін картаны басыңыз. Радиусты төменде өзгертіңіз.',
  block2Title: 'Не өсіресіз?', block2Desc: 'Әр дақылға — өз су мөлшері.',
  block3Title: 'Алқап жағдайы', block4Title: 'Қалай суарасыз?', block4Desc: 'Жүйеңіздің тиімділігін ескереміз.',
  fieldText_open: 'Ашық алқап', fieldText_greenhouse: 'Жылыжай', salineText_yes: 'Сортаң',
  summaryTitle: 'Суару есебіңіз', btnSubmitText: 'Суаруды есептеу',
  submitHint: 'Ауа райы мен FAO–56 есебі Telegram-ға қысқа хабарламамен келеді.',
  noCoordsYet: 'Картадан алқапты таңдаңыз',
});

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
  document.querySelectorAll('[data-copy]').forEach(el => {
    el.textContent = UI_COPY[lang]?.[el.dataset.copy] || UI_COPY.ru[el.dataset.copy] || '';
  });

  document.getElementById('htmlRoot').setAttribute('lang', lang);
  document.title = t.pageTitle;
  document.getElementById('pageDesc').setAttribute('content', t.pageDesc);
  document.getElementById('headerSubtitle').textContent = t.headerSubtitle;

  // Lang buttons — Su-Tech active style
  _setLangBtn('langBtnKz', lang === 'kz');
  _setLangBtn('langBtnRu', lang === 'ru');

  // Block 1 — GPS
  document.getElementById('block1Title').textContent = t.block1Title;
  const block1Desc = document.getElementById('block1Desc');
  if (block1Desc) block1Desc.textContent = t.block1Desc;
  document.getElementById('btnLocationText').textContent =
    state.isRequestingGps ? t.btnLocationLoading : t.btnLocationText;
  document.getElementById('coordsCardTitle').textContent = t.coordsCardTitle;
  document.getElementById('labelLat').textContent    = t.labelLat;
  document.getElementById('labelLon').textContent    = t.labelLon;
  updateBlock1StatusPill();
  updateMapUI();
  renderCoordinates();

  // Block 2 — Crop
  document.getElementById('block2Title').textContent = t.block2Title;
  document.getElementById('block2Desc').textContent  = t.block2Desc;
  for (const cropKey of Object.keys(CROPS)) {
    const el = document.getElementById(`cropName_${cropKey}`);
    const sub = document.getElementById(`cropSub_${cropKey}`);
    if (el) el.textContent = t.crops[cropKey]?.name ?? cropKey;
    if (sub) {
      const subText = t.crops[cropKey]?.sub ?? '';
      sub.textContent = subText;
      sub.style.display = subText ? 'block' : 'none';
    }
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
  const summaryStatusBadge = document.getElementById('summaryStatusBadge');
  if (summaryStatusBadge) summaryStatusBadge.textContent = t.summaryStatusReady;
}

function updateBlock1StatusPill() {
  const t    = I18N[state.lang] || I18N.ru;
  const pill = document.getElementById('block1StatusPill');
  if (!pill) return;

  const baseClasses = 'text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full whitespace-nowrap';
  if (state.latitude !== null && state.longitude !== null) {
    pill.className = `${baseClasses} bg-[#247C9C]/10 text-[#1C6079]`;
    pill.textContent = t.block1StatusReady;
  } else {
    pill.className = `${baseClasses} bg-amber-100 text-amber-800`;
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
  btn.classList.add('opacity-80');
  btnText.textContent = t.btnLocationLoading;
  statusBlk.classList.remove('hidden');
  statusBlk.classList.add('flex');
  statusTxt.textContent = t.gpsSearching;

  triggerHaptic('light');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.isRequestingGps = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('opacity-80');
      btnText.textContent = t.btnLocationText;
      statusBlk.classList.add('hidden');
      statusBlk.classList.remove('flex');

      const location = [position.coords.latitude, position.coords.longitude];
      // GPS locates the farmer; an already drawn field keeps its own location.
      if (fieldMode === 'manual') {
        state.latitude = location[0];
        state.longitude = location[1];
        state.accuracy = Math.round(position.coords.accuracy);
      }
      if (fieldMap) {
        if (gpsMarker) gpsMarker.setLatLng(location);
        else gpsMarker = L.marker(location).addTo(fieldMap);
        fieldMap.flyTo(location, 17, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
      }

      renderCoordinates();
      updateBlock1StatusPill();
      updateSummaryCard();
      updateMapUI();
      showToast(t.gpsSuccessToast, 'success');
      triggerHaptic('success');
    },
    (error) => {
      state.isRequestingGps = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('opacity-80');
      btnText.textContent = t.btnLocationText;
      statusBlk.classList.add('hidden');
      statusBlk.classList.remove('flex');

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
  card.classList.remove('hidden');
  card.classList.add('flex');

  document.getElementById('displayLat').textContent   = `${state.latitude.toFixed(6)}°`;
  document.getElementById('displayLon').textContent   = `${state.longitude.toFixed(6)}°`;
  document.getElementById('coordsAccuracy').textContent = Number.isFinite(state.accuracy)
    ? `±${state.accuracy} м` : I18N[state.lang].mapPoint;
}

// Project WGS84 coordinates to a local tangent plane in metres before Shoelace.
// Field-scale approximation, not a cadastral survey; never use screen pixels or degrees.
function projectFieldPoints(points) {
  if (!points.length) return [];
  const rad = Math.PI / 180;
  const latitude = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const phi = latitude * rad;
  const e2 = 0.00669437999014;
  const d = 1 - e2 * Math.sin(phi) ** 2;
  const northScale = 6378137 * (1 - e2) / d ** 1.5;
  const eastScale = 6378137 / Math.sqrt(d) * Math.cos(phi);
  return points.map(p => ({
    x: (((p.lng - points[0].lng + 540) % 360) - 180) * rad * eastScale,
    y: (p.lat - latitude) * rad * northScale,
  }));
}

function calculatePolygonArea(points) {
  const xy = projectFieldPoints(points);
  return Math.abs(xy.reduce((sum, p, i) => {
    const q = xy[(i + 1) % xy.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0)) / 2;
}

function isSimpleFieldPolygon(points) {
  if (points.length < 3) return false;
  const xy = projectFieldPoints(points);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) < 1e-7
    && p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7
    && p.y >= Math.min(a.y, b.y) - 1e-7 && p.y <= Math.max(a.y, b.y) + 1e-7;
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i], b = xy[(i + 1) % xy.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.01) return false;
    for (let j = i + 1; j < xy.length; j++) {
      if (j === i + 1 || (i === 0 && j === xy.length - 1)) continue;
      const c = xy[j], d = xy[(j + 1) % xy.length];
      if ((cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0)
        || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) return false;
    }
  }
  return calculatePolygonArea(points) > 0.01;
}

function initFieldMap() {
  if (fieldMap) { fieldMap.invalidateSize(); return; }
  if (!window.L) { mapTilesFailed = true; updateMapUI(); return; }
  fieldMap = L.map('map', { doubleClickZoom: false, zoomControl: false }).setView([44.85, 65.5], 12);
  L.control.zoom({ position: 'topright' }).addTo(fieldMap);
  fieldLayers = L.layerGroup().addTo(fieldMap);
  fieldMap.on('click', event => addFieldPoint(event.latlng));
  loadMapTiles(0);
  // Telegram expands its viewport after startup. Re-measure actual container size.
  const resizeMap = () => fieldMap.invalidateSize({ pan: false });
  if (window.ResizeObserver) {
    mapResizeObserver = new window.ResizeObserver(resizeMap);
    mapResizeObserver.observe(document.getElementById('map'));
  }
  window.addEventListener('pageshow', resizeMap);
  requestAnimationFrame(resizeMap);
  updateMapUI();
}

function loadMapTiles(attempt = 0) {
  clearTimeout(tileWatchdog);
  if (!fieldMap) return;
  tileAttempt = attempt;
  if (activeTileLayer) fieldMap.removeLayer(activeTileLayer);
  activeTileLayer = null;
  const imagery = {
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, GIS User Community',
  };
  // Use Esri's hosted street layer for the default schematic map. The public
  // OSM tile endpoint can return a policy 403 in Telegram WebViews, leaving a
  // grey "Access blocked" tile in place, so it is intentionally not used.
  const streets = {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, HERE, Garmin, FAO, NOAA, USGS',
  };
  const sources = mapBasemap === 'streets' ? [streets, imagery] : [imagery, streets];
  if (attempt >= sources.length) {
    mapTilesFailed = true;
    updateMapUI();
    return;
  }
  mapTilesFailed = false;
  const source = sources[attempt];
  const layer = L.tileLayer(source.url, { maxZoom: 19, attribution: source.attribution });
  activeTileLayer = layer;
  let receivedTile = false;
  const fail = () => {
    if (activeTileLayer !== layer) return;
    loadMapTiles(attempt + 1);
  };
  layer.on('tileerror', fail);
  layer.on('tileload', () => {
    if (activeTileLayer !== layer) return;
    receivedTile = true;
    clearTimeout(tileWatchdog);
    mapTilesFailed = false;
    updateMapUI();
  });
  // Handle requests that stall without producing a tileerror event.
  tileWatchdog = setTimeout(() => { if (!receivedTile) fail(); }, 12000);
  layer.addTo(fieldMap);
  updateMapUI();
}

function setMapBasemap(style) {
  if (!['satellite', 'streets'].includes(style)) return;
  mapBasemap = style;
  loadMapTiles(0);
}

function retryFieldMap() {
  if (!window.L) { window.location.reload(); return; }
  if (!fieldMap) initFieldMap();
  else { fieldMap.invalidateSize({ pan: false }); loadMapTiles(0); }
}

function selectFieldLocation(point) {
  state.latitude = point.lat;
  state.longitude = ((point.lng + 540) % 360) - 180;
  state.accuracy = null;
  renderCoordinates();
  updateBlock1StatusPill();
}

function addFieldPoint(point) {
  if (Math.abs(point.lat) >= 85) return;
  point = { lat: point.lat, lng: ((point.lng + 540) % 360) - 180 };
  if (fieldMode === 'radius') {
    radiusCenter = point;
    selectFieldLocation(point);
    updatePointRadius();
    return;
  }
  if (fieldPoints.some(p => Math.abs(p.lat - point.lat) < 1e-8 && Math.abs(p.lng - point.lng) < 1e-8)) return;
  fieldMode = 'polygon';
  fieldPoints.push(point);
  selectFieldLocation(fieldPoints[0]);
  renderFieldContour();
}

function addMapCenter() {
  if (fieldMap) addFieldPoint(fieldMap.getCenter());
}

function setMappedArea(areaM2) {
  mappedAreaM2 = areaM2;
  currentArea = areaM2 / (currentUnit === 'hectare' ? 10000 : 100);
  state.area = window.currentArea = currentArea;
  document.getElementById('fieldAreaInput').value = Number(currentArea.toFixed(6));
  recalculateAreaEquivalent();
  updateSummaryCard();
  updateMapUI();
}

function renderFieldContour() {
  fieldLayers?.clearLayers();
  const valid = isSimpleFieldPolygon(fieldPoints);
  const color = valid || fieldPoints.length < 3 ? '#247C9C' : '#b91c1c';
  if (fieldLayers) {
    if (fieldPoints.length >= 3) L.polygon(fieldPoints, { color, fillColor: '#247C9C', fillOpacity: valid ? 0.25 : 0.06, weight: 3, interactive: false }).addTo(fieldLayers);
    else if (fieldPoints.length === 2) L.polyline(fieldPoints, { color, weight: 3, interactive: false }).addTo(fieldLayers);
    fieldPoints.forEach(p => L.circleMarker(p, { radius: 5, color, fillColor: '#fff', fillOpacity: 1, weight: 2, interactive: false }).addTo(fieldLayers));
  }
  setMappedArea(valid ? calculatePolygonArea(fieldPoints) : 0);
}

function undoFieldPoint() {
  if (fieldMode !== 'polygon') return;
  fieldPoints.pop();
  if (!fieldPoints.length) resetFieldContour();
  else renderFieldContour();
}

// Remove the current GPS location marker without touching a drawn field.
// When the map has no contour, also clear the coordinates used by the report.
function clearCurrentLocation() {
  if (gpsMarker && fieldMap) {
    fieldMap.removeLayer(gpsMarker);
    gpsMarker = null;
  }

  if (fieldPoints.length) {
    selectFieldLocation(fieldPoints[0]);
  } else if (fieldMode === 'radius' && radiusCenter) {
    selectFieldLocation(radiusCenter);
  } else {
    state.latitude = null;
    state.longitude = null;
    state.accuracy = null;
    const card = document.getElementById('coordsCard');
    card?.classList.add('hidden');
    card?.classList.remove('flex');
  }

  updateBlock1StatusPill();
  updateSummaryCard();
  updateMapUI();
  triggerHaptic('light');
}

function resetFieldContour() {
  fieldPoints = [];
  fieldMode = 'manual';
  radiusCenter = null;
  fieldLayers?.clearLayers();
  setMappedArea(0);
}

function usePointRadius() {
  if (!fieldMap) return;
  if (state.latitude === null || state.longitude === null) {
    showToast(I18N[state.lang].errNeedLocation, 'warning');
    return;
  }
  fieldMode = 'radius';
  fieldPoints = [];
  radiusCenter = { lat: state.latitude, lng: state.longitude };
  updatePointRadius();
}

function updatePointRadius() {
  if (fieldMode !== 'radius') return;
  fieldLayers?.clearLayers();
  const radius = Number(document.getElementById('fieldRadiusInput').value);
  const valid = Number.isFinite(radius) && radius >= 1 && radius <= 10000;
  document.getElementById('fieldRadiusInput').setAttribute('aria-invalid', String(!valid));
  if (valid && fieldLayers) {
    L.circle(radiusCenter, { radius, color: '#247C9C', fillColor: '#247C9C', fillOpacity: 0.25, weight: 3, interactive: false }).addTo(fieldLayers);
    L.circleMarker(radiusCenter, { radius: 4, color: '#1C6079', interactive: false }).addTo(fieldLayers);
  }
  setMappedArea(valid ? Math.PI * radius ** 2 : 0);
}

function updateMapUI() {
  const t = I18N[state.lang];
  document.getElementById('mapError')?.classList.toggle('hidden', !mapTilesFailed && !!window.L);
  const displayedStyle = tileAttempt === 1 ? (mapBasemap === 'satellite' ? 'streets' : 'satellite') : mapBasemap;
  document.getElementById('btnSatellite')?.setAttribute('aria-pressed', String(displayedStyle === 'satellite'));
  document.getElementById('btnStreets')?.setAttribute('aria-pressed', String(displayedStyle === 'streets'));
  for (const id of ['btnResetContour', 'btnUseRadius', 'btnUndoPoint', 'btnAddCenter', 'radiusLabel', 'mapAreaLabel']) {
    document.getElementById(id).textContent = t[id];
  }
  document.getElementById('map').setAttribute('aria-label', t.mapLabel);
  document.getElementById('mapHint').textContent = !window.L ? t.mapUnavailable : mapTilesFailed ? t.mapTilesUnavailable : fieldMode === 'radius' ? t.mapRadiusHint : t.mapHint;
  document.getElementById('btnUseRadius').disabled = !window.L;
  document.getElementById('btnAddCenter').disabled = !window.L;
  const hasCurrentLocation = !!gpsMarker || (fieldMode === 'manual' && state.latitude !== null && state.longitude !== null);
  document.getElementById('btnUndoPoint').disabled = !hasCurrentLocation;
  document.getElementById('btnUseRadius').setAttribute('aria-pressed', String(fieldMode === 'radius'));
  document.getElementById('radiusControls').classList.toggle('hidden', fieldMode !== 'radius');
  document.getElementById('fieldAreaInput').readOnly = fieldMode !== 'manual';
  document.querySelectorAll('[onclick^="setPresetArea"]').forEach(btn => { btn.disabled = fieldMode !== 'manual'; });
  const fmt = value => value.toLocaleString(state.lang === 'kz' ? 'kk-KZ' : 'ru-RU', { maximumFractionDigits: 4 });
  document.getElementById('mapAreaValue').textContent = mappedAreaM2 > 0
    ? `${fmt(mappedAreaM2 / 10000)} ${t.unitSuffix_hectare} · ${fmt(mappedAreaM2 / 100)} ${t.unitSuffix_sotka}` : '—';
  const mapStatus = fieldMode === 'manual' || mappedAreaM2 > 0 ? ''
    : currentArea >= 50000 ? t.errInvalidArea : fieldMode === 'radius' ? t.mapRadiusInvalid
      : fieldPoints.length < 3 ? t.mapIncomplete : t.mapInvalid;
  document.getElementById('mapAreaStatus').textContent = mapStatus;
}

// ─── 8. Выбор культуры (Блок 2 — 9 культур) ──────────────────────────────
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
    const check = card.querySelector('.crop-check');

    if (isSelected) {
      card.className = 'crop-card card-selected';
      card.setAttribute('aria-checked', 'true');
      if (check) {
        check.classList.remove('hidden');
        check.classList.add('flex');
      }
    } else {
      card.className = 'crop-card';
      card.setAttribute('aria-checked', 'false');
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
  if (unit !== 'hectare' && unit !== 'sotka') return;
  const areaM2 = fieldMode === 'manual' ? state.area * (currentUnit === 'hectare' ? 10000 : 100) : mappedAreaM2;
  currentUnit = unit;
  window.currentUnit = unit;
  state.area_unit = unit;
  currentArea = areaM2 / (unit === 'hectare' ? 10000 : 100);
  state.area = window.currentArea = currentArea;
  document.getElementById('fieldAreaInput').value = Number(currentArea.toFixed(6));
  updateAreaUnitUI();
  updateSummaryCard();
  updateMapUI();
  triggerHaptic('light');
}

function updateAreaUnitUI() {
  const t      = I18N[state.lang] || I18N.ru;
  const isHect = state.area_unit === 'hectare';

  const btnSotka   = document.getElementById('unitBtn_sotka');
  const btnHectare = document.getElementById('unitBtn_hectare');
  const activeClass = 'segment-button';
  const inactiveClass = 'segment-button';

  if (btnSotka)   btnSotka.className   = isHect ? inactiveClass : activeClass;
  if (btnHectare) btnHectare.className = isHect ? activeClass   : inactiveClass;
  btnSotka?.setAttribute('aria-pressed',   String(!isHect));
  btnHectare?.setAttribute('aria-pressed', String(isHect));

  const badge = document.getElementById('currentAreaUnitBadge');
  if (badge) {
    badge.textContent = isHect ? t.unitBadge_hectare : t.unitBadge_sotka;
    badge.className = 'text-[10px] px-2.5 py-0.5 rounded-full bg-[#247C9C]/10 text-[#1C6079] font-bold whitespace-nowrap';
  }
  document.getElementById('inputUnitSuffix').textContent =
    isHect ? t.unitSuffix_hectare : t.unitSuffix_sotka;

  recalculateAreaEquivalent();
}

function handleAreaChange(val) {
  if (fieldMode !== 'manual') return;
  const num = parseFloat(val);
  currentArea = (!isNaN(num) && num > 0) ? num : 0;
  window.currentArea = currentArea;
  state.area = currentArea;
  recalculateAreaEquivalent();
  updateSummaryCard();
}

function setPresetArea(val) {
  if (fieldMode !== 'manual') return;
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
  const sotka = Number((isHect ? state.area * 100 : state.area).toFixed(4));

  if (el) el.textContent = t.equivFormat(m2, sotka);
}

// ─── 10. Выбор метода полива (Блок 4 — 5 методов) ────────────────────────
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
    const check = card.querySelector('.irrig-check, span.absolute');

    if (isSelected) {
      card.className = 'irrig-card card-selected';
      card.setAttribute('aria-checked', 'true');
      if (check) {
        check.classList.remove('hidden');
        check.classList.add('flex');
      }
    } else {
      card.className = 'irrig-card';
      card.setAttribute('aria-checked', 'false');
      if (check) {
        check.classList.add('hidden');
        check.classList.remove('flex');
      }
    }
  }

  updateSummaryCard();
  triggerHaptic('light');
}

// ─── 9.1 Переключатели: Тип участка и Засоленность ────────────────────────
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
  const activeClass = 'segment-button';
  const inactiveClass = 'segment-button';

  if (btnOpen) btnOpen.className = isOpen ? activeClass : inactiveClass;
  if (btnGh)   btnGh.className   = isOpen ? inactiveClass : activeClass;
  btnOpen?.setAttribute('aria-pressed', String(isOpen));
  btnGh?.setAttribute('aria-pressed', String(!isOpen));

  const badge = document.getElementById('fieldTypeBadge');
  if (badge) {
    badge.textContent = isOpen ? t.fieldTypeBadge_open : t.fieldTypeBadge_greenhouse;
    badge.className = isOpen ?
      'text-[10px] px-2.5 py-0.5 rounded-full bg-[#247C9C]/10 text-[#1C6079] font-bold' :
      'text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold';
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
  const activeClass = 'segment-button';
  const inactiveClass = 'segment-button';

  if (btnNo)  btnNo.className  = isNormal ? activeClass : inactiveClass;
  if (btnYes) btnYes.className = isNormal ? inactiveClass : activeClass;
  btnNo?.setAttribute('aria-pressed', String(isNormal));
  btnYes?.setAttribute('aria-pressed', String(!isNormal));

  const badge = document.getElementById('salinityBadge');
  if (badge) {
    badge.textContent = isNormal ? t.salineBadge_no : t.salineBadge_yes;
    badge.className = isNormal ?
      'text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold' :
      'text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold';
  }
}

// ─── 11. Сводная карточка ─────────────────────────────────────────────────
function updateSummaryCard() {
  const t = I18N[state.lang] || I18N.ru;

  // GPS coords
  const coordsVal = document.getElementById('sumValCoords');
  if (state.latitude !== null && state.longitude !== null) {
    coordsVal.textContent = `${state.latitude.toFixed(4)}°, ${state.longitude.toFixed(4)}°`;
    coordsVal.className = 'text-xs font-semibold text-[#247C9C]';
  } else {
    coordsVal.textContent = t.noCoordsYet;
    coordsVal.className = 'text-xs font-semibold text-amber-600';
  }

  // Crop (no empty brackets in KZ)
  const cropInfo = t.crops[state.crop] || { name: state.crop, sub: '' };
  document.getElementById('sumValCrop').textContent =
    cropInfo.sub ? `${cropInfo.name} (${cropInfo.sub})` : cropInfo.name;

  // Area
  const unitLabel = state.area_unit === 'hectare' ?
    t.unitBadge_hectare : t.unitBadge_sotka;
  document.getElementById('sumValArea').textContent =
    `${state.area.toLocaleString(state.lang === 'kz' ? 'kk-KZ' : 'ru-RU', { maximumFractionDigits: 6 })} ${unitLabel}`;

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

  // Dynamic Ready Badge: 'ЕСЕПТЕУГЕ ДАЙЫН' / 'ГОТОВО К РАСЧЁТУ'
  const summaryStatusBadge = document.getElementById('summaryStatusBadge');
  if (summaryStatusBadge) {
    const ready = state.latitude !== null && state.longitude !== null && state.area > 0 && state.area < 50000;
    summaryStatusBadge.textContent = ready ? t.summaryStatusReady : t.summaryStatusIncomplete;
    summaryStatusBadge.className = 'text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full '
      + (ready ? 'bg-[#247C9C]/10 text-[#1C6079]' : 'bg-slate-100 text-slate-600');
  }
}

// ─── 12. Финальная отправка ───────────────────────────────────────────────
function submitFinalCalculation() {
  if (isSubmitting) return;
  const t = I18N[state.lang] || I18N.ru;

  // 1. Проверка координат
  if (state.latitude === null || state.longitude === null) {
    showToast(t.errNeedLocation, 'warning');
    document.getElementById('block1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 2. ДИНАМИЧЕСКИЙ сбор данных с экрана (Real-time State Inspection)

  // Культура (crop)
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

  // Площадь (area)
  const areaInput = document.getElementById('fieldAreaInput');
  currentArea = fieldMode === 'manual' ? Number(areaInput?.value)
    : mappedAreaM2 / (currentUnit === 'hectare' ? 10000 : 100);
  state.area = currentArea;
  window.currentArea = currentArea;

  // Валидация площади: > 0 и < 50 000
  if (!Number.isFinite(currentArea) || currentArea <= 0 || currentArea >= 50000) {
    showToast(t.errInvalidArea, 'warning');
    document.getElementById('block3')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Единица площади (area_unit)
  const isHectActive = document.getElementById('unitBtn_hectare')?.getAttribute('aria-pressed') === 'true';
  currentUnit = isHectActive ? 'hectare' : (state.area_unit || 'hectare');
  state.area_unit = currentUnit;
  window.currentUnit = currentUnit;

  // Метод полива (irrigation_type)
  const activeIrrigCard = document.querySelector('.irrig-card.card-selected, .irrig-card.active, .irrig-card.is-selected, [id^="irrigCard_"][aria-checked="true"]');
  if (activeIrrigCard) {
    currentIrrigation = activeIrrigCard.id.replace('irrigCard_', '');
  } else if (!currentIrrigation) {
    currentIrrigation = state.irrigation_type || 'drip';
  }
  state.irrigation_type = currentIrrigation;
  window.currentIrrigation = currentIrrigation;

  // Тип участка (field_type)
  const activeFieldBtn = document.querySelector('[data-field][aria-pressed="true"]');
  if (activeFieldBtn && activeFieldBtn.dataset.field) {
    currentFieldType = activeFieldBtn.dataset.field;
  } else {
    currentFieldType = state.field_type || 'open';
  }
  state.field_type = currentFieldType;
  window.currentFieldType = currentFieldType;

  // Засоленность (is_saline)
  const activeSalineBtn = document.querySelector('[data-saline][aria-pressed="true"]');
  if (activeSalineBtn && activeSalineBtn.dataset.saline) {
    currentSaline = activeSalineBtn.dataset.saline;
  } else {
    currentSaline = state.is_saline || 'no';
  }
  state.is_saline = currentSaline;
  window.currentSaline = currentSaline;

  // Собираем динамический payload:
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

  isSubmitting = true;
  const btn = document.getElementById('btnSubmitAll');
  if (btn) {
    btn.disabled = true;
    btn.style.transform = 'scale(0.97)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
  }

  setTimeout(() => {
    try { tg.sendData(payloadString); } catch (err) { console.error('[Su-Tech] sendData error:', err); }
    try { tg.close(); } catch (_) {}
    
    setTimeout(() => {
      isSubmitting = false;
      if (btn) btn.disabled = false;
    }, 1000);
  }, 420);
}

// ─── 13. Toast-уведомления ───────────────────────────────────────────────
let _toastTimer = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;

  clearTimeout(_toastTimer);

  const baseClass = 'toast';
  const typeClasses = {
    success: 'bg-[#F5F3EF] text-[#1C6079] border-[#247C9C]/40 shadow-[#247C9C]/10',
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
    error:   'bg-red-50 text-red-800 border-red-300',
    info:    'bg-slate-50 text-slate-800 border-slate-300',
  };
  toast.className = `${baseClass} toast-${type} toast-enter`;
  toast.textContent = message;
  toast.style.display = 'block';

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
function _setLangBtn(id, isActive) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('aria-pressed', String(isActive));
  if (isActive) {
    el.className = 'h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer bg-[#247C9C] text-white border-none shadow-sm transition-all duration-150';
  } else {
    el.className = 'h-8 px-3 rounded-xl text-xs font-semibold cursor-pointer text-slate-600 bg-transparent border-none transition-all duration-150 hover:text-slate-900';
  }
}

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
  connectTelegram();
  isSubmitting = false;
  const btn = document.getElementById('btnSubmitAll') || document.querySelector('button[type="submit"]');
  if (btn) btn.disabled = false;

  initLanguage();
  initFieldMap();
  recalculateAreaEquivalent();
  updateFieldTypeUI();
  updateSalinityUI();
  updateSummaryCard();
  addKeyboardCardSupport();


  // Pre-select default state UI
  selectCrop(state.crop);
  selectIrrigation(state.irrigation_type);
  setAreaUnit(state.area_unit);

  if (window.lucide) {
    lucide.createIcons();
  }
});
