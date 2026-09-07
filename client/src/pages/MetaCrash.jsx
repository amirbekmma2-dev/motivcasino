import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../hooks/useSocket';
import { useCrashStore } from '../stores/crashStore';
import { useLang } from '../providers/LangProvider';
import { translateError } from '../i18n';

const MIN_BET = 20;

export default function MetaCrash({ navigate }) {
  const { token, balance, updateBalance } = useAuth();
  const { emit, on } = useSocket('crash', token);
  const store = useCrashStore();
  const { t } = useLang();

  const [betAmount, setBetAmount] = useState(MIN_BET);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubs = [
      on('crash:round_start', (data) => {
        store.setStatus('betting');
        store.setGameId(data.gameId);
        store.setMyBet(null);
        store.setMyCashout(null);
        store.setCrashPoint(null);
        setTimer(Math.ceil(data.bettingEndsIn / 1000));
        setError('');
      }),
      on('crash:game_start', (data) => store.setStatus('running')),
      on('crash:tick', (data) => store.setMultiplier(data.multiplier)),
      on('crash:bet_confirmed', (data) => {
        updateBalance(data.balance);
        store.setMyBet({ amount: data.amount });
        setError('');
      }),
      on('crash:cashout_success', (data) => {
        updateBalance(data.balance);
        store.setMyCashout({ multiplier: data.multiplier, winAmount: data.winAmount });
      }),
      on('crash:game_crash', (data) => {
        store.setStatus('crashed');
        store.setCrashPoint(data.crashPoint);
      }),
      on('crash:round_empty', () => store.setStatus('waiting')),
      on('crash:error', (data) => setError(translateError(data.message, t))),
    ];

    return () => unsubs.forEach((u) => u?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((x) => x - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const placeBet = useCallback(() => {
    setError('');
    emit('crash:bet', { amount: betAmount });
  }, [emit, betAmount]);

  const cashout = useCallback(() => emit('crash:cashout', {}), [emit]);

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-tg-muted text-xl">←</button>
        <h1 className="text-xl font-bold">Meta Crash</h1>
      </div>

      <div className="card mb-4">
        <div className="text-center">
          {(store.status === 'running' || store.status === 'crashed') && (
            <div className={`text-7xl font-black my-4 ${store.status === 'crashed' ? 'text-tg-red' : 'text-tg-green'}`}>
              {store.multiplier.toFixed(2)}x
            </div>
          )}
          {store.status === 'betting' && (
            <div className="text-4xl font-bold text-tg-gold my-4 animate-pulse-slow">
              {t('betting')}
              {timer > 0 && <span className="text-2xl ml-2">{timer}s</span>}
            </div>
          )}
          {store.status === 'waiting' && (
            <div className="text-tg-muted my-4 text-lg">{t('waitingRound')}</div>
          )}
          {store.status === 'crashed' && store.crashPoint && (
            <div className="text-tg-red text-lg mt-2">
              {t('crashedAt').replace('{x}', store.crashPoint)}
            </div>
          )}
        </div>

        {store.myCashout && (
          <div className="bg-tg-green/20 rounded-xl p-3 text-center mt-3">
            <p className="text-tg-green font-bold">
              {t('cashedOutAt').replace('{x}', store.myCashout.multiplier)}
            </p>
            <p className="text-2xl font-bold text-tg-gold">+{store.myCashout.winAmount} ★</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-tg-red/20 text-tg-red text-sm rounded-xl p-3 mb-4 text-center">
          {error}
        </div>
      )}

      {store.status === 'betting' && !store.myBet && (
        <div className="space-y-3">
          <div className="card">
            <label className="text-tg-muted text-sm">{t('betAmount')}</label>
            <div className="flex gap-2 mt-2">
              {[20, 50, 100, 200].map((a) => (
                <button
                  key={a}
                  onClick={() => setBetAmount(a)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    betAmount === a ? 'bg-tg-accent text-white' : 'bg-gray-700 text-tg-muted'
                  }`}
                >
                  {a}★
                </button>
              ))}
            </div>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(MIN_BET, parseInt(e.target.value) || MIN_BET))}
              min={MIN_BET}
              className="w-full mt-3 bg-gray-800 rounded-xl px-4 py-3 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-tg-accent"
            />
          </div>
          <button onClick={placeBet} disabled={betAmount > balance} className="btn-green">
            {t('placeBet').replace('{n}', String(betAmount))}
          </button>
        </div>
      )}

      {store.status === 'running' && store.myBet && !store.myCashout && (
        <button onClick={cashout} className="btn-green text-xl py-4">
          {t('cashOut').replace('{n}', (store.myBet.amount * store.multiplier).toFixed(0))}
        </button>
      )}

      {store.status === 'crashed' && (
        <button onClick={() => store.reset()} className="btn-primary">
          {t('backLobby')}
        </button>
      )}
    </div>
  );
}