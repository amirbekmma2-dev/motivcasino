import React from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useLang } from '../providers/LangProvider';

export default function Home({ navigate }) {
  const { user, balance } = useAuth();
  const { t } = useLang();

  const GAMES = [
    {
      id: 'crash',
      name: 'Meta Crash',
      description: t('crashDesc'),
      icon: '📈',
      color: 'from-orange-500 to-red-600',
      minBet: '20 ★',
    },
    {
      id: 'roulette',
      name: 'Roulette',
      description: t('rouletteDesc'),
      icon: '🎡',
      color: 'from-green-500 to-emerald-700',
      minBet: '20 ★',
    },
    {
      id: 'cards',
      name: 'Cards Duel',
      description: t('cardsDesc'),
      icon: '🃏',
      color: 'from-purple-500 to-indigo-700',
      minBet: '70 ★',
    },
  ];

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-8 pb-6 text-center relative">
        <button
          onClick={() => navigate('lang')}
          className="absolute right-0 top-8 text-xl"
          aria-label={t('language')}
        >
          🌐
        </button>
        <h1 className="text-3xl font-black bg-gradient-to-r from-tg-gold to-orange-400 bg-clip-text text-transparent">
          motivCasino
        </h1>
        <p className="text-tg-muted mt-1 text-sm">{t('subtitle')}</p>
      </div>

      <div className="card flex items-center justify-between mb-6">
        <div>
          <p className="text-tg-muted text-xs">{t('balance')}</p>
          <p className="text-2xl font-bold text-tg-gold">{balance} ★</p>
        </div>
        <button
          onClick={() => navigate('wallet')}
          className="bg-tg-accent px-4 py-2 rounded-xl text-sm font-medium"
        >
          {t('topUp')}
        </button>
      </div>

      <div className="space-y-3">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => navigate(game.id)}
            className={`w-full card flex items-center gap-4 bg-gradient-to-r ${game.color} bg-opacity-10 hover:scale-[1.02] active:scale-[0.98] transition-transform text-left`}
            style={{ background: 'none' }}
          >
            <div className="text-4xl">{game.icon}</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{game.name}</h3>
              <p className="text-tg-muted text-sm">{game.description}</p>
              <p className="text-xs text-tg-gold mt-1">{t('min').replace('{n}', game.minBet)}</p>
            </div>
            <div className="text-tg-muted text-xl">›</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={() => navigate('about')} className="flex-1 card py-3 text-center font-medium text-sm">
          ℹ️ {t('about')}
        </button>
        <button onClick={() => navigate('wallet')} className="flex-1 card py-3 text-center font-medium text-sm">
          💰 {t('walletTitle')}
        </button>
      </div>

      {user && (
        <div className="mt-6 text-center text-tg-muted text-xs">
          @{user.username || user.firstName}
        </div>
      )}
    </div>
  );
}