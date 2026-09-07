const { BOT_TOKEN, WEBHOOK_URL } = require('../config');

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const AD_IMAGE = WEBHOOK_URL ? `${WEBHOOK_URL}/static/ad.png` : null;

const CAPTIONS = {
  ru: `\u{1F3B0} <b>MOTIV CASINO</b> \u{1F3B0}

\u{1F525} <b>Meta Crash</b> \u2014 выигрыши до <b>6x</b>
\u{1F3B1} <b>Рулетка</b> \u2014 красное, чёрное, зелёное!
\u{1F0CF} <b>Дуэли на картах</b> \u2014 против реальных игроков

\u{2B50} Пополняй через <b>Telegram Stars</b> \u2014 без банковских карт
\u{1F4B0} Забирай весь выигрыш сразу

\u{1F449} Жми открыть \u2014 фортуна уже ждёт!`,
  en: `\u{1F3B0} <b>MOTIV CASINO</b> \u{1F3B0}

\u{1F525} <b>Meta Crash</b> \u2014 win up to <b>6x</b>
\u{1F3B1} <b>Roulette</b> \u2014 red, black, green!
\u{1F0CF} <b>Card duels</b> \u2014 vs real players

\u{2B50} Pay with <b>Telegram Stars</b> \u2014 no bank card needed
\u{1F4B0} Cash out your winnings anytime

\u{1F449} Hit open \u2014 fortune is waiting!`,
  uz: `\u{1F3B0} <b>MOTIV CASINO</b> \u{1F3B0}

\u{1F525} <b>Meta Crash</b> \u2014 yutuq <b>6x</b> gacha
\u{1F3B1} <b>Roulette</b> \u2014 qizil, qora, yashil!
\u{1F0CF} <b>Karta duellari</b> \u2014 haqiqiy o\u2018yinchilar bilan

\u{2B50} <b>Telegram Stars</b> orqali to\u2018la \u2014 bank kartasi shart emas
\u{1F4B0} Yutug\u2018ingni istalgan payt o\u2018tkazib olish mumkin

\u{1F449} Ochishni bosing \u2014 omad kutmoqda!`,
};

function pickLang(code) {
  const c = (code || 'en').toLowerCase();
  if (c.startsWith('ru') || c.startsWith('be') || c.startsWith('uk')) return 'ru';
  if (c.startsWith('uz')) return 'uz';
  return 'en';
}

async function post(method, body) {
  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`[ad] ${method} failed:`, err.message);
    return null;
  }
}

async function sendStartAd(message) {
  if (!message?.from?.id || !BOT_TOKEN) return;
  const text = message.text || '';
  if (!text.startsWith('/start')) return;

  const chatId = message.chat?.id ?? message.from.id;
  const lang = pickLang(message.from.language_code);
  const caption = CAPTIONS[lang];

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '\u{1F3B0} \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0437\u0438\u043D\u043E',
          web_app: { url: WEBHOOK_URL || '' },
        },
      ],
      [
        {
          text: '\u{1F4E2} \u041F\u043E\u0437\u0432\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u0430',
          url: `https://t.me/share/url?url=${encodeURIComponent('https://t.me/motivcasino_bot')}&text=${encodeURIComponent('\u{1F3B0} MOTIV CASINO \u2014 \u0438\u0433\u0440\u0430\u0439 \u0438 \u0432\u044B\u0438\u0433\u0440\u044B\u0432\u0430\u0439 \u043D\u0430 Telegram Stars!')}`,
        },
      ],
      [
        {
          text: '\u{1F4B0} \u041A\u0430\u043A \u043F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C?',
          web_app: { url: WEBHOOK_URL || '' },
        },
      ],
    ],
  };

  let sent = null;
  if (AD_IMAGE) {
    sent = await post('sendPhoto', {
      chat_id: chatId,
      photo: AD_IMAGE,
      caption,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  if (!sent || !sent.ok) {
    await post('sendMessage', {
      chat_id: chatId,
      text: caption,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }
}

module.exports = { sendStartAd };