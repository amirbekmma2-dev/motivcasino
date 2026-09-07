require('dotenv').config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  PORT: parseInt(process.env.PORT || '3000', 10),
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  DATABASE_URL: process.env.DATABASE_URL || './data.db',
  REDIS_URL: process.env.REDIS_URL || null,
  ADMIN_CHAT_ID: process.env.ADMIN_CHAT_ID || null,

  GAME: {
    CRASH: { MIN_BET: 20, PLATFORM_FEE_PCT: 20 },
    ROULETTE: { MIN_BET: 20, PLATFORM_FEE_PCT: 20 },
    CARDS: { BET: 70, PLATFORM_FEE_PCT: 30 },
  },

  RATE_LIMIT: {
    WINDOW_MS: 10_000,
    MAX_EVENTS: 30,
  },
};
