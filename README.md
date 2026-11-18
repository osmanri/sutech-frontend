# Su-Tech Mini App

Интерфейс Su-Tech: карта поля, ввод культуры, почвы, способа полива и насоса, три языка (RU / KZ / EN), светлая и тёмная темы. Открывается внутри Telegram как Mini App и отправляет данные боту; расчёт выполняет [sutech-core](https://github.com/osmanri/sutech-core).

[🤖 Бот](https://t.me/Su_Tech_bot) · [🗺 Mini App](https://app8796056339.tgcloud.ai/) · [English below](#english)

## Что внутри

| Путь | Назначение |
|---|---|
| `index.html` | Страница и тексты |
| `js/app.js` | Форма, карта поля (Leaflet), переключение языка |
| `js/theme.js`, `css/workspace.css` | Автоматическая тема устройства/Telegram и фирменная зелёная палитра |
| `css/app.css` | Структура интерфейса и состояния формы |
| `js/field-guidance.js` | Подсказки по незаполненным полям |
| `js/calculation-recovery.js` | Восстановление ввода после сбоя погоды |
| `js/serverless-*.js` | Передача данных боту |
| `results.html`, `js/results.js`, `css/results.css` | Страница «Results»: графики исследования на реальной погоде (RU / KZ / EN). Данные берёт из `data/results.json`, который строится в sutech-core командой `python -m research.export_web --out ../sutech-frontend/data/results.json` |
| `about.html`, `js/about.js` | Страница проекта для жюри и гостей (EN по умолчанию, RU / KZ): проблема, метод, результат, проверка расчётов, ограничения, открытые данные |
| `demo.html`, `js/demo.js` | Демо в браузере без Telegram: тот же расчёт, что в боте, с каждым шагом формулы |
| `js/sutech-engine.js` | **Точная копия** движка бота `sutech-core/serverless/tgcloud/lib/balance.js`. Не править вручную: копировать из бота; тест `serverless/test/web-engine.test.js` в sutech-core падает, если файлы разошлись |
| `js/site.js`, `css/site.css` | Общие навигация, выбор языка и стиль страниц about / demo / results |
| `api/weather.js` | Прокси погоды Open-Meteo с кэшем (принимает только координаты) |
| `vendor/leaflet` | Карта (BSD-2, локальная копия) |

## Параметры адреса

`?lang=ru|kz|en` — язык интерфейса.

## Тесты

Из корня репозитория, Node 18+:

```bash
node --test test_*.cjs
```

Страница результатов проверяется `test_results.cjs` (целостность данных и совпадение переводов).

Файлы `test_*.cjs` проверяют расчёты, карту, локализацию, погоду и темы. Файлы `test_theme_ui.js`, `test_theme_motion.js` и `test_button_motion.js` запускаются в открытом браузере командой `playwright-cli run-code --filename=<файл>`.

## English

Public pages for judges: `about.html` (project overview, validation, limitations, open data) and `demo.html` (the bot's engine in the browser, every FAO-56 step shown; `js/sutech-engine.js` is a byte-for-byte copy of the bot engine, enforced by a test in sutech-core).

Su-Tech Mini App: field map, crop / soil / irrigation / pump inputs, three languages (RU / KZ / EN), automatic light and dark themes. It runs inside Telegram and sends the field to the bot; calculations are done by [sutech-core](https://github.com/osmanri/sutech-core). `api/weather.js` is a cached Open-Meteo proxy that accepts coordinates only. Run functional tests with `node --test test_*.cjs`; run the browser checks through `playwright-cli run-code --filename=<file>`.
