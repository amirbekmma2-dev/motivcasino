const { validateTelegramInitData } = require('../auth');
const { rateLimitMiddleware } = require('./rateLimiter');
const { getOrCreateUser } = require('../db');

function setupSocketAuth(io) {
  const middleware = (socket, next) => {
    const initData = socket.handshake.auth?.initData;
    if (!initData) {
      return next(new Error('Missing initData'));
    }

    const user = validateTelegramInitData(initData);
    if (!user) {
      return next(new Error('Invalid initData'));
    }

    socket.user = user;
    next();
  };

  for (const name of ['/crash', '/roulette', '/cards']) {
    const ns = io.of(name);
    ns.use(middleware);
    ns.use(rateLimitMiddleware);

    ns.on('connection', async (socket) => {
      try {
        const user = await getOrCreateUser(socket.user.id, socket.user.username);
        socket.balance = user.balance;
        socket.emit('connected', {
          user: { id: user.id, username: user.username },
          balance: user.balance,
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to load user' });
        socket.disconnect();
      }
    });
  }
}

module.exports = { setupSocketAuth };