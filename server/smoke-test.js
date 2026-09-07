const crypto = require('crypto');
const { io } = require('socket.io-client');

const BOT_TOKEN = process.env.BOT_TOKEN || 'test';
const SERVER = process.env.SERVER || 'http://localhost:3000';

function buildInitData(userId, username) {
  const user = JSON.stringify({ id: userId, first_name: username, username, language_code: 'ru' });
  const authDate = Math.floor(Date.now() / 1000);
  const fields = [
    `auth_date=${authDate}`,
    `query_id=AAHtESTKAAAAAO0RJMoA${userId}`,
    `user=${encodeURIComponent(user)}`,
  ];
  const dataCheckString = fields.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return fields.join('&') + `&hash=${hash}`;
}

function makeSocket(ns, userId, username) {
  const s = io(`${SERVER}/${ns}`, {
    auth: { initData: buildInitData(userId, username) },
    transports: ['websocket', 'polling'],
    reconnection: false,
  });
  s.on('connect_error', (err) => console.log(`[${ns}/${username}] connect_error:`, err.message));
  return s;
}

function waitConnected(sock) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('connect timeout')), 10000);
    sock.once('connected', (data) => { clearTimeout(t); resolve(data); });
    sock.on('connect_error', (err) => log('connect_error (retrying):', err.message));
  });
}

const results = [];
const log = (...a) => console.log(...a);

async function run() {
  let plugged = 0;

  // ---------- CRASH ----------
  const crashSocket = makeSocket('crash', 1001, 'alice');
  let crashReady = false;
  crashSocket.on('crash:bet_confirmed', (data) => { results.push({ crashBet: data }); log('crash:bet_confirmed', data); });
  crashSocket.on('crash:error', (d) => log('crash:error ->', d.message));
  crashSocket.on('crash:round_start', () => {
    if (crashReady && !results.some((r) => r.crashBet) && crashSocket.connected) {
      crashSocket.emit('crash:bet', { amount: 20 });
    }
  });
  await waitConnected(crashSocket).then((d) => { crashReady = true; plugged++; log('crash connected, balance', d.balance); });

  // ---------- ROULETTE ----------
  const rouletteSocket = makeSocket('roulette', 1002, 'bob');
  let rouletteReady = false;
  rouletteSocket.on('roulette:bet_confirmed', (data) => { results.push({ rouletteBet: data }); log('roulette:bet_confirmed', data); });
  rouletteSocket.on('roulette:error', (d) => log('roulette:error ->', d.message));
  rouletteSocket.on('roulette:round_start', () => {
    if (rouletteReady && !results.some((r) => r.rouletteBet) && rouletteSocket.connected) {
      rouletteSocket.emit('roulette:bet', { type: 'red', amount: 20 });
    }
  });
  await waitConnected(rouletteSocket).then((d) => { rouletteReady = true; plugged++; log('roulette connected, balance', d.balance); });

  // ---------- CARDS (PvP duel) ----------
  const cardsSocket = makeSocket('cards', 1003, 'carol');
  const cardsSocket2 = makeSocket('cards', 1004, 'dave');
  cardsSocket.on('cards:waiting', (d) => { log('cards/carol waiting, duelId', d.duelId); results.push({ cardsWaiting: true }); });
  cardsSocket.on('cards:game_start', (d) => { log('cards/carol game start, score', d.yourScore); setTimeout(() => cardsSocket.emit('cards:stand'), 300); });
  cardsSocket2.on('cards:game_start', (d) => { log('cards/dave game start, score', d.yourScore); setTimeout(() => cardsSocket2.emit('cards:stand'), 500); });
  cardsSocket.on('cards:result', (d) => { results.push({ cards: { result: d.result } }); log('cards/carol result ->', d.result); });
  cardsSocket2.on('cards:result', (d) => { results.push({ cards2: { result: d.result } }); log('cards/dave result ->', d.result); });
  cardsSocket.on('cards:error', (d) => log('cards/carol error:', d.message));
  cardsSocket2.on('cards:error', (d) => log('cards/dave error:', d.message));
  await waitConnected(cardsSocket);
  await waitConnected(cardsSocket2);
  plugged += 2;
  cardsSocket.emit('cards:find_match', {});
  setTimeout(() => cardsSocket2.emit('cards:find_match', {}), 800);

  setTimeout(() => {
    log('\n=== SMOKE TEST SUMMARY ===');
    log(JSON.stringify(results, null, 2));
    const ok = results.some((r) => r.crashBet) && results.some((r) => r.rouletteBet) && results.some((r) => r.cards) && results.some((r) => r.cards2);
    process.exit(ok ? 0 : 1);
  }, 25000);
}

run().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('\n=== TIMEOUT — summary ===');
  console.log(JSON.stringify(results, null, 2));
  process.exit(1);
}, 30000);
