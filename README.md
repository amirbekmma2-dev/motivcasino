# motivCasino — Telegram Mini App

PvP-игры на Telegram Stars: Meta Crash, Рулетка, Карты (Blackjack Duel).

## Стек

- **Backend:** Node.js, Express, Socket.io, aiosqlite
- **Frontend:** React 18, Tailwind CSS, @telegram-apps/sdk-react, Zustand
- **Deploy:** Render (backend) + Vercel/Cloudflare Pages (frontend)

## Комиссии

| Игра | Ставка | Комиссия | Выигрыш |
|------|--------|----------|---------|
| Meta Crash | от 20★ | 20% | 80% |
| Рулетка | от 20★ | 20% | 80% |
| Карты Duel | 70★ | 30% | 70% |

## Быстрый старт

### Backend

```bash
cd server
cp .env.example .env
# Заполните BOT_TOKEN, WEBHOOK_URL
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
# Создайте .env:
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev
```

## Деплой

### Backend на Render

1. Создайте Docker Web Service на render.com
2. Укажите `server/Dockerfile` как Dockerfile path
3. Установите переменные: `BOT_TOKEN`, `WEBHOOK_URL`
4. Health Check URL: `/health`

### Frontend на Vercel / Cloudflare Pages

1. Репозиторий → Framework: Vite
2. Root Directory: `client`
3. Build Command: `npm run build`
4. Output: `dist`
5. Env: `VITE_API_URL=https://your-backend.onrender.com`

### Telegram Bot Webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-backend.onrender.com/webhook" \
  -d "allowed_updates=[\"pre_checkout_query\",\"message\"]"
```

## Архитектура

```
motivCasino/
├── server/
│   ├── src/
│   │   ├── index.js          — Entry point
│   │   ├── config.js         — Env config
│   │   ├── db.js             — SQLite (aiosqlite) + atomic ops
│   │   ├── auth.js           — HMAC-SHA256 Telegram validation
│   │   ├── routes/
│   │   │   ├── health.js     — GET /health
│   │   │   └── payment.js    — Invoice, webhook, balance
│   │   └── socket/
│   │       ├── index.js      — Socket.io auth middleware
│   │       ├── rateLimiter.js — Anti-flood
│   │       ├── metaCrash.js  — Meta Crash game room
│   │       ├── roulette.js   — Roulette game room
│   │       └── cards.js      — Cards Duel (PvP only)
│   ├── Dockerfile
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── providers/
│   │   │   └── AuthProvider.jsx
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
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── render.yaml
├── .gitignore
└── README.md
```

## Безопасность

- HMAC-SHA256 валидация `initData` через BOT_TOKEN
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
| `WEBHOOK_URL` | Публичный URL бэкенда |
| `DATABASE_URL` | Путь к SQLite файлу |
| `REDIS_URL` | (опционально) Redis URL |
| `ADMIN_CHAT_ID` | Telegram ID админа |
