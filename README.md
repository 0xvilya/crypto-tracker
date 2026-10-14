# 💰 Crypto Tracker

Быстрый трекер криптовалют: цены, графики, ручной портфель, аналитика кошельков и новости.

**Live:** https://0xvilya.github.io/crypto-tracker/

## Что исправлено в v7

- ⚡ **Быстрая загрузка** — кэш API, меньше запросов, параллельные fetch
- 💱 **Валюты** — USD / EUR / RUB / PLN работают корректно, цены пересчитываются
- 📈 **Графики** — TradingView для популярных монет + fallback canvas с CoinGecko
- 💼 **Ручной портфель** — стабильное добавление/удаление, P&L, pie-chart, история
- 👛 **Аналитика кошелька** — при вводе адреса показывается нативный баланс, популярные токены и оценка в выбранной валюте (ETH/BSC/Polygon/Arbitrum/Optimism/Base/Solana/TON/Bitcoin)
- 📰 Новости без битых переводов
- 🌙 Тёмная / светлая тема, RU / EN

## Возможности

- Watchlist с поиском и топ-монетами
- Детальная карточка монеты + ссылки на биржи
- Ручной портфель + калькулятор P&L «если бы купил тогда»
- Аналитика портфеля (история стоимости)
- Кошелёк: вставь адрес → токены и стоимость
- Конвертер, gas, DCA, цель прибыли, доминация
- Export / Import JSON и CSV

## Технологии

- Pure HTML / CSS / JS (без сборки)
- CoinGecko public API
- TradingView widget
- Публичные RPC (publicnode), TON API, Solana RPC, Blockstream

## Локальный запуск

Откройте `index.html` в браузере или через любой static server.

## GitHub Pages

Settings → Pages → Branch: `main` / root → Save.
