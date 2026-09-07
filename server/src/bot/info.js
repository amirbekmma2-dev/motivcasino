const { BOT_TOKEN, WEBHOOK_URL } = require('../config');

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const ABOUT = {
  ru: `\u{1F3B0} <b>MOTIV CASINO</b> \u{1F3B0}

\u{1F525} <b>Meta Crash</b> \u2014 забирай выигрыш по множителю до <b>6x</b>
\u{1F3B1} <b>Рулетка</b> \u2014 красное, чёрное или зелёное
\u{1F0CF} <b>Дуэли на картах</b> \u2014 только против реальных игроков

\u{2B50} <b>Пополнение</b> \u2014 Telegram Stars, мгновенно
\u{1F4B0} <b>Вывод</b> \u2014 от <b>500 ★</b>, на баланс Stars

\u{1F4B8} <b>Комиссия платформы:</b>
\u{2022} Crash и Рулетка \u2014 20%
\u{2022} Дуэли карт \u2014 30%
Остальное \u2014 сразу на твой баланс.

\u{2705} <b>Честность:</b> каждый раунд генерируется на сервере, в Meta Crash максимум \u2014 6x.

\u{1F4AC} Поддержка: @bandikoff_pro`,
  en: `\u{1F3B0} <b>MOTIV CASINO</b> \u{1F3B0}

\u{1F525} <b>Meta Crash</b> \u2014 cash out a multiplier up to <b>6x</b>
\u{1F3B1} <b>Roulette</b> \u2014 red, black or green
\u{1F0CF} <b>Card duels</b> \u2014 only vs real players

\u{2B50} <b>Top up</b> \u2014 Telegram Stars, instantly
\u{1F4B0} <b>Withdrawal</b> \u2014 from <b>500 \u002A</b>, to your Stars balance

\u{1F4B8} <b>Platform fee:</b>
\u{2022} Crash and Roulette \u2014 20%
\u{2022} Card duels \u2014 30%
The rest goes straight to your balance.

\u{2705} <b>Fairness:</b> every round is generated on the server, Meta Crash max \u2014 6x.

\u{1F4AC} Support: @bandikoff_pro`,
  uz: `\u{1F3B0} <b>MOTIV CASINO</b> \u{1F3B0}

\u{1F525} <b>Meta Crash</b> \u2014 <b>6x</b> gacha multiplikatorni yutib oling
\u{1F3B1} <b>Roulette</b> \u2014 qizil, qora yoki yashil
\u{1F0CF} <b>Karta duellari</b> \u2014 faqat haqiqiy o'yinchilar bilan

\u{2B50} <b>To'ldirish</b> \u2014 Telegram Stars, darhol
\u{1F4B0} <b>Yechib olish</b> \u2014 <b>500 \u002A</b> dan, Stars balansiga

\u{1F4B8} <b>Platforma ulushi:</b>
\u{2022} Crash va Roulette \u2014 20%
\u{2022} Karta duellari \u2014 30%
Qolgani \u2014 darhol balansingizga.

\u{2705} <b>Halollik:</b> har bir raund serverda yaratiladi, Meta Crash maksimum \u2014 6x.

\u{1F4AC} Qo'llab-quvvatlash: @bandikoff_pro`,
};

function pickLang(code) {
  const c = (code || 'en').toLowerCase();
  if (c.startsWith('ru') || c.startsWith('be') || c.startsWith('uk')) return 'ru';
  if (c.startsWith('uz')) return 'uz';
  return 'en';
}

async function tgPost(method, body) {
  try {
    const res = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err) {
    console.error(`[bot] ${method} failed:`, err.message);
    return null;
  }
}

function aboutKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: '\u{1F3B0} \u{041E}\u{0442}\u{043A}\u{0440}\u{044B}\u{0442}\u{044C} \u{043A}\u{0430}\u{0437}\u{0438}\u{043D}\u{043E}',
          web_app: { url: WEBHOOK_URL || '' },
        },
      ],
    ],
  };
}

async function sendAbout(chatId, from) {
  const lang = pickLang(from?.language_code);
  await tgPost('sendMessage', {
    chat_id: chatId,
    text: ABOUT[lang],
    parse_mode: 'HTML',
    reply_markup: aboutKeyboard(),
  });
}

async function handleCallbackQuery(callbackQuery) {
  if (!callbackQuery?.data) return;
  const { from, message } = callbackQuery;
  if (callbackQuery.data !== 'about') return;

  await tgPost('answerCallbackQuery', {
    callback_query_id: callbackQuery.id,
    text: '\u{1F4B0} \u041E \u0431\u043E\u0442\u0435',
  });

  if (message?.chat?.id) {
    await sendAbout(message.chat.id, from);
  }
}

async function handleMessage(message) {
  const text = message?.text || '';
  if (text.startsWith('/start')) return;
  if (text.startsWith('/about') || text.startsWith('/help')) {
    await sendAbout(message.chat.id, message.from);
  }
}

module.exports = { pickLang, handleCallbackQuery, handleMessage };