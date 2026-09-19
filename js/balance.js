/* Versioned water-balance inputs. Defaults match bot/water_balance.py. */
window.SuBalance = (() => {
  const calendars = {
    wheat: [20,25,60,30], cotton: [30,50,60,55], corn: [20,35,40,30],
    alfalfa: [10,20,20,10], melon: [25,35,40,20], tomato: [30,40,45,30], potato: [25,30,45,30],
  };
  const stageIds = ['stageInitial', 'stageDevelopment', 'stageMiddle', 'stageLate'];
  const edits = {};
  let crop = null, field = 'open', lang = 'ru';
  const copy = {
    ru: {
      title:'Запас влаги', intro:'Решение по запасу воды у корней и суточному прогнозу Open-Meteo.',
      soil:'Тип почвы', choose:'Выберите', sand:'Песок', loam:'Суглинок', clay:'Глина',
      day:'Дней от посадки', deficit:'Вчерашний дефицит, мм',
      deficitHint:'Остаток на конец вчерашнего дня с учётом фактического полива. 0 — только если почва пополнена до влагоёмкости. Повторный анализ сегодня не меняет это число.',
      rice:'Для риса нужен отдельный баланс затопленного чека; обычный расчёт объёма не применяется.',
      calendar:'Календарь роста · уточнить', calendarHint:'Ориентировочные сроки: измените под сорт и климат. Люцерна — первый цикл; после укоса используйте «Другая культура» с текущими параметрами.',
      initial:'Начало, дней', development:'Развитие, дней', middle:'Середина, дней', late:'Созревание, дней',
      customHint:'Введите параметры текущей стадии вашей культуры.', customP:'Доля истощения p (0,1–0,8)', root:'Глубина корней, м',
      greenhouseEt0:'ET₀ теплицы, мм/сутки', greenhouseHint:'Введите ET₀ по микроклимату теплицы. Внешняя погода не заменяет его; осадки внутри считаются нулевыми.',
      energy:'Стоимость насоса · необязательно', price:'Тариф, ₸/кВт·ч', pump:'Насос, кВт·ч/м³',
      energyHint:'Расход энергии = мощность насоса (кВт) ÷ подача (м³/ч). Без этих данных стоимость не рассчитывается.',
      error:'Проверьте выделенное поле и введите допустимое число.', soilError:'Выберите тип почвы.',
      season:'День роста превышает календарь. Уточните сроки стадий.',
    },
    kz: {
      title:'Ылғал қоры', intro:'Шешім тамырдағы су қоры мен Open-Meteo тәуліктік болжамына негізделеді.',
      soil:'Топырақ түрі', choose:'Таңдаңыз', sand:'Құм', loam:'Саздақ', clay:'Саз',
      day:'Отырғызудан кейінгі күн', deficit:'Кешегі тапшылық, мм',
      deficitHint:'Нақты суаруды ескергендегі кешегі күн соңындағы қалдық. 0 — топырақ далалық ылғал сыйымдылығына дейін толғанда ғана. Бүгін қайталап есептеу бұл санды өзгертпейді.',
      rice:'Күрішке су басқан атыздың жеке балансы қажет; кәдімгі көлем есебі қолданылмайды.',
      calendar:'Өсу күнтізбесі · нақтылау', calendarHint:'Мерзімдер шамамен: сорт пен климатқа сай өзгертіңіз. Жоңышқа — алғашқы цикл; орғаннан кейін «Басқа дақыл» арқылы ағымдағы параметрлерді енгізіңіз.',
      initial:'Басы, күн', development:'Даму, күн', middle:'Ортасы, күн', late:'Пісу, күн',
      customHint:'Дақылдың ағымдағы кезең параметрлерін енгізіңіз.', customP:'Сарқылу үлесі p (0,1–0,8)', root:'Тамыр тереңдігі, м',
      greenhouseEt0:'Жылыжай ET₀, мм/тәулік', greenhouseHint:'Жылыжай микроклиматының ET₀ мәнін енгізіңіз. Сыртқы ауа райы оны алмастырмайды; ішкі жауын-шашын нөлге тең.',
      energy:'Сорғы құны · міндетті емес', price:'Тариф, ₸/кВт·сағ', pump:'Сорғы, кВт·сағ/м³',
      energyHint:'Энергия шығыны = сорғы қуаты (кВт) ÷ өнімділігі (м³/сағ). Деректерсіз құн есептелмейді.',
      error:'Белгіленген өрісті тексеріп, жарамды сан енгізіңіз.', soilError:'Топырақ түрін таңдаңыз.',
      season:'Өсу күні күнтізбеден асып кетті. Кезең ұзақтығын нақтылаңыз.',
    },
  };
  const el = id => document.getElementById(id);
  function error(id, message = 'error') { throw {id, message}; }
  function read(id, min, max, integer = false, optional = false) {
    const raw = String(el(id)?.value ?? '').trim().replace(',', '.');
    if (!raw && optional) return null;
    const value = Number(raw);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) error(id);
    return value;
  }
  function collect() {
    const soil = el('soilType').value;
    if (!['sand','loam','clay'].includes(soil)) error('soilType','soilError');
    const data = {balance_version:1, soil_type:soil,
      day_of_growth:read('growthDay',0,3650,true), yesterday_deficit:read('yesterdayDeficit',0,3000),
      power_price:read('powerPrice',0,10000,false,true), energy_kwh_m3:read('pumpEnergy',.000001,100,false,true)};
    if (calendars[crop]) {
      data.stage_days = stageIds.map(id => read(id,1,730,true));
      if (data.day_of_growth > data.stage_days.reduce((a,b) => a+b,0)) error('growthDay','season');
    } else if (crop === 'other') {
      data.custom_kc = read('customKc',.05,2);
      data.custom_p = read('customP',.1,.8);
      data.custom_root_depth = read('customRoot',.05,3);
    }
    if (field === 'greenhouse' && crop !== 'rice') data.greenhouse_et0 = read('greenhouseEt0',0,50);
    return data;
  }
  function sync(nextCrop, nextField, nextLang) {
    lang = nextLang; field = nextField;
    if (crop !== nextCrop) {
      if (calendars[crop]) edits[crop] = stageIds.map(id => el(id).value);
      crop = nextCrop;
      (edits[crop] || calendars[crop] || []).forEach((v,i) => { el(stageIds[i]).value = v; });
    }
    document.querySelectorAll('[data-balance-copy]').forEach(node => { node.textContent = copy[lang][node.dataset.balanceCopy]; });
    el('stageCalendar').classList.toggle('hidden', !calendars[crop]);
    el('customCropBalance').classList.toggle('hidden', crop !== 'other');
    el('riceBalanceNote').classList.toggle('hidden', crop !== 'rice');
    el('greenhouseBalance').classList.toggle('hidden', field !== 'greenhouse' || crop === 'rice');
  }
  function payload() {
    document.querySelectorAll('#balanceBlock [aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    el('balanceError').hidden = true;
    try { return collect(); } catch (err) {
      const input = el(err.id);
      input?.setAttribute('aria-invalid','true');
      const details = input?.closest('details');
      if (details) details.open = true;
      el('balanceError').textContent = copy[lang][err.message] || copy[lang].error;
      el('balanceError').hidden = false;
      input?.focus();
      return null;
    }
  }
  function complete() { try { collect(); return true; } catch (_) { return false; } }
  function init(c, f, l) {
    sync(c,f,l);
    el('balanceBlock').addEventListener('input', () => window.updateSummaryCard?.());
    el('balanceBlock').addEventListener('change', () => window.updateSummaryCard?.());
  }
  return {init, sync, payload, complete};
})();
