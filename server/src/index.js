require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { PORT, WEBHOOK_URL, BOT_TOKEN } = require('./config');
const { getDb } = require('./db');
const { setupSocketAuth } = require('./socket');
const healthRouter = require('./routes/health');
const paymentRouter = require('./routes/payment');
const MetaCrashRoom = require('./socket/metaCrash');
const RouletteRoom = require('./socket/roulette');
const CardsRoom = require('./socket/cards');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: WEBHOOK_URL || '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api', paymentRouter);

app.post('/webhook', async (req, res) => {
  const { update_id, ...update } = req.body;

  if (update.pre_checkout_query) {
    req.body = { pre_checkout_query: update.pre_checkout_query };
    return paymentRouter.handle(req, res);
  }

  if (update.message?.successful_payment) {
    req.body = { message: update.message };
    return paymentRouter.handle(req, res);
  }

  res.sendStatus(200);
});

setupSocketAuth(io);

new MetaCrashRoom(io);
new RouletteRoom(io);
new CardsRoom(io);

async function setWebhook() {
  if (!BOT_TOKEN || !WEBHOOK_URL) {
    console.log('BOT_TOKEN or WEBHOOK_URL not set, skipping webhook setup');
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${WEBHOOK_URL}/webhook`,
          allowed_updates: ['pre_checkout_query', 'message'],
        }),
      }
    );
    const data = await res.json();
    console.log('Webhook set:', data.ok ? 'OK' : data.description);
  } catch (err) {
    console.error('Webhook setup failed:', err.message);
  }
}

async function main() {
  await getDb();
  console.log('Database initialized');

  await setWebhook();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
