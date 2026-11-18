(() => {
  'use strict';
  const T = {
    ru: {
      skip:'К содержимому', back:'← Карта поля', eyebrow:'Исследование на реальной погоде',
      title:'Сколько воды можно сэкономить без потери урожая',
      lead:'Su-Tech сравнили с поливом по графику на реальной погоде пяти орошаемых регионов Казахстана за 2021–2025 годы. Для графика подобрали лучший интервал и норму при том же урожае.',
      stat1:'меньше воды при том же урожае', stat2:'сезонов из 25, где Su-Tech тратит меньше (в каждой комбинации)', stat3:'дней стресса растений за сезон: Su-Tech и обычный график',
      waterTitle:'Вода за сезон при одинаковом урожае', waterSub:'Кубометров на гектар. Подпись справа — экономия и худший–лучший из 25 сезонов.',
      keySutech:'Su-Tech', keyCal:'Лучший график: интервал и норма подобраны, урожай ≥ 98% в каждом сезоне', table:'Таблица данных',
      saves:'экономия', range:'по сезонам', cotton:'Хлопок', corn:'Кукуруза', drip:'капля', furrow:'арык',
      th:['Культура, полив','Su-Tech, м³/га','График, м³/га','Экономия (95% интервал)','Худший–лучший сезон'],
      sensTitle:'Что будет, если входные данные неточны', sensSub:'Дни стресса растений за сезон (хлопок, капля). Случайные ошибки почти безвредны, систематическая — нет.',
      thS:['Сценарий','Дни стресса','Вода относительно графика'], days:'дн.',
      sc:{perfect:'Идеальный прогноз', et0_error_30pct:'Случайная ошибка испарения ±30%', rain_never_forecast:'Дожди не учтены', soil_entered_sand:'Указана не та почва', 'et0_bias_+20pct':'Испарение завышено на 20%', 'et0_bias_-20pct':'Испарение занижено на 20%', 'et0_bias_-20pct_3level_check_7d':'…и проверка влажности почвы раз в 7 дней'},
      honestTitle:'Чего эти результаты не показывают',
      honest:['Это модель против модели, а не измерение на поле. Опыт с взвешиванием горшков и полевой опыт ещё впереди. Таблицы используют конфигурацию без поправки начального Kc на смоченную поверхность; рабочий движок эту поправку включает.','Погода — реанализ NASA POWER для областных центров; урожай оценён по формуле FAO-33.','В худшем из 25 сезонов экономия была {worst}%, поэтому надёжнее говорить о диапазоне, а не о среднем.','Экономия существует только при равном урожае: обычный график с той же средней нормой тратит чуть меньше воды, но растения страдают от стресса.','Если прогноз испарения систематически занижен, ошибка копится; в проверенной симуляции еженедельная проверка компенсировала её. Точность ответов реального фермера ещё не измерена.'],
      linkMethod:'Метод и воспроизведение', linkBot:'Открыть бота', linkData:'Данные (CSV)', linkDemo:'Попробовать расчёт', foot:'Данные погоды: NASA POWER. Все числа на странице берутся из файла data/results.json, который строится из таблиц исследования.',
      error:'Не удалось загрузить результаты. Обновите страницу.'
    },
    kz: {
      skip:'Мазмұнға өту', back:'← Алқап картасы', eyebrow:'Нақты ауа райындағы зерттеу',
      title:'Өнімді жоғалтпай қанша суды үнемдеуге болады',
      lead:'Su-Tech-ті Қазақстанның бес суармалы өңірінде 2021–2025 жылдардағы нақты ауа райымен кесте бойынша суарумен салыстырдық. Кесте үшін өнім бірдей болатын ең жақсы аралық пен мөлшер таңдалды.',
      stat1:'өнім бірдей болғанда аз су', stat2:'25 маусымның қайсысында Su-Tech аз су жұмсады (әр тіркесімде)', stat3:'маусымдағы өсімдік күйзеліс күндері: Su-Tech және қарапайым кесте',
      waterTitle:'Өнім бірдей болғанда маусымдағы су', waterSub:'Гектарына текше метр. Оң жақта — үнемдеу және 25 маусымдағы ең нашар–ең жақсы нәтиже.',
      keySutech:'Su-Tech', keyCal:'Ең жақсы кесте: аралық пен мөлшер таңдалған, әр маусымда өнім ≥ 98%', table:'Деректер кестесі',
      saves:'үнемдеу', range:'маусымдар бойынша', cotton:'Мақта', corn:'Жүгері', drip:'тамшылатып', furrow:'арықпен',
      th:['Дақыл, суару','Su-Tech, м³/га','Кесте, м³/га','Үнемдеу (95% аралық)','Ең нашар–ең жақсы маусым'],
      sensTitle:'Кіріс деректер дәл болмаса не болады', sensSub:'Маусымдағы өсімдік күйзеліс күндері (мақта, тамшылатып). Кездейсоқ қателер дерлік зиянсыз, жүйелі қате — зиянды.',
      thS:['Сценарий','Күйзеліс күндері','Кестеге қатысты су'], days:'күн',
      sc:{perfect:'Мінсіз болжам', et0_error_30pct:'Булануда кездейсоқ қате ±30%', rain_never_forecast:'Жауын ескерілмеген', soil_entered_sand:'Топырақ дұрыс емес көрсетілген', 'et0_bias_+20pct':'Булану 20%-ға көтеріңкі', 'et0_bias_-20pct':'Булану 20%-ға төмен', 'et0_bias_-20pct_3level_check_7d':'…және топырақ ылғалын аптасына бір тексеру'},
      honestTitle:'Бұл нәтижелер нені көрсетпейді',
      honest:['Бұл — модель модельге қарсы, егістіктегі өлшем емес. Құмыраларды таразылау тәжірибесі мен дала тәжірибесі әлі алда. Кестелерде бастапқы Kc үшін суланған бет түзетуі өшірілген; жұмыс қозғалтқышында ол қосылған.','Ауа райы — облыс орталықтары үшін NASA POWER реанализі; өнім FAO-33 формуласымен бағаланған.','25 маусымның ең нашарында үнемдеу {worst}% болды, сондықтан орташаны емес, аралықты айтқан дұрыс.','Үнемдеу тек бірдей өнімде бар: қарапайым кесте суды сәл аз жұмсайды, бірақ өсімдік күйзеліске ұшырайды.','Булану болжамы жүйелі түрде төмен болса, қате жиналады; тексерілген симуляцияда топырақ ылғалын аптасына бір тексеру оны өтейді. Нақты фермер жауаптарының дәлдігі әлі өлшенбеген.'],
      linkMethod:'Әдіс және қайталау', linkBot:'Ботты ашу', linkData:'Деректер (CSV)', linkDemo:'Есепті байқап көру', foot:'Ауа райы деректері: NASA POWER. Беттегі барлық сандар зерттеу кестелерінен жасалған data/results.json файлынан алынады.',
      error:'Нәтижелерді жүктеу мүмкін болмады. Бетті жаңартыңыз.'
    },
    en: {
      skip:'Skip to content', back:'← Field map', eyebrow:'A study on real weather',
      title:'How much water can be saved without losing yield',
      lead:'Su-Tech was compared with fixed-calendar irrigation on real weather from five irrigated regions of Kazakhstan, 2021–2025. For the calendar, the best interval and dose giving the same yield were chosen.',
      stat1:'less water at the same yield', stat2:'of 25 seasons where Su-Tech used less water (every combination)', stat3:'crop stress days per season: Su-Tech vs a plain calendar',
      waterTitle:'Seasonal water at equal yield', waterSub:'Cubic metres per hectare. On the right: saving and the worst–best of 25 seasons.',
      keySutech:'Su-Tech', keyCal:'Best calendar: interval and dose optimised, yield ≥ 98% in every season', table:'Data table',
      saves:'saving', range:'across seasons', cotton:'Cotton', corn:'Maize', drip:'drip', furrow:'furrow',
      th:['Crop, method','Su-Tech, m³/ha','Calendar, m³/ha','Saving (95% CI)','Worst–best season'],
      sensTitle:'What happens when the inputs are inaccurate', sensSub:'Crop stress days per season (cotton, drip). Random errors are nearly harmless; a systematic bias is not.',
      thS:['Scenario','Stress days','Water vs calendar'], days:'d',
      sc:{perfect:'Perfect forecast', et0_error_30pct:'Random evaporation error ±30%', rain_never_forecast:'Rain never forecast', soil_entered_sand:'Wrong soil entered', 'et0_bias_+20pct':'Evaporation overestimated by 20%', 'et0_bias_-20pct':'Evaporation underestimated by 20%', 'et0_bias_-20pct_3level_check_7d':'…with a soil-moisture check every 7 days'},
      honestTitle:'What these results do not show',
      honest:['This is model versus model, not a field measurement. The pot-weighing experiment and a field trial are still ahead. These tables omit the initial-Kc wetted-fraction correction that the live engine includes.','Weather is NASA POWER reanalysis for regional centres; yield is estimated with the FAO-33 relation.','In the worst of 25 seasons the saving was {worst}%, so state a range rather than the mean.','The saving exists only at equal yield: a plain calendar with the same mean dose uses a little less water but the crop suffers stress.','If the evaporation forecast is systematically too low the error accumulates; a weekly soil-moisture check compensated for it in the tested simulation. Real farmer classification accuracy has not been measured.'],
      linkMethod:'Method and reproduction', linkBot:'Open the bot', linkData:'Data (CSV)', linkDemo:'Try the calculation', foot:'Weather data: NASA POWER. Every number on this page is read from data/results.json, generated from the study tables.',
      error:'Could not load the results. Please reload the page.'
    }
  };
  const root = document.documentElement;
  const chosen = () => {
    const p = new URLSearchParams(location.search).get('lang');
    const l = p === 'kk' ? 'kz' : p;
    return T[l] ? l : 'ru';
  };
  let lang = window.SuSite ? window.SuSite.lang : chosen(), data = null;
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString('en-US', {maximumFractionDigits: 0}).replace(/,/g, ' ');
  const pct = n => `${Math.round(n)}%`;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function bar(kind, value, max, label) {
    const row = el('div', `bar ${kind}`);
    const fill = el('i');
    fill.style.width = `${Math.max(0.5, value / max * 100)}%`;
    fill.style.maxWidth = 'calc(100% - 70px)';
    row.append(fill, el('span', '', label));
    return row;
  }
  function table(headers, rows) {
    const t = el('table'), thead = el('thead'), head = el('tr');
    headers.forEach(h => head.append(Object.assign(el('th', '', h), {scope: 'col'})));
    thead.append(head);
    t.append(thead);
    const body = el('tbody');
    rows.forEach(r => { const tr = el('tr'); r.forEach(c => tr.append(el('td', '', c))); body.append(tr); });
    t.append(body);
    return t;
  }

  function render() {
    const t = T[lang];
    root.lang = lang === 'kz' ? 'kk' : lang;
    document.title = `Su-Tech — ${t.title}`;
    document.querySelectorAll('[data-t]').forEach(n => { if (t[n.dataset.t] !== undefined) n.textContent = t[n.dataset.t]; });
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const d = data;
    if (!d) return;
    const c = d.combos;
    const savings = c.map(x => x.saving_pct), plain = c.map(x => x.plain_calendar_stress_days);
    const stats = $('stats');
    stats.replaceChildren(...[
      [`${Math.round(Math.min(...savings))}–${pct(Math.max(...savings))}`, t.stat1],
      [`${Math.min(...c.map(x => x.seasons_less))}/${c[0].n}`, t.stat2],
      [`0 / ${Math.round(Math.min(...plain))}–${Math.round(Math.max(...plain))}`, t.stat3]
    ].map(([v, l]) => { const li = el('li'); li.append(el('strong', '', v), el('span', '', l)); return li; }));

    const maxW = Math.max(...c.map(x => x.calendar_m3_ha));
    $('waterChart').replaceChildren(...c.map(x => {
      const row = el('div', 'row'), head = el('div', 'row-head');
      head.append(el('b', '', `${t[x.crop]}, ${t[x.method]}`), el('span', 'badge', `${t.saves} ${pct(x.saving_pct)} (${Math.round(x.worst_pct)}–${pct(x.best_pct)} ${t.range})`));
      row.append(head, bar('sutech', x.sutech_m3_ha, maxW, fmt(x.sutech_m3_ha)), bar('cal', x.calendar_m3_ha, maxW, fmt(x.calendar_m3_ha)));
      return row;
    }));
    $('waterTable').replaceChildren(table(t.th, c.map(x => [`${t[x.crop]}, ${t[x.method]}`, fmt(x.sutech_m3_ha), fmt(x.calendar_m3_ha),
      `${x.saving_pct.toFixed(1)}% (${x.ci_low.toFixed(1)}–${x.ci_high.toFixed(1)}%)`, `${x.worst_pct.toFixed(1)}–${x.best_pct.toFixed(1)}%`])));

    const s = d.sensitivity_cotton.drip, maxS = Math.max(...s.map(x => x.stress_days), 1);
    $('sensChart').replaceChildren(...s.map(x => {
      const row = el('div', 'row'), head = el('div', 'row-head');
      head.append(el('b', '', t.sc[x.scenario] || x.scenario));
      row.append(head, bar(x.stress_days > 1 ? 'bad' : 'good', x.stress_days, maxS, `${x.stress_days.toFixed(1)} ${t.days}`));
      return row;
    }));
    $('sensTable').replaceChildren(table(t.thS, s.map(x => [t.sc[x.scenario] || x.scenario, x.stress_days.toFixed(1),
      `${x.water_vs_calendar_pct > 0 ? '+' : ''}${x.water_vs_calendar_pct}%`])));

    const worst = `${Math.round(Math.min(...c.map(x => x.worst_pct)))}–${Math.round(Math.max(...c.map(x => x.worst_pct)))}`;
    $('honest').replaceChildren(...t.honest.map(h => el('li', '', h.replace('{worst}', worst))));
  }

  if (window.SuSite) window.SuSite.onLang(l => { lang = l; render(); });
  else document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u);
    render();
  }));
  render();
  fetch('data/results.json', {cache: 'no-cache'})
    .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(j => { data = j; render(); })
    .catch(err => { console.error(err); const n = el('p', 'error', T[lang].error); n.setAttribute('role', 'alert'); $('stats').replaceChildren(n); });
})();
