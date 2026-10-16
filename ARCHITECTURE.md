# Crypto Tracker — Architecture (v127 audit)

## What actually runs on production

Published site: https://0xvilya.github.io/crypto-tracker/

`index.html` loads scripts **in this order**:

| # | File | Commit SHA (jsDelivr) | Role |
|---|------|------------------------|------|
| 1 | lightweight-charts | unpkg 4.2.0 | Candlestick charts |
| 2 | **app.js** | `972d93fa` (~38 KB) | **Core**: prices (Binance+CoinGecko), watchlist, portfolio, converter, DCA, staking, gas, FX, soft refresh 20s |
| 3 | **patch.js** | `303a20b6` (~30 KB) | **Overlay**: heatmap, TON/wallet connect, GRAM rename, Pro TV button, legacy stocks UI, coin news |
| 4 | **fix-i18n.js** | `c22143cc` (~9 KB) | Full RU/EN i18n + kill home stocks card |
| 5 | **fix-stocks.js** | `425993f3` (~13 KB) | Stocks board, Yahoo prices, stock portfolio, TradingView widget |
| 6 | **fix-news.js** | `4beb8e6f` (~8 KB) | News tab: all crypto / by coin / stock market |
| 7 | inline | in index.html | Wire native nav buttons for stocks/news |

### Critical finding

Files on branch `main` named `app.js` and `patch.js` are **stubs/truncated** and are **NOT** what production runs.
Production pins historical jsDelivr SHAs. Restoring full content of app.js/patch.js into `main` is required before switching to relative paths.

## Files on main that are stubs or unused

| File | Size | Status |
|------|------|--------|
| app.js | ~1 KB | Truncated; not the running core |
| patch.js | ~110 B | Stub console.warn |
| fix.js | ~62 B | Placeholder |
| app-a.js / app-b.js | ~59 B | TEMP missing |
| patch122.js | ~19 B | pending |
| core.js | ~28 KB | Alternate core v8.1; **not loaded** |
| stocks-page.js | ~15 KB | Older stocks module; **not loaded** (superseded by fix-stocks.js) |
| unicode-fix.js | ~1.6 KB | Not loaded |

## Responsibility map (intended single source of truth)

| Concern | Owner module |
|---------|----------------|
| Crypto prices, 24h %, global mcap/BTC.D | app.js (`972d93fa`) |
| Watchlist / search any coin | app.js |
| Manual portfolio + chart | app.js |
| Converter, DCA, staking, gas | app.js |
| FX rates (USD/EUR/RUB/PLN) | app.js + fix-i18n/fix-stocks |
| Heatmap | patch.js |
| Wallet connect (TON/EVM/Sol) | patch.js |
| Coin detail news | patch.js + fix-news.js |
| Stocks board & stock portfolio | fix-stocks.js |
| News tab (crypto / by coin / stocks) | fix-news.js |
| Site-wide i18n RU/EN | fix-i18n.js |
| Charts (lightweight-charts) | app.js |
| Charts (TradingView Pro widget) | patch.js + fix-stocks.js |

## Data sources

- **Crypto spot**: Binance.US ticker/klines + CoinGecko simple/price, coins, global, search
- **FX**: api.exchangerate-api.com/v4/latest/USD
- **News**: HN Algolia, CryptoCompare, CoinDesk/Cointelegraph RSS (via rss2json in app)
- **Stocks**: Yahoo Finance chart API via direct + allorigins + corsproxy (CORS-fragile)
- **Wallets**: tonapi.io, public RPC nodes (ETH/BSC/Polygon/Arb/OP/Base), Solana RPC, Blockstream

## Refresh policy (current)

- Crypto soft refresh: **20s** (app.js)
- Meta/global: **120s**
- Stocks: **~28s** when stocks page active
- News: **~55s** when news page active
- FX cache: **~2–3 min**

## Known issues (from audit)

1. **Dual architecture**: pinned historical SHAs + main stubs → confusion and hard deploys.
2. **Duplicate logic**: money/lang/stocks implemented in multiple files; risk of double handlers.
3. **Stocks CORS**: Yahoo blocked in browser; proxies flaky → intermittent "—" prices.
4. **No unified DataLayer**: no request dedup, no AbortController for stale responses, no single in-flight map.
5. **patch.js stocks UI** may still inject home stocks; fix-i18n kills it on interval (workaround).
6. **i18n incomplete** in app.js hardcoded Russian strings vs fix-i18n overlay.
7. **core.js** is a parallel unfinished rewrite; not integrated.

## Target architecture (next steps)

```
index.html
  ├── styles.css / layout.css
  ├── app.js          # single crypto core (restore full file to main)
  ├── data.js         # NEW: unified fetch, cache, dedup, FX, timestamps
  ├── charts.js       # lightweight-charts + optional TradingView
  ├── stocks.js       # stocks board only
  ├── news.js         # news tab only
  └── i18n.js         # translations only
```

Rules:
- One module owns each concern.
- Relative paths with `?v=` cache bust for GitHub Pages.
- No jsDelivr pin to ancient SHAs once main is restored.
- No duplicate event listeners for the same control.
