# Su-Tech Mini App

Интерфейс Su-Tech: карта поля, ввод культуры, почвы, способа полива и насоса, три языка (RU / KZ / EN), светлая и тёмная темы. Открывается внутри Telegram как Mini App и отправляет данные боту; расчёт выполняет [sutech-core](https://github.com/osmanri/sutech-core).

[🤖 Бот](https://t.me/Su_Tech_bot) · [🗺 Mini App](https://app8796056339.tgcloud.ai/) · [English below](#english)

## Что внутри

| Путь | Назначение |
|---|---|
| `index.html` | Страница и тексты |
| `js/app.js` | Форма, карта поля (Leaflet), переключение языка |
| `js/theme.js`, `css/theme.css` | Автоматическая и ручная тема, палитра по логотипу |
| `js/field-guidance.js` | Подсказки по незаполненным полям |
| `js/calculation-recovery.js` | Восстановление ввода после сбоя погоды |
| `js/serverless-*.js` | Передача данных боту |
| `results.html`, `js/results.js`, `css/results.css` | Страница «Results»: графики исследования на реальной погоде (RU / KZ / EN). Данные берёт из `data/results.json`, который строится в sutech-core командой `python -m research.export_web --out ../sutech-frontend/data/results.json` |
| `api/weather.js` | Прокси погоды Open-Meteo с кэшем (принимает только координаты) |
| `vendor/leaflet` | Карта (BSD-2, локальная копия) |

## Параметры адреса

`?lang=ru|kz|en` — язык интерфейса.

## Тесты

Из корня репозитория, Node 18+:

```bash
for t in test_*.js test_*.cjs; do node "$t"; done
```

Страница результатов проверяется `test_results.cjs` (целостность данных и совпадение переводов).

Все тесты сайта проходят: `node test_results.cjs`, `test_theme.cjs`, `test_weather.cjs`, `test_field_map.cjs` и остальные `test_*.js`.

## English

Su-Tech Mini App: field map, crop / soil / irrigation / pump inputs, three languages (RU / KZ / EN), light and dark themes. It runs inside Telegram and sends the field to the bot; calculations are done by [sutech-core](https://github.com/osmanri/sutech-core). `api/weather.js` is a cached Open-Meteo proxy that accepts coordinates only. Run the tests with `node test_*.js` / `node test_*.cjs`.
