import React from 'react';
import { useLang } from '../providers/LangProvider';

const ABOUT = {
  ru: {
    title: 'О боте',
    intro: '🎰 motivCasino — казино прямо в Telegram. Играй и выигрывай на звёздах.',
    how: [
      '⭐ Пополняй баланс через Telegram Stars — кнопка «Пополнить» в кошельке.',
      '🎮 Meta Crash — до 6x. Рулетка — красное / чёрное / зелёное.',
      '🃏 Дуэли на картах — только против реальных игроков.',
      '💸 Все выплаты мгновенно зачисляются на баланс.',
    ],
    feeTitle: 'Комиссия платформы',
    fee: 'Платформа оставляет процент с выигрыша: 20% на Crash и Рулетке, 30% на дуэлях карт. Остальное — твоё, выплачивается сразу.',
    fair: 'Честность  ·  Каждый раунд Meta Crash генерируется на сервере, максимум — 6x.',
    support: 'Поддержка: @bandikoff_pro',
  },
  en: {
    title: 'About',
    intro: '🎰 motivCasino — a casino right in Telegram. Play and win on Stars.',
    how: [
      '⭐ Top up with Telegram Stars — the "Top Up" button in your wallet.',
      '🎮 Meta Crash — up to 6x. Roulette — red / black / green.',
      '🃏 Card duels — only vs real players.',
      '💸 Every win is credited instantly.',
    ],
    feeTitle: 'Platform fee',
    fee: 'The platform keeps a share of winnings: 20% on Crash and Roulette, 30% on card duels. The rest is paid to you instantly.',
    fair: 'Fairness  ·  Every Meta Crash round is generated on the server, max — 6x.',
    support: 'Support: @bandikoff_pro',
  },
  uz: {
    title: 'Bot haqida',
    intro: '🎰 motivCasino — Telegram ichidagi kazino. Yulduzlarda o\'ynang va yuting.',
    how: [
      '⭐ Yunları Telegram Stars orqali to\'ldiring — hamyondagi "To\'ldirish" tugmasi.',
      '🎮 Meta Crash — 6x gacha. Roulette — qizil / qora / yashil.',
      '🃏 Karta duellari — faqat haqiqiy o\'yinchilar bilan.',
      '💸 Har bir yutuq darhol hisobga tushadi.',
    ],
    feeTitle: 'Platforma ulushi',
    fee: 'Platforma yutuqdan ulush oladi: Crash va Roulette da 20%, karta duellarida 30%. Qolgani — sizniki, darhol to\'lanadi.',
    fair: 'Halollik  ·  Har bir Meta Crash raundi serverda yaratiladi, maksimum — 6x.',
    support: 'Qo\'llab-quvvatlash: @bandikoff_pro',
  },
};

export default function About({ navigate }) {
  const { lang } = useLang();
  const c = ABOUT[lang] || ABOUT.en;

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-tg-muted text-xl">←</button>
        <h1 className="text-xl font-bold">{c.title}</h1>
      </div>

      <div className="card mb-4">
        <p className="text-tg-muted text-sm">{c.intro}</p>
      </div>

      <div className="card mb-4">
        <h2 className="font-bold mb-2">{c.feeTitle}</h2>
        <p className="text-tg-muted text-sm">{c.fee}</p>
      </div>

      <div className="card mb-4">
        <ul className="space-y-2 text-sm">
          {c.how.map((line, i) => (
            <li key={i} className="text-tg-muted">{line}</li>
          ))}
        </ul>
      </div>

      <div className="card mb-4">
        <p className="text-tg-muted text-sm">{c.fair}</p>
      </div>

      <div className="card">
        <p className="text-tg-muted text-sm">{c.support}</p>
      </div>
    </div>
  );
}