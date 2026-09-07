const { RATE_LIMIT } = require('../config');

const userLimits = new Map();

function cleanup() {
  const now = Date.now();
  for (const [userId, record] of userLimits) {
    if (now - record.windowStart > RATE_LIMIT.WINDOW_MS * 2) {
      userLimits.delete(userId);
    }
  }
}

setInterval(cleanup, 60_000);

function rateLimitMiddleware(socket, next) {
  const userId = socket.user?.id;
  if (!userId) return next(new Error('Not authenticated'));

  const now = Date.now();
  let record = userLimits.get(userId);

  if (!record || now - record.windowStart > RATE_LIMIT.WINDOW_MS) {
    record = { windowStart: now, count: 0 };
    userLimits.set(userId, record);
  }

  record.count++;

  if (record.count > RATE_LIMIT.MAX_EVENTS) {
    socket.emit('error', { message: 'Rate limit exceeded. Slow down.' });
    return next(new Error('Rate limit exceeded'));
  }

  next();
}

module.exports = { rateLimitMiddleware };
