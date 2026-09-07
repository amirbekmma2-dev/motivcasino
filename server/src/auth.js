const crypto = require('crypto');
const { BOT_TOKEN } = require('./config');

function validateTelegramInitData(initDataRaw) {
  if (!initDataRaw || !BOT_TOKEN) return null;

  const urlParams = new URLSearchParams(initDataRaw);
  const hash = urlParams.get('hash');
  if (!hash) return null;

  const dataCheckString = initDataRaw
    .split('&')
    .map((chunk) => chunk.split('='))
    .filter(([key]) => key && key !== 'hash')
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) return null;

  let user = null;
  try {
    user = JSON.parse(urlParams.get('user') || '{}');
  } catch {
    return null;
  }

  const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) return null;

  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name || '',
    username: user.username || '',
    language_code: user.language_code || 'en',
  };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('tma ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const initData = authHeader.slice(4);
  const user = validateTelegramInitData(initData);
  if (!user) {
    return res.status(401).json({ error: 'Invalid init data' });
  }

  req.user = user;
  req.initData = initData;
  next();
}

module.exports = { validateTelegramInitData, authMiddleware };
