/**
 * АгроБот — Telegram Mini App
 * Логика запроса геолокации, отправки данных в бот и локализации интерфейса.
 */

// ─── Инициализация Telegram WebApp ────────────────────────────────────────────
const tg = window.Telegram.WebApp;

tg.ready();   // Сообщаем Telegram, что WebApp полностью загружен
tg.expand();  // Разворачиваем на весь экран

// ─── i18n: словарь интерфейсных строк ─────────────────────────────────────────
const UI_STRINGS = {
  ru: {
    pageTitle:      'АгроБот — Экономия воды',
    pageDesc:       'Умная система управления поливом для фермеров',
    subtitle:       'Умная система управления поливом.<br>Экономьте воду с первой минуты.',
    howToStart:     'Как начать',
    step1:          'Нажмите кнопку ниже',
    step2:          'Разрешите доступ к геолокации',
    step3:          'Получите анализ вашего участка',
    btnLabel:       'Определить локацию',
    btnLoading:     '⏳ Спутники ищут поле...',
    btnAriaLabel:   'Определить геолокацию и отправить в бот',
    securityNote:   '🔒 Координаты используются только для анализа вашего участка',
    statusSuccess:  (accuracy) => `✅ Готово! Точность: ~${accuracy} м`,
    errNoGeo:       '❌ Ваш браузер не поддерживает геолокацию.',
    errLoading:     '⏳ Запрашиваем геолокацию…',
    errDenied:      '🔒 Доступ запрещён. Разрешите геолокацию в настройках и попробуйте снова.',
    errPosition:    '📡 Не удалось определить местоположение. Проверьте GPS и повторите.',
    errTimeout:     '⏱️ Превышено время ожидания. Попробуйте ещё раз.',
    errUnknown:     '❌ Неизвестная ошибка. Попробуйте ещё раз.',
  },
  kz: {
    pageTitle:      'АгроБот — Су үнемдеу',
    pageDesc:       'Фермерлер үшін суаруды басқарудың ақылды жүйесі',
    subtitle:       'Суаруды басқарудың ақылды жүйесі.<br>Бірінші минуттан су үнемдеңіз.',
    howToStart:     'Қалай бастау керек',
    step1:          'Төмендегі түймені басыңыз',
    step2:          'Геолокацияға рұқсат беріңіз',
    step3:          'Учаскеңіздің талдауын алыңыз',
    btnLabel:       'Орналасқан жерді анықтау',
    btnLoading:     '⏳ Спутниктер іздеуде...',
    btnAriaLabel:   'Геолокацияны анықтау және ботқа жіберу',
    securityNote:   '🔒 Координаттар тек сіздің учаскеңізді талдау үшін пайдаланылады',
    statusSuccess:  (accuracy) => `✅ Дайын! Дәлдік: ~${accuracy} м`,
    errNoGeo:       '❌ Браузеріңіз геолокацияны қолдамайды.',
    errLoading:     '⏳ Геолокация сұралуда…',
    errDenied:      '🔒 Рұқсат берілмеді. Параметрлерде геолокацияға рұқсат беріп, қайталаңыз.',
    errPosition:    '📡 Орналасқан жерді анықтау мүмкін болмады. GPS тексеріп, қайталаңыз.',
    errTimeout:     '⏱️ Күту уақыты өтіп кетті. Қайталап көріңіз.',
    errUnknown:     '❌ Белгісіз қате. Қайталап көріңіз.',
  },
};

// ─── Определение языка из URL-параметра ?lang= ────────────────────────────────
const _urlLang = new URLSearchParams(window.location.search).get('lang');
const lang = (UI_STRINGS[_urlLang] ? _urlLang : 'ru');
const s = UI_STRINGS[lang]; // Ссылка на активный словарь строк

// ─── Применение локализации к DOM ─────────────────────────────────────────────
// ВАЖНО: вызывается ДО получения ссылок на элементы и навешивания
// addEventListener — только обновляет текст, НЕ пересоздаёт элементы.
(function applyLocale() {
  document.getElementById('htmlRoot').setAttribute('lang', lang);
  document.getElementById('pageTitle').textContent     = s.pageTitle;
  document.getElementById('pageDesc').setAttribute('content', s.pageDesc);
  document.getElementById('subtitle').innerHTML        = s.subtitle;
  document.getElementById('howToStart').textContent    = s.howToStart;
  document.getElementById('step1').textContent         = s.step1;
  document.getElementById('step2').textContent         = s.step2;
  document.getElementById('step3').textContent         = s.step3;
  document.getElementById('securityNote').textContent  = s.securityNote;
  document.getElementById('btnLabel').textContent      = s.btnLabel;
  // aria-label обновляем напрямую на кнопке через её единственный id
  document.getElementById('locationBtn').setAttribute('aria-label', s.btnAriaLabel);
})();

// ─── Ссылки на элементы DOM (после applyLocale, до addEventListener) ──────────
const locationBtn = document.getElementById('locationBtn');
const statusBlock = document.getElementById('statusBlock');
const statusText  = document.getElementById('statusText');
const btnIcon     = document.getElementById('btnIcon');
const btnLabel    = document.getElementById('btnLabel');

// Флаг защиты от повторного нажатия (вместо disabled, который блокирует клик)
let _isRequesting = false;

// ─── Утилита: отображение статуса ─────────────────────────────────────────────
/**
 * @param {string} message - Текст статуса
 * @param {'loading'|'success'|'error'} type - Тип статуса
 */
function showStatus(message, type) {
  statusBlock.classList.remove('hidden');

  const styles = {
    loading: { block: 'status-loading', text: 'text-green-300 animate-pulse' },
    success: { block: 'status-success', text: 'text-green-300' },
    error:   { block: 'status-error',   text: 'text-red-400' },
  };

  statusBlock.className  = `status-block ${styles[type].block}`;
  statusText.className   = `text-sm font-medium ${styles[type].text}`;
  statusText.textContent = message;
}

// ─── Утилита: сброс кнопки в исходное состояние ───────────────────────────────
function resetButton() {
  _isRequesting = false;
  locationBtn.classList.remove('btn-loading');
  locationBtn.classList.add('btn-pulse');
  btnIcon.textContent  = '📍';
  btnLabel.textContent = s.btnLabel;
}

// ─── Утилита: кнопка в состояние загрузки ─────────────────────────────────────
function setButtonLoading() {
  _isRequesting = true;
  locationBtn.classList.remove('btn-pulse');
  locationBtn.classList.add('btn-loading');
  btnIcon.textContent  = '⏳';
  btnLabel.textContent = s.btnLoading; // "⏳ Спутники ищут поле..." / "⏳ Спутниктер іздеуде..."
}

// ─── Обработчик успешного получения геолокации ────────────────────────────────
function onLocationSuccess(position) {
  const latitude  = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy  = Math.round(position.coords.accuracy);

  showStatus(s.statusSuccess(accuracy), 'success');

  // Формируем payload для отправки в бот
  const payload = JSON.stringify({ latitude, longitude, accuracy });

  // Короткая задержка — пользователь видит "Готово!", затем WebApp закрывается.
  // tg.sendData() должен закрывать WebApp автоматически, но явный tg.close()
  // гарантирует это в любой версии Telegram-клиента.
  setTimeout(() => {
    tg.sendData(payload);
    tg.close();
  }, 600);
}

// ─── Обработчик ошибки геолокации ─────────────────────────────────────────────
function onLocationError(error) {
  resetButton();

  const errorMessages = {
    1: s.errDenied,
    2: s.errPosition,
    3: s.errTimeout,
  };

  showStatus(errorMessages[error.code] ?? s.errUnknown, 'error');
}

// ─── Основной обработчик клика ────────────────────────────────────────────────
// addEventListener вешается ОДИН РАЗ на элемент locationBtn.
// applyLocale() НЕ трогает элемент, а только обновляет его текст,
// поэтому обработчик не теряется при смене языка.
locationBtn.addEventListener('click', () => {
  // Защита от двойного нажатия
  if (_isRequesting) return;

  if (!navigator.geolocation) {
    showStatus(s.errNoGeo, 'error');
    return;
  }

  // Мгновенная визуальная реакция — пользователь видит сразу
  setButtonLoading();
  showStatus(s.errLoading, 'loading');

  navigator.geolocation.getCurrentPosition(
    onLocationSuccess,
    onLocationError,
    {
      enableHighAccuracy: true,  // GPS вместо Wi-Fi
      timeout:            15000, // Максимум 15 секунд
      maximumAge:         0,     // Не использовать кэш
    },
  );
});
