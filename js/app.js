/**
 * Su-Tech — Интеллектуальная система точного земледелия (Telegram WebApp)
 * Расчёт норм полива по модели FAO-56 Penman-Monteith
 * Design System: Su-Tech / deep blue, bright blue and clear white
 * Palette: blue #087FE0, ink #112448, canvas #F3F7FD
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
    tg.onEvent?.('viewportChanged', () => {
      fieldMap?.invalidateSize({ pan: false });
      positionLanguageIndicator(state.lang);
    });
  } catch (err) {
    console.warn('[Su-Tech] Telegram initialization:', err);
  }
}
window.addEventListener('telegram-ready', connectTelegram);

// ─── 2. Состояние приложения ───────────────────────────────────────────────
let currentCrop = 'cotton';
let selectedCrop = currentCrop; // Псевдоним для совместимости
let currentArea = 0;
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
let mapBasemap = 'satellite';
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
  locationSource:   null,
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
  pivot:      0.75,
  furrow:     0.50,
  subsurface: 0.90,
};

// ─── 5. Словарь локализации (i18n: KZ / RU) ──────────────────────────────
const I18N = {
  ru: {
    pageTitle:      'Su-Tech — Smart Irrigation',
    pageDesc:       'Интеллектуальная система управления орошением на базе модели FAO-56 Penman-Monteith',
    headerSubtitle: 'Smart Irrigation',
    heroTitleTop: 'Точный полив.',
    heroTitleAccent: 'Живое поле.',
    heroDescription: 'Погода и данные поля подскажут, когда и сколько поливать.',
    heroCta: 'Настроить поле',

    block1Title:        'Карта вашего поля',
    block1StatusWait:   'Ожидает GPS',
    block1StatusReady:  'Координаты определены',
    block1Desc:         'Найдите поле по GPS и отметьте его углы по порядку. Площадь рассчитается автоматически.',
    mapLabel: 'Карта поля',
    mapHint: 'Нажмите на карту: минимум 3 точки. С клавиатуры: стрелки для сдвига, кнопка «Добавить центр карты» для точки.',
    btnResetContour: 'Сбросить контур',
    btnUseRadius: 'Использовать радиус точки',
    btnUndoPoint: 'Убрать точку',
    btnClearLocation: 'Убрать маркер',
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
    salineBadge_yes:         'Солончак · промывка отдельно',

    block4Title: 'Тип оросительной системы',
    block4Desc:  'Выберите метод полива для корректного расчёта коэффициента эффективности применения воды.',
    irrig: {
      drip:       { title: 'Капельный полив',      desc: 'Адресная подача к корням. Технологический порог — 5 мм.', badge: 'КПД 90%' },
      sprinkler:  { title: 'Дождевание',            desc: 'Имитация дождя через форсунки. Равномерное распределение.', badge: 'КПД 75%' },
      pivot:      { title: 'Фронтальный (Pivot)',   desc: 'Круговая дождевальная машина. Оптимален для крупных массивов.', badge: 'КПД 75%' },
      furrow:     { title: 'Арычный полив',         desc: 'Традиционный самотечный полив. Высокие потери на фильтрацию.', badge: 'КПД 50%' },
      subsurface: { title: 'Подпочвенное',          desc: 'Трубки под поверхностью почвы. Минимальное испарение, максимум эффекта.', badge: 'КПД 90%' },
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
    errTelegramOnly: 'Чтобы получить расчёт, откройте Su-Tech через бота в Telegram.',
    errSendFailed: 'Не удалось отправить данные боту. Повторите попытку в Telegram.',
  },

  kz: {
    pageTitle:      'Su-Tech — Smart Irrigation',
    pageDesc:       'FAO-56 Penman-Monteith моделі негізінде суаруды басқарудың зияткерлік жүйесі',
    headerSubtitle: 'Smart Irrigation',
    heroTitleTop: 'Дәл суару.',
    heroTitleAccent: 'Өнімді алқап.',
    heroDescription: 'Ауа райы мен алқап деректері қашан және қанша суару керегін көрсетеді.',
    heroCta: 'Алқапты баптау',

    block1Title:        'Алқап картасы',
    block1StatusWait:   'GPS күтілуде',
    block1StatusReady:  'Координаттар тіркелді',
    block1Desc:         'Алқапты GPS арқылы тауып, бұрыштарын ретімен белгілеңіз. Ауданы автоматты есептеледі.',
    mapLabel: 'Алқап картасы',
    mapHint: 'Картада кемінде 3 нүкте белгілеңіз. Пернетақта: жылжыту үшін бағыттауыштар, нүкте үшін «Карта ортасын қосу».',
    btnResetContour: 'Контурды тазарту',
    btnUseRadius: 'Нүкте радиусын пайдалану',
    btnUndoPoint: 'Нүктені жою',
    btnClearLocation: 'Маркерді өшіру',
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
    salineBadge_yes:         'Сортаң · шаю бөлек',

    block4Title: 'Суару жүйесінің түрі',
    block4Desc:  'Су пайдалану тиімділік коэффициентін дұрыс есептеу үшін суару әдісін таңдаңыз.',
    irrig: {
      drip:       { title: 'Тамшылатып',          desc: 'Суды тамырға дәл жеткізу. Технологиялық шек — 5 мм.', badge: 'ПӘК 90%' },
      sprinkler:  { title: 'Жаңбырлатып',         desc: 'Форсунка арқылы жаңбыр имитациясы. Біркелкі таралу.', badge: 'ПӘК 75%' },
      pivot:      { title: 'Фронталды (Pivot)',   desc: 'Айналмалы жаңбырлату машинасы. Ірі алқаптар үшін оңтайлы.', badge: 'ПӘК 75%' },
      furrow:     { title: 'Арықпен',             desc: 'Дәстүрлі өздігінен ағатын суару. Сүзілуге жоғары шығын.', badge: 'ПӘК 50%' },
      subsurface: { title: 'Топырақішілік',       desc: 'Топырақ асты түтіктері. Минималды булану, максималды нәтиже.', badge: 'ПӘК 90%' },
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
    errTelegramOnly: 'Есеп алу үшін Su-Tech-ті Telegram ботынан ашыңыз.',
    errSendFailed: 'Деректер ботқа жіберілмеді. Telegram-да қайталап көріңіз.',
  },
};

const UI_COPY = {
  ru: {
    navMap: 'Карта поля', navSettings: 'Параметры', navCalculation: 'Расчет',
    workspaceLabel: 'ВАШЕ ПОЛЕ. ВАШИ РЕШЕНИЯ.', pageHeading: 'Каждая капля — по делу.',
    pageIntro: 'Очертите поле. Выберите культуру. Узнайте, сколько воды нужно сегодня.',
    methodNote: 'Расчет на основе погоды и потребности культуры', mapEyebrow: '01 / ГРАНИЦЫ УЧАСТКА',
    satellite: 'Спутник', streets: 'Схема', mapDrawLabel: 'Нажмите, чтобы добавить угол поля',
    selectRegion: '📍 Выбрать регион...', selectRegionPrompt: '📍 Выберите город / регион...', btnUndoPoint: '↩️ Отменить точку',
    btnResetContour: '🔄 Сбросить', btnClearLocation: 'Убрать маркер',
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
    selectRegion: '📍 Аймақты таңдау...', selectRegionPrompt: '📍 Өңірді / қаланы таңдаңыз...', btnUndoPoint: '↩️ Нүктені жою',
    btnResetContour: '🔄 Қайтару', btnClearLocation: 'Белгіні жою',
    mapErrorTitle: 'Картаны жүктеу мүмкін болмады', mapErrorBody: 'Байланысты тексеріп, қайта жүктеңіз. Ауданды қолмен енгізуге болады.',
    retryMap: 'Қайта жүктеу', noteTitle: 'Дәлдік шекарадан басталады',
    noteBody: 'Бұрыштарды ретімен белгілеңіз. Кемінде үш нүкте — аудан есепке автоматты енгізіледі. Спутниктік карта шекараны табуға көмектеседі.',
    summaryEyebrow: 'КЕЛЕСІ ҚАДАМҒА ДАЙЫНСЫЗ БА?', footerNote: 'Болашаққа қамқорлықпен суару.',
  },
};
Object.assign(I18N.ru, {
  block1Title: 'Ваше поле на карте', block1Desc: 'Найдите участок и обозначьте его границы.',
  block1StatusWait: 'Выберите поле', block1StatusReady: 'Участок выбран',
  block1StatusRegion: 'Регион · приблизительно',
  btnLocationText: 'GPS', btnResetContour: 'Сбросить контур', btnUndoPoint: 'Убрать точку', btnClearLocation: 'Убрать маркер',
  btnAddCenter: 'Точка в центре', btnUseRadius: 'По радиусу', mapAreaLabel: 'Площадь',
  mapHint: 'Минимум 3 точки по границе.',
  mapAreaLabel: 'Площадь', mapReady: 'Добавлено в расчет. Для ручного ввода сбросьте контур.',
  mapRadiusHint: 'Нажмите на карту, чтобы переместить круг. Измените радиус ниже.',
  block2Title: 'Что выращиваете?', block2Desc: 'Каждой культуре — своя норма воды.',
  block3Title: 'Условия на участке', block4Title: 'Как поливаете?', block4Desc: 'Учтем эффективность вашей системы.',
  fieldText_open: 'Открытое поле', fieldText_greenhouse: 'Теплица', salineText_yes: 'Солончак',
  summaryTitle: 'Ваш расчет полива', btnSubmitText: 'Рассчитать полив',
  submitHint: 'Проверьте культуру, площадь, почву и дни от посадки. Расчёт придёт в Telegram.',
  noCoordsYet: 'Выберите поле на карте или регион',
});
Object.assign(I18N.kz, {
  block1Title: 'Картадағы алқабыңыз', block1Desc: 'Алқапты тауып, шекарасын белгілеңіз.',
  block1StatusWait: 'Алқапты таңдаңыз', block1StatusReady: 'Алқап таңдалды',
  block1StatusRegion: 'Өңір · шамамен',
  btnLocationText: 'GPS', btnResetContour: 'Контурды тазарту', btnUndoPoint: 'Нүктені жою', btnClearLocation: 'Белгіні жою',
  btnAddCenter: 'Ортадағы нүкте', btnUseRadius: 'Радиус бойынша', mapAreaLabel: 'Аудан',
  mapHint: 'Шекарада кемінде 3 нүкте.',
  mapAreaLabel: 'Аудан', mapReady: 'Есепке енгізілді. Қолмен енгізу үшін контурды тазалаңыз.',
  mapRadiusHint: 'Шеңберді жылжыту үшін картаны басыңыз. Радиусты төменде өзгертіңіз.',
  block2Title: 'Не өсіресіз?', block2Desc: 'Әр дақылға — өз су мөлшері.',
  block3Title: 'Алқап жағдайы', block4Title: 'Қалай суарасыз?', block4Desc: 'Жүйеңіздің тиімділігін ескереміз.',
  fieldText_open: 'Ашық алқап', fieldText_greenhouse: 'Жылыжай', salineText_yes: 'Сортаң',
  summaryTitle: 'Суару есебіңіз', btnSubmitText: 'Суаруды есептеу',
  submitHint: 'Дақылды, ауданды, топырақты және отырғызудан кейінгі күнді тексеріңіз. Есеп Telegram-ға келеді.',
  noCoordsYet: 'Картадан алқапты не аймақты таңдаңыз',
});

I18N.en = {
  ...I18N.ru,
  pageTitle: 'Su-Tech — Smart Irrigation',
  pageDesc: 'FAO-56 smart irrigation planning with live weather and field inputs',
  headerSubtitle: 'Smart Irrigation',
  heroTitleTop: 'Precise irrigation.',
  heroTitleAccent: 'Healthier crops.',
  heroDescription: 'Weather and field data show when and how much to irrigate.',
  heroCta: 'Set up the field',
  block1Title: 'Your field on the map', block1Desc: 'Find the plot and mark its boundaries.',
  block1StatusWait: 'Select a field', block1StatusReady: 'Field selected',
  block1StatusRegion: 'Region · approximate',
  btnLocationText: 'GPS', btnLocationLoading: 'Locating…', gpsSearching: 'Getting precise satellite coordinates…',
  coordsCardTitle: 'Coordinates saved', labelLat: 'Latitude:', labelLon: 'Longitude:', mapPoint: 'Point on map',
  btnResetContour: 'Clear boundary', btnUndoPoint: 'Remove point', btnClearLocation: 'Remove marker',
  btnAddCenter: 'Centre point', btnUseRadius: 'Use radius', radiusLabel: 'Radius, m',
  mapAreaLabel: 'Area', mapHint: 'Mark at least 3 boundary points.', mapIncomplete: 'Mark at least 3 field corners.',
  mapInvalid: 'Lines intersect or the area is zero. Remove the last point.',
  mapReady: 'Added to the calculation. Clear the boundary for manual input.',
  mapUnavailable: 'The map did not load. GPS and manual area input are still available.',
  mapTilesUnavailable: 'Map tiles are unavailable. Check the connection and reload the page.',
  block2Title: 'What are you growing?', block2Desc: 'Each crop has its own water requirement.',
  crops: {
    wheat:{name:'Wheat',sub:'Бидай'}, cotton:{name:'Cotton',sub:'Мақта'}, corn:{name:'Maize',sub:'Жүгері'},
    rice:{name:'Rice',sub:'Күріш'}, alfalfa:{name:'Alfalfa',sub:'Жоңышқа'}, melon:{name:'Melons',sub:'Бақша'},
    tomato:{name:'Tomatoes',sub:'Қызанақ'}, potato:{name:'Potatoes',sub:'Картоп'}, other:{name:'Other crop',sub:'Басқа дақыл'},
  },
  block3Title: 'Field conditions', labelAreaUnit: 'Area unit:', unitText_sotka: 'Sotkas', unitText_hectare: 'Hectares',
  labelAreaValue: 'Field area:', unitBadge_sotka: 'sotkas', unitBadge_hectare: 'hectares', unitSuffix_sotka: 'sot.', unitSuffix_hectare: 'ha',
  labelQuickPresets: 'Quick select:', areaCalcEquivalentLabel: 'Equivalent:',
  equivFormat: (m2, sotka) => `${m2.toLocaleString('en-US')} m² (${sotka.toLocaleString('en-US')} sotkas)`,
  labelFieldType: 'Field type:', fieldText_open: 'Open field', fieldText_greenhouse: 'Greenhouse', fieldTypeBadge_open: 'Open field', fieldTypeBadge_greenhouse: 'Greenhouse',
  labelSalinity: 'Soil salinity:', salineText_no: 'Normal soil', salineText_yes: 'Saline soil', salineBadge_no: 'Normal soil', salineBadge_yes: 'Saline soil · leaching calculated separately',
  block4Title: 'How do you irrigate?', block4Desc: 'We account for your system efficiency.',
  irrig: {
    drip:{title:'Drip irrigation',desc:'Targeted root-zone delivery. Technology threshold: 5 mm.',badge:'90% efficiency'},
    sprinkler:{title:'Sprinkler',desc:'Rainfall simulation through nozzles and even distribution.',badge:'75% efficiency'},
    pivot:{title:'Centre pivot',desc:'Rotating sprinkler system for large fields.',badge:'75% efficiency'},
    furrow:{title:'Furrow irrigation',desc:'Traditional surface irrigation with high conveyance losses.',badge:'50% efficiency'},
    subsurface:{title:'Subsurface drip',desc:'Buried lines reduce evaporation and deliver water to roots.',badge:'90% efficiency'},
  },
  summaryTitle: 'Your irrigation calculation', sumLabelCoords: 'Location:', sumLabelCrop: 'Crop:', sumLabelArea: 'Area:',
  sumLabelIrrig: 'Technology:', sumLabelFieldType: 'Field type:', sumLabelSaline: 'Soil:',
  noCoordsYet: 'Select a field on the map or choose a region', btnSubmitText: 'Calculate irrigation',
  submitHint: 'Check the crop, area, soil and days since planting. The estimate will arrive in Telegram.',
  summaryStatusReady: 'READY TO CALCULATE', summaryStatusIncomplete: 'COMPLETE THE INPUTS',
  errNoGpsSupport: 'Your browser does not support geolocation.',
  errGpsDenied: 'Location access was denied. Enable GPS or select the field on the map.',
  errGpsTimeout: 'GPS timed out. Try again or select the field on the map.',
  errGpsUnknown: 'Could not determine the location. Please try again.',
  gpsSuccessToast: 'Field coordinates saved.', errNeedLocation: 'Select a field location first.',
  errInvalidArea: 'Enter an area greater than 0 and below 50,000.',
  successPayloadSent: 'Data sent to the bot. Running the FAO-56 calculation…',
  errTelegramOnly: 'Open Su-Tech from its Telegram bot to receive the calculation.',
  errSendFailed: 'Could not send the field data. Please try again in Telegram.',
};

UI_COPY.en = {
  ...UI_COPY.ru,
  navMap:'Field map', navSettings:'Inputs', navCalculation:'Calculation',
  satellite:'Satellite', streets:'Map', selectRegion:'Select a region', selectRegionPrompt:'Select a city / region',
  btnUndoPoint:'Remove point', btnResetContour:'Clear boundary', btnClearLocation:'Remove marker',
  mapErrorTitle:'Could not load the map', mapErrorBody:'Check the connection and retry. You can enter the area manually.',
  retryMap:'Retry', summaryEyebrow:'READY FOR THE NEXT STEP?', footerNote:'Saving water for the future.',
};

const TICKER_COPY = {
  ru: ['Расчёт водного баланса корней FAO-56', 'Точный метеопрогноз Open-Meteo', 'Экономия воды до 40%', 'Защита растений от водного стресса'],
  kz: ['FAO-56 бойынша су балансын дәл есептеу', 'Open-Meteo ауа райы болжамы', 'Суды 40%-ға дейін үнемдеу', 'Өсімдікті кебуден қорғау'],
  en: ['FAO-56 Root Zone Water Balance', 'Live Open-Meteo Weather', 'Up to 40% Water Savings', 'Crop Stress Prevention'],
};

// ─── 6. Языковое управление ───────────────────────────────────────────────
function initLanguage() {
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang')?.toLowerCase();
  state.lang = ['ru', 'kz', 'en'].includes(langParam) ? langParam : 'ru';
  applyLanguage(state.lang);
  window.addEventListener('resize', () => {
    positionLanguageIndicator(state.lang);
    document.querySelectorAll('.segmented-toggle').forEach(positionSegmentIndicator);
  });
  // Telegram changes the viewport after the first paint; web fonts can also
  // change the width of ҚАЗ. Keep the pill fitted to its actual button.
  const switcher = document.querySelector('.language-switch');
  if (switcher && window.ResizeObserver) {
    const observer = new ResizeObserver(() => positionLanguageIndicator(state.lang));
    observer.observe(switcher);
    switcher.querySelectorAll('button').forEach(button => observer.observe(button));
  }
  document.fonts?.ready.then(() => positionLanguageIndicator(state.lang));
  window.addEventListener('pageshow', () => positionLanguageIndicator(state.lang));
}

function setLanguage(lang) {
  if (state.lang === lang) return;
  state.lang = lang;
  const url = new URL(window.location);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);
  applyLanguage(lang, true);
  updateSummaryCard();
  triggerHaptic('light');
}

function applyLanguage(lang, animateIndicator = false) {
  window.SuBalance?.sync(state.crop, state.field_type, lang);
  const t = I18N[lang] || I18N.ru;
  document.querySelectorAll('[data-copy]').forEach(el => {
    const key = el.dataset.copy;
    el.textContent = UI_COPY[lang]?.[key] || I18N[lang]?.[key] || UI_COPY.ru[key] || I18N.ru[key] || '';
  });
  const ticker = TICKER_COPY[lang] || TICKER_COPY.ru;
  document.querySelectorAll('[data-ticker-index]').forEach(el => {
    el.textContent = ticker[Number(el.dataset.tickerIndex)] || '';
  });

  document.getElementById('htmlRoot').setAttribute('lang', lang);
  document.title = t.pageTitle;
  document.getElementById('pageDesc').setAttribute('content', t.pageDesc);
  document.getElementById('headerSubtitle').textContent = t.headerSubtitle;

  // One shared highlight travels to the selected button.
  _setLangBtn('langBtnKz', lang === 'kz');
  _setLangBtn('langBtnRu', lang === 'ru');
  _setLangBtn('langBtnEn', lang === 'en');
  positionLanguageIndicator(lang, animateIndicator);

  // Block 1 — GPS
  document.getElementById('block1Title').textContent = t.block1Title;
  const block1Desc = document.getElementById('block1Desc');
  if (block1Desc) block1Desc.textContent = t.block1Desc;
  document.getElementById('btnLocationText').textContent =
    state.isRequestingGps ? t.btnLocationLoading : t.btnLocationText;
  document.getElementById('coordsCardTitle').textContent = t.coordsCardTitle;
  document.getElementById('labelLat').textContent    = t.labelLat;
  document.getElementById('labelLon').textContent    = t.labelLon;
  const regSelect = document.getElementById('regionSelect');
  if (regSelect) {
    Array.from(regSelect.options).forEach(opt => {
      if (opt.value && KZ_REGIONS[opt.value]) {
        opt.textContent = lang === 'kz' ? KZ_REGIONS[opt.value].nameKz : KZ_REGIONS[opt.value].name;
      }
    });
  }
  updateBlock1StatusPill();
  updateMapUI();
  renderCoordinates();

  // Block 2 — Crop
  document.getElementById('block2Title').textContent = t.block2Title;
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
    pill.textContent = state.locationSource === 'region' ? t.block1StatusRegion : t.block1StatusReady;
  } else {
    pill.className = `${baseClasses} bg-[#EAF5FF] text-[#075CA9]`;
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
        state.locationSource = 'gps';
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
  // Use Esri's hosted street layer as the schematic fallback. The public
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

const KZ_REGIONS = {
  atyrau:    { name: 'Атырау',   nameKz: 'Атырау',   lat: 47.1167, lon: 51.8833 },
  kyzylorda: { name: 'Кызылорда', nameKz: 'Қызылорда', lat: 44.85, lon: 65.50 },
  turkestan: { name: 'Туркестан', nameKz: 'Түркістан', lat: 43.30, lon: 68.27 },
  shymkent:  { name: 'Шымкент',  nameKz: 'Шымкент',  lat: 42.32, lon: 69.60 },
  zhambyl:   { name: 'Тараз (Жамбыл)', nameKz: 'Тараз (Жамбыл)', lat: 42.90, lon: 71.37 },
  almaty:    { name: 'Алматы',   nameKz: 'Алматы',   lat: 43.24, lon: 76.91 },
  kostanay:  { name: 'Костанай', nameKz: 'Қостанай', lat: 53.22, lon: 63.63 },
  akmola:    { name: 'Кокшетау (Акмола)', nameKz: 'Көкшетау (Ақмола)', lat: 53.28, lon: 69.38 },
  sko:       { name: 'Петропавловск (СКО)', nameKz: 'Петропавл (СҚО)', lat: 54.87, lon: 69.15 },
  pavlodar:  { name: 'Павлодар', nameKz: 'Павлодар', lat: 52.29, lon: 76.95 },
  vko:       { name: 'Усть-Каменогорск (ВКО)', nameKz: 'Өскемен (ШҚО)', lat: 49.95, lon: 82.61 },
  karaganda: { name: 'Караганда', nameKz: 'Қарағанды', lat: 49.80, lon: 73.10 },
  aktobe:    { name: 'Актобе',   nameKz: 'Ақтөбе',   lat: 50.28, lon: 57.17 },
  zko:       { name: 'Атырау (Прикаспий)', nameKz: 'Атырау (Каспий маңы)', lat: 47.1167, lon: 51.8833 },
};

function selectRegion(regionKey, silent = false) {
  if (!regionKey || !KZ_REGIONS[regionKey]) return;
  const reg = KZ_REGIONS[regionKey];
  state.latitude = reg.lat;
  state.longitude = reg.lon;
  state.accuracy = 5000;
  state.locationSource = 'region';
  const regSelect = document.getElementById('regionSelect');
  if (regSelect && regSelect.value !== regionKey) {
    regSelect.value = regionKey;
  }
  if (fieldMap) {
    const loc = [reg.lat, reg.lon];
    if (gpsMarker) gpsMarker.setLatLng(loc);
    else if (window.L) gpsMarker = L.marker(loc).addTo(fieldMap);
    if (!silent) {
      fieldMap.flyTo(loc, 11, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    }
  }
  renderCoordinates();
  updateBlock1StatusPill();
  updateSummaryCard();
  updateMapUI();
  if (!silent) {
    const regionName = state.lang === 'kz' ? reg.nameKz : reg.name;
    showToast(state.lang === 'kz' ? `${regionName} аймағы таңдалды` : `Выбран регион: ${regionName}`, 'info');
    triggerHaptic('light');
  }
}

function selectFieldLocation(point) {
  state.latitude = point.lat;
  state.longitude = ((point.lng + 540) % 360) - 180;
  state.accuracy = null;
  state.locationSource = 'map';
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
  const color = valid || fieldPoints.length < 3 ? '#087FE0' : '#b91c1c';
  if (fieldLayers) {
    if (fieldPoints.length >= 3) {
      L.polygon(fieldPoints, { color, fillColor: '#087FE0', fillOpacity: valid ? 0.25 : 0.06, weight: 3, interactive: false }).addTo(fieldLayers);
    } else if (fieldPoints.length === 2) {
      L.polyline(fieldPoints, { color, weight: 3, interactive: false }).addTo(fieldLayers);
    }
    fieldPoints.forEach(p => L.circleMarker(p, { radius: 6, color, fillColor: '#fff', fillOpacity: 1, weight: 2, interactive: false }).addTo(fieldLayers));
  }

  // CRITICAL FIX: Only switch to mapped polygon area when user has completed a valid polygon (>= 3 points).
  // Single/double points do NOT wipe out user's manually entered area!
  if (fieldPoints.length >= 3 && valid) {
    fieldMode = 'polygon';
    setMappedArea(calculatePolygonArea(fieldPoints));
  } else {
    fieldMode = 'manual';
    mappedAreaM2 = 0;
    updateMapUI();
  }
}

function undoFieldPoint() {
  if (fieldPoints.length === 0) {
    const hasCurrentLoc = !!gpsMarker || (fieldMode === 'manual' && state.latitude !== null && state.longitude !== null);
    if (hasCurrentLoc) {
      clearCurrentLocation();
    }
    return;
  }
  fieldPoints.pop();
  if (!fieldPoints.length) resetFieldContour();
  else renderFieldContour();
  updateMapUI();
  triggerHaptic('light');
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
    state.locationSource = null;
    const card = document.getElementById('coordsCard');
    card?.classList.add('hidden');
    card?.classList.remove('flex');
    const regSelect = document.getElementById('regionSelect');
    if (regSelect) regSelect.value = '';
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
  updateMapUI();
  triggerHaptic('light');
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
    L.circle(radiusCenter, { radius, color: '#087FE0', fillColor: '#087FE0', fillOpacity: 0.25, weight: 3, interactive: false }).addTo(fieldLayers);
    L.circleMarker(radiusCenter, { radius: 4, color: '#075CA9', interactive: false }).addTo(fieldLayers);
  }
  setMappedArea(valid ? Math.PI * radius ** 2 : 0);
}

function updateMapUI() {
  const t = I18N[state.lang];
  document.getElementById('mapError')?.classList.toggle('hidden', !mapTilesFailed && !!window.L);
  const displayedStyle = tileAttempt === 1 ? (mapBasemap === 'satellite' ? 'streets' : 'satellite') : mapBasemap;
  document.getElementById('btnSatellite')?.setAttribute('aria-pressed', String(displayedStyle === 'satellite'));
  document.getElementById('btnStreets')?.setAttribute('aria-pressed', String(displayedStyle === 'streets'));
  positionSegmentIndicator(document.querySelector('.basemap-switch'));
  for (const id of ['btnResetContour', 'btnUndoPoint', 'btnClearLocation', 'radiusLabel', 'mapAreaLabel']) {
    const el = document.getElementById(id);
    if (el && t[id]) el.textContent = t[id];
  }
  document.getElementById('map').setAttribute('aria-label', t.mapLabel);
  document.getElementById('mapHint').textContent = !window.L ? t.mapUnavailable : mapTilesFailed ? t.mapTilesUnavailable : fieldMode === 'radius' ? t.mapRadiusHint : t.mapHint;
  
  const hasCurrentLocation = !!gpsMarker || (fieldMode === 'manual' && state.latitude !== null && state.longitude !== null);
  const btnUndo = document.getElementById('btnUndoPoint');
  if (btnUndo) btnUndo.disabled = !(fieldPoints.length > 0 || hasCurrentLocation);

  const btnReset = document.getElementById('btnResetContour');
  if (btnReset) btnReset.disabled = fieldPoints.length === 0 && mappedAreaM2 === 0 && fieldMode === 'manual';

  const btnClear = document.getElementById('btnClearLocation');
  if (btnClear) btnClear.disabled = !hasCurrentLocation && fieldPoints.length === 0;

  const btnUseRadius = document.getElementById('btnUseRadius');
  if (btnUseRadius) {
    btnUseRadius.disabled = !window.L;
    btnUseRadius.setAttribute('aria-pressed', String(fieldMode === 'radius'));
  }
  const btnAddCenter = document.getElementById('btnAddCenter');
  if (btnAddCenter) btnAddCenter.disabled = !window.L;
  document.getElementById('radiusControls')?.classList.toggle('hidden', fieldMode !== 'radius');
  
  document.getElementById('fieldAreaInput').readOnly = false;
  document.querySelectorAll('[onclick^="setPresetArea"]').forEach(btn => { btn.disabled = false; });
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
  positionSegmentIndicator(document.getElementById('areaUnitSwitch'));

  const badge = document.getElementById('currentAreaUnitBadge');
  if (badge) {
    badge.textContent = isHect ? t.unitBadge_hectare : t.unitBadge_sotka;
    badge.className = 'text-[10px] px-2.5 py-0.5 rounded-full bg-[#247C9C]/10 text-[#1C6079] font-bold whitespace-nowrap';
  }
  document.getElementById('inputUnitSuffix').textContent =
    isHect ? t.unitSuffix_hectare : t.unitSuffix_sotka;

  recalculateAreaEquivalent();
}

function activateManualAreaInput() {
  if (fieldMode === 'manual' && fieldPoints.length === 0 && radiusCenter === null) return;
  fieldMode = 'manual';
  fieldPoints = [];
  radiusCenter = null;
  mappedAreaM2 = 0;
  fieldLayers?.clearLayers();
  updateMapUI();
}

function parseAreaInput(value) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : NaN;
}

function setSoilType(soil) {
  if (!['sand', 'loam', 'clay'].includes(soil)) return;
  const input = document.getElementById('soilType');
  if (input) input.value = soil;
  document.querySelectorAll('#soilChips .chip-btn').forEach(btn => {
    const isSelected = btn.dataset.soil === soil;
    btn.classList.toggle('chip-active', isSelected);
    btn.setAttribute('aria-checked', String(isSelected));
  });
  updateSummaryCard();
  triggerHaptic('light');
}

function setMoistureCondition(cond) {
  if (!['recent', 'normal', 'dry'].includes(cond)) return;
  const input = document.getElementById('moistureCondition');
  if (input) input.value = cond;
  document.querySelectorAll('#moistureChips .chip-btn').forEach(btn => {
    const isSelected = btn.dataset.moisture === cond;
    btn.classList.toggle('chip-active', isSelected);
    btn.setAttribute('aria-checked', String(isSelected));
  });
  updateSummaryCard();
  triggerHaptic('light');
}

function changeGrowthDay(delta) {
  const input = document.getElementById('growthDay');
  if (!input || !Number.isInteger(delta)) return;
  const current = Number.parseInt(String(input.value).replace(/\D/g, ''), 10);
  const next = Math.min(3650, Math.max(0, (Number.isFinite(current) ? current : 0) + delta));
  input.value = String(next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  triggerHaptic('light');
}

function handleAreaChange(val) {
  activateManualAreaInput();
  const num = parseAreaInput(val);
  currentArea = (!isNaN(num) && num > 0) ? num : 0;
  window.currentArea = currentArea;
  state.area = currentArea;
  recalculateAreaEquivalent();
  updateSummaryCard();
}

function setPresetArea(val) {
  activateManualAreaInput();
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
  positionSegmentIndicator(document.getElementById('fieldTypeSwitch'));

  const badge = document.getElementById('fieldTypeBadge');
  if (badge) {
    badge.textContent = isOpen ? t.fieldTypeBadge_open : t.fieldTypeBadge_greenhouse;
    badge.className = isOpen ?
      'text-[10px] px-2.5 py-0.5 rounded-full bg-[#247C9C]/10 text-[#1C6079] font-bold' :
      'text-[10px] px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#075CA9] font-bold';
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
  positionSegmentIndicator(document.getElementById('salinitySwitch'));

  const badge = document.getElementById('salinityBadge');
  if (badge) {
    badge.textContent = isNormal ? t.salineBadge_no : t.salineBadge_yes;
    badge.className = isNormal ?
      'text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold' :
      'text-[10px] px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#075CA9] font-bold';
  }
}

// ─── 11. Сводная карточка ─────────────────────────────────────────────────
function updateSummaryCard() {
  window.SuBalance?.sync(state.crop, state.field_type, state.lang);
  const t = I18N[state.lang] || I18N.ru;

  // GPS coords
  const coordsVal = document.getElementById('sumValCoords');
  if (state.latitude !== null && state.longitude !== null) {
    coordsVal.textContent = `${state.locationSource === 'region' ? '≈ ' : ''}${state.latitude.toFixed(4)}°, ${state.longitude.toFixed(4)}°`;
    coordsVal.className = 'text-xs font-semibold text-[#247C9C]';
  } else {
    coordsVal.textContent = t.noCoordsYet;
    coordsVal.className = 'text-xs font-semibold text-[#75A7D3]';
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
    const ready = state.latitude !== null && state.longitude !== null && state.area > 0 && state.area < 50000 && !!window.SuBalance?.complete();
    summaryStatusBadge.textContent = ready ? t.summaryStatusReady : t.summaryStatusIncomplete;
    summaryStatusBadge.className = 'text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full '
      + (ready ? 'bg-[#247C9C]/10 text-[#1C6079]' : 'bg-slate-100 text-slate-600');
  }
}

// ─── 12. Финальная отправка ───────────────────────────────────────────────
function submitFinalCalculation() {
  if (isSubmitting) return;
  const t = I18N[state.lang] || I18N.ru;

  // 1. Проверка координат и выбора региона (требуем явный выбор города/точки)
  if (state.latitude === null || state.longitude === null) {
    const regSelect = document.getElementById('regionSelect');
    if (regSelect && regSelect.value && KZ_REGIONS[regSelect.value]) {
      selectRegion(regSelect.value, true);
    }
  }
  if (state.latitude === null || state.longitude === null) {
    const msg = state.lang === 'kz'
      ? 'Алдымен өңірді/қаланы таңдаңыз немесе картада алқапты көрсетіңіз!'
      : 'Пожалуйста, выберите ваш город/регион в списке или укажите поле на карте!';
    showToast(msg, 'warning');
    triggerHaptic('warning');
    const regSelect = document.getElementById('regionSelect');
    if (regSelect) {
      regSelect.focus();
      regSelect.classList.add('select-highlight');
      setTimeout(() => regSelect.classList.remove('select-highlight'), 2500);
    }
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
  currentArea = fieldMode === 'manual' ? parseAreaInput(areaInput?.value)
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

  const balance = window.SuBalance?.payload();
  if (!balance) {
    document.getElementById('balanceBlock')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  // Собираем динамический payload:
  const payload = {
    ...balance,
    latitude:         Number(state.latitude.toFixed(6)),
    longitude:        Number(state.longitude.toFixed(6)),
    crop:             currentCrop,
    area:             Number(currentArea),
    area_unit:        currentUnit,
    irrigation_type:  currentIrrigation,
    field_type:       currentFieldType,
    is_saline:        currentSaline,
    lang:             state.lang,
  };
  if (state.accuracy) {
    payload.accuracy = state.accuracy;
  }

  if (!tg.initData || typeof tg.sendData !== 'function') {
    showToast(t.errTelegramOnly, 'warning');
    return;
  }
  const payloadString = JSON.stringify(payload);

  isSubmitting = true;
  const btn = document.getElementById('btnSubmitAll');
  if (btn) {
    btn.disabled = true;
    btn.style.transform = 'scale(0.97)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
  }

  setTimeout(() => {
    try {
      tg.sendData(payloadString);
      showToast(t.successPayloadSent, 'success');
      triggerHaptic('success');
      try { tg.close(); } catch (_) {}
    } catch (err) {
      console.error('[Su-Tech] sendData error:', err);
      showToast(t.errSendFailed, 'error');
    } finally {
      setTimeout(() => {
        isSubmitting = false;
        if (btn) btn.disabled = false;
      }, 1000);
    }
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
    warning: 'bg-[#F0F8FF] text-[#075CA9] border-[#BDDDF4]',
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
}

function positionLanguageIndicator(lang, animate = false) {
  const switcher = document.querySelector('.language-switch');
  const indicator = switcher?.querySelector('.language-switch__indicator');
  const buttonId = { ru: 'langBtnRu', kz: 'langBtnKz', en: 'langBtnEn' }[lang];
  const button = document.getElementById(buttonId);
  if (!indicator || !button) return;
  const switchRect = switcher.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  if (!switchRect.width || !buttonRect.width) return;
  // First paint, font loading and Telegram viewport resizes must snap into
  // place; only a deliberate language change should travel between labels.
  if (animate) switcher.classList.add('is-ready');
  else switcher.classList.remove?.('is-ready');
  indicator.style.width = `${buttonRect.width}px`;
  indicator.style.transform = `translate3d(${buttonRect.left - switchRect.left}px, 0, 0)`;
  if (!animate) {
    requestAnimationFrame(() => switcher.classList.add('is-ready'));
  }
}

function positionSegmentIndicator(container) {
  if (typeof container?.querySelector !== 'function') return;
  const indicator = container?.querySelector('.segmented-toggle__indicator');
  const selected = container?.querySelector('button[aria-pressed="true"]');
  if (!indicator || !selected) return;
  indicator.style.width = `${selected.offsetWidth}px`;
  indicator.style.transform = `translate3d(${selected.offsetLeft}px, 0, 0)`;
  if (!container.classList.contains('is-ready')) {
    requestAnimationFrame(() => container.classList.add('is-ready'));
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

// ─── 16. Lightweight motion system ─────────────────────────────────────
// Uses IntersectionObserver instead of a heavy animation dependency so the
// WebApp stays responsive inside Telegram's mobile WebView.
function initMotion() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const intro = document.querySelector('.page-intro');
  const cards = document.querySelectorAll('.map-panel, .settings-column > section, .summary-card');
  intro?.classList.add('motion-intro');
  cards.forEach(card => card.classList.add('motion-card', 'reveal'));
  document.body.classList.add('motion-ready');

  if (reduced || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function initScrollProgress() {
  const bar = document.getElementById('scrollProgressBar');
  if (!bar) return;

  let scheduled = false;
  const update = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    bar.style.transform = `scaleX(${progress})`;
    scheduled = false;
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

// The small section menu borrows the reference site's animated underline.
// Update only its state on scroll; the browser handles the anchor navigation.
function initSectionNav() {
  const links = [...document.querySelectorAll('.section-nav a')];
  if (!links.length) return;
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  let scheduled = false;
  const update = () => {
    let active = 0;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.42) active = index;
    });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

// ─── 17. DOMContentLoaded — Инициализация ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  connectTelegram();
  window.SuBalance?.init(state.crop, state.field_type, state.lang);
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


  // Pre-select default state UI (region is selected by the user, not pre-forced)
  selectCrop(state.crop);
  selectIrrigation(state.irrigation_type);
  setAreaUnit(state.area_unit);
  initMotion();
  initScrollProgress();
  initSectionNav();

  if (window.lucide) {
    lucide.createIcons();
  }
});
