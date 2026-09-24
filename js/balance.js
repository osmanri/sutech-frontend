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
      day:'Дней от посадки', moisture:'Состояние почвы', chooseMoisture:'Выберите состояние',
      moistureRecent:'Недавно полито / был дождь', moistureNormal:'Нормальная влажность', moistureDry:'Почва сухая',
      moistureHint:'Выберите понятное состояние — запас влаги в миллиметрах система рассчитает сама.',
      daySuffix:'дн.', decreaseDay:'Уменьшить число дней', increaseDay:'Увеличить число дней',
      rice:'Для риса рассчитывается норма затопления чека (слой 10–15 см + фильтрация в грунт).',
      calendar:'Расширенные настройки', calendarHint:'Сроки стадий заполнены автоматически для выбранной культуры. При необходимости измените их под сорт и климат. Люцерна — первый цикл.',
      initial:'Начало, дней', development:'Развитие, дней', middle:'Середина, дней', late:'Созревание, дней',
      customHint:'Введите параметры текущей стадии вашей культуры.', customP:'Доля истощения p (0,1–0,8)', root:'Глубина корней, м',
      greenhouseSettings:'Микроклимат теплицы · необязательно', greenhouseEt0:'Измеренный ET₀, мм/сутки', greenhouseHint:'Оставьте пустым — система автоматически возьмёт FAO-56 ET₀ из Open-Meteo и учтёт 70% светопропускания покрытия. Заполняйте только при наличии измерения или значения агронома; внешние осадки внутри равны нулю.',
      energy:'Стоимость насоса · необязательно', price:'Тариф, ₸/кВт·ч',
      pumpPower:'Мощность насоса (кВт)', pumpProductivity:'Производительность (м³/ч)',
      energyHint:'Уточните мощность и производительность вашего насоса. Добавьте тариф, чтобы сравнить стоимость полива.',
      error:'Проверьте выделенное поле и введите допустимое число.', soilError:'Выберите тип почвы.',
      season:'День роста превышает календарь. Уточните сроки стадий.',
    },
    kz: {
      title:'Ылғал қоры', intro:'Шешім тамырдағы су қоры мен Open-Meteo тәуліктік болжамына негізделеді.',
      soil:'Топырақ түрі', choose:'Таңдаңыз', sand:'Құм', loam:'Саздақ', clay:'Саз',
      day:'Отырғызудан кейінгі күн', moisture:'Топырақ күйі', chooseMoisture:'Топырақ күйін таңдаңыз',
      moistureRecent:'Жақында суарылды / Жаңбыр', moistureNormal:'Қалыпты ылғалдылық', moistureDry:'Топырақ құрғақ',
      moistureHint:'Түсінікті күйді таңдаңыз — жүйе ылғал қорын миллиметрмен өзі есептейді.',
      daySuffix:'күн', decreaseDay:'Күн санын азайту', increaseDay:'Күн санын көбейту',
      rice:'Күрішке атызды басу нормасы есептеледі (10–15 см қабат + топыраққа сүзілу).',
      calendar:'Кеңейтілген баптаулар', calendarHint:'Кезең мерзімдері таңдалған дақылға автоматты толтырылды. Қажет болса, сорт пен климатқа сай өзгертіңіз. Жоңышқа — алғашқы цикл.',
      initial:'Басы, күн', development:'Даму, күн', middle:'Ортасы, күн', late:'Пісу, күн',
      customHint:'Дақылдың ағымдағы кезең параметрлерін енгізіңіз.', customP:'Сарқылу үлесі p (0,1–0,8)', root:'Тамыр тереңдігі, м',
      greenhouseSettings:'Жылыжай микроклиматы · міндетті емес', greenhouseEt0:'Өлшенген ET₀, мм/тәулік', greenhouseHint:'Бос қалдырыңыз — жүйе Open-Meteo FAO-56 ET₀ мәнін автоматты алып, жабынның 70% жарық өткізгіштігін ескереді. Тек өлшем немесе агроном мәні болса енгізіңіз; сыртқы жауын-шашын іште нөлге тең.',
      energy:'Сорғы құны · міндетті емес', price:'Тариф, ₸/кВт·сағ',
      pumpPower:'Сорғы қуаты (кВт)', pumpProductivity:'Өнімділігі (м³/сағ)',
      energyHint:'Сорғыңыздың қуаты мен өнімділігін нақтылаңыз. Суару құнын салыстыру үшін тарифті енгізіңіз.',
      error:'Белгіленген өрісті тексеріп, жарамды сан енгізіңіз.', soilError:'Топырақ түрін таңдаңыз.',
      season:'Өсу күні күнтізбеден асып кетті. Кезең ұзақтығын нақтылаңыз.',
    },
    en: {
      title:'Water reserve', intro:'A root-zone water balance decision based on the daily Open-Meteo forecast.',
      soil:'Soil type', choose:'Select', sand:'Sand', loam:'Loam', clay:'Clay',
      day:'Days after planting', daySuffix:'days', decreaseDay:'Decrease days', increaseDay:'Increase days',
      moisture:'Soil condition', chooseMoisture:'Select condition',
      moistureRecent:'Recently irrigated / rain', moistureNormal:'Normal moisture', moistureDry:'Dry soil',
      moistureHint:'Choose the visible soil condition — the system calculates the hidden millimetre deficit automatically.',
      rice:'Rice uses a flooded-paddy requirement (10–15 cm water layer plus soil seepage).',
      calendar:'Advanced settings', calendarHint:'Stage lengths are filled automatically. Adjust them for the variety and local climate when needed. Alfalfa uses the first cycle.',
      initial:'Initial, days', development:'Development, days', middle:'Mid-season, days', late:'Late season, days',
      customHint:'Enter the current-stage parameters for your crop.', customP:'Depletion fraction p (0.1–0.8)', root:'Root depth, m',
      greenhouseSettings:'Greenhouse microclimate · optional', greenhouseEt0:'Measured ET₀, mm/day',
      greenhouseHint:'Leave empty to estimate greenhouse ET₀ from Open-Meteo FAO-56 ET₀ with 70% cover transmission. Enter a value only when measured or supplied by an agronomist; outdoor rain is zero indoors.',
      energy:'Pump cost · optional', price:'Tariff, ₸/kWh', pumpPower:'Pump power (kW)', pumpProductivity:'Flow rate (m³/h)',
      energyHint:'Check pump power and flow rate. Add the tariff to compare irrigation costs.',
      error:'Check the highlighted field and enter a valid number.', soilError:'Select a soil type.',
      season:'Growth day exceeds the stage calendar. Adjust the stage lengths.',
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
    const moisture = el('moistureCondition').value;
    if (!['recent','normal','dry'].includes(moisture)) error('moistureCondition');
    const data = {balance_version:2, soil_type:soil,
      day_of_growth:read('growthDay',0,3650,true), moisture_condition:moisture,
      power_price:read('powerPrice',0,10000,false,true),
      pump_power_kw:read('pumpPower',.000001,100000,false,true),
      pump_productivity_m3h:read('pumpProductivity',.000001,1000000,false,true)};
    if (calendars[crop]) {
      data.stage_days = stageIds.map(id => read(id,1,730,true));
      if (data.day_of_growth > data.stage_days.reduce((a,b) => a+b,0)) error('growthDay','season');
    } else if (crop === 'other') {
      data.custom_kc = read('customKc',.05,2);
      data.custom_p = read('customP',.1,.8);
      data.custom_root_depth = read('customRoot',.05,3);
    }
    if (field === 'greenhouse' && crop !== 'rice') {
      const measuredEt0 = read('greenhouseEt0',0,50,false,true);
      if (measuredEt0 !== null) data.greenhouse_et0 = measuredEt0;
    }
    return data;
  }
  function sync(nextCrop, nextField, nextLang) {
    lang = nextLang; field = nextField;
    if (crop !== nextCrop) {
      if (calendars[crop]) edits[crop] = stageIds.map(id => el(id).value);
      crop = nextCrop;
      (edits[crop] || calendars[crop] || []).forEach((v,i) => { el(stageIds[i]).value = v; });
    }
    const currentCopy = copy[lang] || copy.ru;
    document.querySelectorAll('[data-balance-copy]').forEach(node => { node.textContent = currentCopy[node.dataset.balanceCopy] || ''; });
    document.querySelectorAll('[data-balance-aria]').forEach(node => { node.setAttribute('aria-label', currentCopy[node.dataset.balanceAria] || ''); });
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
      if (err.message === 'season') {
        const sc = el('stageCalendar');
        if (sc) sc.open = true;
      }
      const currentCopy = copy[lang] || copy.ru;
      const errMsg = currentCopy[err.message] || currentCopy.error;
      el('balanceError').textContent = errMsg;
      el('balanceError').hidden = false;
      if (window.showToast) window.showToast(errMsg, 'warning');
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
