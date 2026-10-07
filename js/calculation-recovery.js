/* Pending input stays on this device and is scoped to the Telegram user. */
window.SuRecovery = (() => {
  const copy = {
    ru: {loading:'Получаю погоду и считаю полив…', retry:'Расчёт не завершён',
      retryBody:'Введённые параметры сохранены. Проверьте соединение и повторите расчёт.',
      saved:'Сохранены параметры расчёта', savedBody:'Верните введённые данные, если нужно повторить расчёт.',
      restore:'Вернуть параметры', again:'Повторить расчёт', dismiss:'Убрать',
      stop:'Остановить ожидание', cancelled:'Ожидание остановлено', cancelledBody:'Параметры сохранены. Если бот уже получил запрос, он может прислать результат в Telegram.',
      validation:'Проверьте параметры', validationBody:'Бот прислал пояснение. Исправьте параметры здесь и отправьте расчёт ещё раз.'},
    kz: {loading:'Ауа райын алып, суаруды есептеймін…', retry:'Есеп аяқталмады',
      retryBody:'Енгізілген параметрлер сақталды. Байланысты тексеріп, есепті қайталаңыз.',
      saved:'Есеп параметрлері сақталған', savedBody:'Есепті қайталау қажет болса, енгізілген деректерді қайтарыңыз.',
      restore:'Параметрлерді қайтару', again:'Есепті қайталау', dismiss:'Алып тастау',
      stop:'Күтуді тоқтату', cancelled:'Күту тоқтатылды', cancelledBody:'Параметрлер сақталған. Бот сұрауды алып қойған болса, нәтижені Telegram-ға жіберуі мүмкін.',
      validation:'Параметрлерді тексеріңіз', validationBody:'Бот түсіндірме жіберді. Параметрлерді осы жерде түзетіп, есепті қайта жіберіңіз.'},
    en: {loading:'Fetching weather and calculating irrigation…', retry:'Calculation not completed',
      retryBody:'Your inputs are saved. Check your connection and retry.',
      saved:'Calculation inputs are saved', savedBody:'Restore your inputs if you need to repeat the calculation.',
      restore:'Restore inputs', again:'Retry calculation', dismiss:'Dismiss',
      stop:'Stop waiting', cancelled:'Waiting stopped', cancelledBody:'Your inputs are saved. If the bot already received your request, it may still send the result to Telegram.',
      validation:'Check your inputs', validationBody:'The bot sent an explanation. Correct your inputs here and submit again.'}
  };
  let mode = null, draft = null, language = 'ru';
  function key() {
    return `sutech:pending-calculation:v1:${window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'browser'}`;
  }
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(key()) || 'null');
      if (value?.version === 1 && Date.now() - value.savedAt < 86400000 && value.savedAt <= Date.now()
          && value.payload?.balance_version === 2 && value.inputs && typeof value.inputs === 'object') return value;
      localStorage.removeItem(key());
    } catch (_) {}
    return null;
  }
  function save(value) {
    draft = {version:1, savedAt:Date.now(), ...value};
    try { localStorage.setItem(key(), JSON.stringify(draft)); } catch (_) {}
  }
  function clear() {
    draft = null;
    try { localStorage.removeItem(key()); } catch (_) {}
    show(null);
  }
  function show(nextMode) { mode = nextMode; render(); }
  function render() {
    const panel = document.getElementById('calculationRecovery');
    if (!panel) return;
    panel.hidden = !mode;
    if (!mode) return;
    const t = copy[language] || copy.ru;
    panel.dataset.mode = mode;
    document.getElementById('recoveryTitle').textContent = t[mode];
    document.getElementById('recoveryBody').textContent = t[`${mode}Body`] || '';
    const action = document.getElementById('recoveryAction');
    action.hidden = !['saved','retry','cancelled'].includes(mode);
    action.textContent = mode === 'saved' ? t.restore : t.again;
    action.onclick = mode === 'saved' ? () => {
      if (draft && window.restoreSavedCalculation?.(draft)) show('retry');
    } : () => window.submitFinalCalculation?.();
    const dismiss = document.getElementById('recoveryDismiss');
    dismiss.hidden = false;
    dismiss.textContent = mode === 'loading' ? t.stop : t.dismiss;
    dismiss.onclick = mode === 'loading' ? () => window.stopCalculationWaiting?.() : clear;
    panel.setAttribute('aria-busy', String(mode === 'loading'));
  }
  function sync(lang) { language = lang; render(); }
  function init(lang) { language = lang; draft = load(); if (draft) show('saved'); }
  return {init, sync, save, show, clear};
})();
