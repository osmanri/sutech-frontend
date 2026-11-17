/* Privacy policy text: what the Su-Tech bot and Mini App store, why, who receives it, and how to delete it. */
(() => {
  'use strict';
  const C = {
    en: {
      title: 'Su-Tech — Privacy', eyebrow: 'Privacy', h1: 'What Su-Tech does with your data',
      lead: 'Su-Tech is a student project. It stores the minimum needed to calculate irrigation and shows you how to delete it.',
      sections: [
        ['What is stored', ['Your Telegram numeric id and interface language.', 'Your fields: crop, area, soil, irrigation method, the map point (latitude and longitude), watering and soil-moisture marks, optional pump data and laboratory salinity values.', 'Calculations and the weather snapshot used for them.', 'AI agronomist: the timestamps of your requests (to apply the daily limit) and, in the chat history, your questions and the answers.']],
        ['Why', ['To calculate daily irrigation advice for your field and to show it again later.', 'The legal basis is your request: you use the bot and enter the data yourself.']],
        ['Who receives data', ['Open-Meteo receives the field coordinates to return weather (no account, no id).', 'Google (Gemini) receives your question and, if you send one, your plant photo to answer as the AI agronomist.', 'Telegram carries the messages. The data is hosted on Telegram Serverless.', 'It is not sold and not shared with advertisers.']],
        ['How long', ['Until you delete it. AI request timestamps older than 24 hours are no longer used.']],
        ['Delete or ask', ['In the bot: More → My data → Delete my data. This removes your profile, fields, calculations, weather snapshots and feedback. Only the last 24 hours of AI-request timestamps stay, because they apply the daily limit, and then they stop counting.', 'Questions or a request by message: [contact of the project, to be filled in].']],
        ['Children and sensitive data', ['The author is a student. Do not send personal photos or documents; the AI agronomist is meant for plants. The system does not ask for names, phones or e-mails.']],
        ['What this page is not', ['This is an honest description of how the project works today, written by a student, not a legal opinion. If you need a formal agreement, write to the contact above.']],
      ],
      home: 'Project page',
    },
    ru: {
      title: 'Su-Tech — Конфиденциальность', eyebrow: 'Конфиденциальность', h1: 'Что Su-Tech делает с вашими данными',
      lead: 'Su-Tech — школьный проект. Он хранит минимум, нужный для расчёта полива, и показывает, как всё удалить.',
      sections: [
        ['Что хранится', ['Ваш числовой номер в Telegram и язык интерфейса.', 'Ваши поля: культура, площадь, почва, способ полива, точка на карте (широта и долгота), отметки о поливе и влажности почвы, при желании данные насоса и лабораторные значения засоления.', 'Расчёты и снимок погоды, по которому они сделаны.', 'ИИ-агроном: время ваших запросов (для суточного лимита) и в истории чата ваши вопросы и ответы.']],
        ['Зачем', ['Чтобы считать совет по поливу для вашего поля и показывать его снова.', 'Основание — ваш запрос: вы сами пользуетесь ботом и вводите данные.']],
        ['Кто получает данные', ['Open-Meteo получает координаты поля, чтобы вернуть погоду (без аккаунта и номера).', 'Google (Gemini) получает ваш вопрос и, если вы отправили, фото растения, чтобы ответить как ИИ-агроном.', 'Telegram передаёт сообщения. Данные хранятся на Telegram Serverless.', 'Данные не продаются и не передаются рекламодателям.']],
        ['Сколько хранится', ['Пока вы не удалите. Время запросов к ИИ старше 24 часов больше не используется.']],
        ['Удалить или спросить', ['В боте: Ещё → Мои данные → Удалить мои данные. Удаляются профиль, поля, расчёты, снимки погоды и отзывы. Остаётся только время запросов к ИИ за последние 24 часа, потому что по ним действует суточный лимит, затем и они перестают учитываться.', 'Вопросы или просьба сообщением: [контакт проекта, будет указан].']],
        ['Дети и чувствительные данные', ['Автор — школьник. Не отправляйте личные фото и документы: ИИ-агроном нужен для растений. Система не спрашивает имя, телефон и почту.']],
        ['Чем эта страница не является', ['Это честное описание того, как проект работает сегодня, написанное школьником, а не юридическое заключение. Если нужен формальный договор, напишите по контакту выше.']],
      ],
      home: 'О проекте',
    },
    kz: {
      title: 'Su-Tech — Құпиялылық', eyebrow: 'Құпиялылық', h1: 'Su-Tech деректеріңізбен не істейді',
      lead: 'Su-Tech — оқушы жобасы. Ол суаруды есептеуге қажетті ең азын сақтайды және бәрін қалай жоюды көрсетеді.',
      sections: [
        ['Не сақталады', ['Telegram сандық нөміріңіз және интерфейс тілі.', 'Алқаптарыңыз: дақыл, аудан, топырақ, суару тәсілі, картадағы нүкте (ендік пен бойлық), суару мен топырақ ылғалының белгілері, қалауыңыз бойынша сорғы деректері және тұздану бойынша зертханалық мәндер.', 'Есептер және олар жасалған ауа райы көшірмесі.', 'ЖИ-агроном: сұрауларыңыздың уақыты (тәуліктік лимит үшін) және чат тарихында сұрақтарыңыз бен жауаптар.']],
        ['Не үшін', ['Алқабыңызға суару кеңесін есептеу және оны қайта көрсету үшін.', 'Негіз — сіздің сұрауыңыз: ботты өзіңіз пайдаланып, деректерді өзіңіз енгізесіз.']],
        ['Деректерді кім алады', ['Open-Meteo ауа райын қайтару үшін алқап координаттарын алады (аккаунтсыз, нөмірсіз).', 'Google (Gemini) ЖИ-агроном ретінде жауап беру үшін сұрағыңызды және жіберсеңіз, өсімдік фотосын алады.', 'Telegram хабарламаларды жеткізеді. Деректер Telegram Serverless-те сақталады.', 'Деректер сатылмайды және жарнама берушілерге берілмейді.']],
        ['Қанша уақыт', ['Сіз жойғанша. 24 сағаттан ескі ЖИ сұрау уақыттары енді қолданылмайды.']],
        ['Жою немесе сұрау', ['Ботта: Тағы → Деректерім → Деректерімді жою. Профиль, алқаптар, есептер, ауа райы көшірмелері және пікірлер жойылады. Тек соңғы 24 сағаттағы ЖИ сұрау уақыттары қалады, себебі тәуліктік лимит солармен жұмыс істейді, кейін олар да есептелмейді.', 'Сұрақтар немесе хабарлама арқылы өтініш: [жоба байланысы, көрсетіледі].']],
        ['Балалар және сезімтал деректер', ['Автор — оқушы. Жеке фото мен құжаттарды жібермеңіз: ЖИ-агроном өсімдіктерге арналған. Жүйе атыңызды, телефоныңызды, поштаңызды сұрамайды.']],
        ['Бұл бет не емес', ['Бұл жобаның бүгін қалай жұмыс істейтінінің оқушы жазған шынайы сипаттамасы, заңдық қорытынды емес. Ресми келісім керек болса, жоғарыдағы байланысқа жазыңыз.']],
      ],
      home: 'Жоба туралы',
    },
  };
  const $ = id => document.getElementById(id);
  const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  function render(lang) {
    const t = C[lang];
    document.title = t.title;
    $('eyebrow').textContent = t.eyebrow; $('h1').textContent = t.h1; $('lead').textContent = t.lead;
    $('sections').replaceChildren(...t.sections.map(([h, items]) => {
      const sec = el('section'); sec.className = 'block glass';
      const ul = el('ul'); items.forEach(x => ul.append(el('li', x)));
      sec.append(el('h2', h), ul); return sec;
    }));
    $('homeLink').textContent = t.home;
  }
  document.addEventListener('DOMContentLoaded', () => window.SuSite.onLang(render));
})();
