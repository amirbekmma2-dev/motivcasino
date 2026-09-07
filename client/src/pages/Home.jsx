import React from 'react';
import { useAuth } from '../providers/AuthProvider';

const GAMES = [
  {
    id: 'crash',
    name: 'Meta Crash',
    description: 'Bet and cash out before the crash',
    icon: '📈',
    color: 'from-orange-500 to-red-600',
    minBet: '20 Stars',
  },
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'Red, black or green — pick your fate',
    icon: '🎰',
    color: 'from-green-500 to-emerald-700',
    minBet: '20 Stars',
  },
  {
    id: 'cards',
    name: 'Cards Duel',
    description: 'PvP Blackjack — 70 Stars per player',
    icon: '🃏',
    color: 'from-purple-500 to-indigo-700',
    minBet: '70 Stars',
  },
];

export default function Home({ navigate }) {
  const { user, balance } = useAuth();

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-8 pb-6 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-tg-gold to-orange-400 bg-clip-text text-transparent">
          TGMA Casino
        </h1>
        <p className="text-tg-muted mt-1 text-sm">PvP Games on Telegram Stars</p>
      </div>

      <div className="card flex items-center justify-between mb-6">
        <div>
          <p className="text-tg-muted text-xs">Balance</p>
          <p className="text-2xl font-bold text-tg-gold">{balance} ★</p>
        </div>
        <button
          onClick={() => navigate('wallet')}
          className="bg-tg-accent px-4 py-2 rounded-xl text-sm font-medium"
        >
          Top Up
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
              <p className="text-xs text-tg-gold mt-1">Min: {game.minBet}</p>
            </div>
            <div className="text-tg-muted text-xl">›</div>
          </button>
        ))}
      </div>

      {user && (
        <div className="mt-8 text-center text-tg-muted text-xs">
          @{user.username || user.firstName}
        </div>
      )}
    </div>
  );
}
