# motivCasino — Telegram Mini App

PvP-игры на Telegram Stars: Meta Crash, Рулетка, Карты (Blackjack Duel).

## Стек

- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Frontend:** React 18, Tailwind CSS, @telegram-apps/sdk-react, Zustand (собирается в `server/public`, отдаётся тем же сервером)
- **Deploy:** один Render Docker Web Service (бэк + фронт + вебхук)

## Комиссии

| Игра | Ставка | Комиссия | Выигрыш |
|------|--------|----------|---------|
| Meta Crash | от 20★ | 20% | 80% |
| Рулетка | от 20★ | 20% | 80% |
| Карты Duel | 70★ | 30% | 70% |

## Быстрый старт (локально)

```bash
# Сервер
cd server
cp .env.example .env        # впишите реальный BOT_TOKEN
npm install
npm run dev                 # http://localhost:3000

# Фронтенд (dev-режим, прокси /api -> :3000) — в другом терминале
cd client
npm install
npm run dev                 # http://localhost:5173
```

Для продакшен-проверки фронта локально: `cd client && npm run build` → соберёт в `server/public`, сервер отдаст его на `/`.

## Smoke-тест

```bash
cd server
BOT_TOKEN=<бот-токен> node smoke-test.js   # ожидаемый exit 0
```
Проверяет: HMAC-аутентификацию, ставку Crash, ставку Рулетки и полную PvP-дуэль Карт (победитель получает pot минус комиссия).

## Деплой на Render (один сервис)

1. Залейте репозиторий на GitHub и подключите к Render → **New → Web Service** → `render.yaml` (Blueprints) или Docker service.
2. Render сам соберёт образ по `server/Dockerfile` (multi-stage: сборка клиента + сервер; контекст сборки — корень репо).
3. Переменные: `BOT_TOKEN` (реальный), `WEBHOOK_URL=https://<ваш>.onrender.com` (публичный URL сервиса).
4. После первого деплоя сервер сам вызовет `setWebhook` на `/webhook`. Проверить:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
5. Health Check URL: `/health`.

⚠️ Free-план Render: диск эфемерный — базы (юзеры/балансы) сбросятся при рестарте/редеплое. Для реальной эксплуатации нужен PostgreSQL. TODO.

## Telegram Bot (BotFather)

- Создайте бота → токен.
- Mini App: `@BotFather` → ваш бот → *Bot Settings → Menu Button* → укажите URL клиента (`https://<ваш>.onrender.com/`).
- Оплата: активируйте Stars из коробки — инвойсы создаются через `createInvoiceLink` c `currency: XTR`.

## Архитектура

```
motivCasino/
├── server/
│   ├── src/
│   │   ├── index.js          — Entry point (Express + Socket.io + статика)
│   │   ├── config.js         — Env config
│   │   ├── db.js             — SQLite (better-sqlite3) + atomic ops
│   │   ├── auth.js           — HMAC-SHA256 Telegram initData validation
│   │   ├── routes/
│   │   │   ├── health.js     — GET /health
│   │   │   └── payment.js    — Invoice (XTR), webhook, balance
│   │   └── socket/
│   │       ├── index.js      — Аутентификация на каждый namespace
│   │       ├── rateLimiter.js — Anti-flood
│   │       ├── metaCrash.js  — Meta Crash game room
│   │       ├── roulette.js   — Roulette game room
│   │       └── cards.js      — Cards Duel (PvP only)
│   ├── smoke-test.js         — E2E smoke (auth + все игры)
│   ├── start-local.sh
│   ├── Dockerfile
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── providers/
│   │   │   └── AuthProvider.jsx   — init() + initData + /api/balance
│   │   ├── hooks/
│   │   │   └── useSocket.js
│   │   ├── stores/
│   │   │   ├── crashStore.js
│   │   │   ├── rouletteStore.js
│   │   │   └── cardsStore.js
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── MetaCrash.jsx
│   │       ├── Roulette.jsx
│   │       ├── Cards.jsx
│   │       └── Wallet.jsx
│   ├── index.html
│   ├── vite.config.js         — outDir: ../server/public
│   ├── tailwind.config.js
│   └── package.json
├── render.yaml
├── .gitignore
└── README.md
```

## Безопасность

- HMAC-SHA256 валидация `initData` через BOT_TOKEN (hash по RAW-значениям, как требует Telegram)
- Аутентификация установлена на каждый Socket.io namespace (`/crash`, `/roulette`, `/cards`)
- Атомарные транзакции (SQLite transactions) — защита от дублирования и минусовых балансов
- Все RNG и подсчёт результатов — строго на бэкенде
- Rate Limiting на WebSocket (30 events / 10s)
- Helmet для HTTP-заголовков
- Карты: игра ТОЛЬКО PvP, без ботов

## Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `BOT_TOKEN` | Telegram Bot Token |
| `PORT` | Порт сервера (default: 3000) |
| `WEBHOOK_URL` | Публичный URL бэкенда (нужен для setWebhook) |
| `DATABASE_URL` | Путь к SQLite файлу |
| `ADMIN_CHAT_ID` | Telegram ID админа |