import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../hooks/useSocket';
import { useRouletteStore } from '../stores/rouletteStore';
import { useLang } from '../providers/LangProvider';
import { translateError } from '../i18n';

const MIN_BET = 20;
const BET_OPTIONS = [
  { type: 'red', color: 'bg-tg-red' },
  { type: 'black', color: 'bg-gray-800' },
  { type: 'green', color: 'bg-tg-green' },
];

const COLOR_RESULT = {
  red: 'bg-tg-red',
  black: 'bg-gray-800',
  green: 'bg-tg-green',
};

export default function Roulette({ navigate }) {
  const { token, balance, updateBalance } = useAuth();
  const { emit, on } = useSocket('roulette', token);
  const store = useRouletteStore();
  const { t } = useLang();

  const [betAmount, setBetAmount] = useState(MIN_BET);
  const [selectedType, setSelectedType] = useState('red');
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [spinAnim, setSpinAnim] = useState(false);

  useEffect(() => {
    const unsubs = [
      on('roulette:round_start', (data) => {
        store.setStatus('betting');
        store.setGameId(data.gameId);
        store.setMyBet(null);
        store.setLastResult(null);
        setTimer(Math.ceil(data.bettingEndsIn / 1000));
        setSpinAnim(false);
        setError('');
      }),
      on('roulette:bet_confirmed', (data) => {
        updateBalance(data.balance);
        store.setMyBet({ type: data.betType, amount: data.amount });
        setError('');
      }),
      on('roulette:spinning', () => {
        store.setStatus('spinning');
        setSpinAnim(true);
      }),
      on('roulette:result', (data) => {
        store.setStatus('result');
        store.setLastResult(data);
        setSpinAnim(false);
      }),
      on('roulette:round_empty', () => store.setStatus('waiting')),
      on('roulette:error', (data) => setError(translateError(data.message, t))),
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
    emit('roulette:bet', { type: selectedType, amount: betAmount });
  }, [emit, selectedType, betAmount]);

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-tg-muted text-xl">←</button>
        <h1 className="text-xl font-bold">Roulette</h1>
      </div>

      <div className="card mb-4">
        <div className="text-center">
          {store.lastResult ? (
            <div className="my-4">
              <div className={`w-24 h-24 mx-auto rounded-full ${COLOR_RESULT[store.lastResult.color]} flex items-center justify-center text-3xl font-black shadow-lg`}>
                {store.lastResult.number}
              </div>
              <p className="text-tg-muted mt-2 capitalize">{store.lastResult.color}</p>
              {store.lastResult && store.myBet && (
                <p className={`mt-2 text-xl font-bold ${store.myBet.type === store.lastResult.color ? 'text-tg-green' : 'text-tg-red'}`}>
                  {store.myBet.type === store.lastResult.color
                    ? `+${store.myBet.amount * (store.myBet.type === 'green' ? 14 : 2)} ★`
                    : `−${store.myBet.amount} ★`}
                </p>
              )}
            </div>
          ) : spinAnim ? (
            <div className="my-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-tg-red via-tg-green to-gray-800 flex items-center justify-center animate-spin text-3xl font-black">
                ?
              </div>
              <p className="text-tg-gold mt-2 animate-pulse">{t('spinning')}</p>
            </div>
          ) : store.status === 'betting' ? (
            <div className="text-4xl font-bold text-tg-gold my-4 animate-pulse-slow">
              {t('placeBetTitle')}
              {timer > 0 && <span className="text-2xl ml-2">{timer}s</span>}
            </div>
          ) : (
            <div className="text-tg-muted my-4">{t('waitingRound')}</div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-tg-red/20 text-tg-red text-sm rounded-xl p-3 mb-4 text-center">
          {error}
        </div>
      )}

      {store.status === 'betting' && !store.myBet && (
        <div className="space-y-3">
          <div className="card">
            <p className="text-tg-muted text-sm mb-3">{t('pickColor')}</p>
            <div className="grid grid-cols-3 gap-2">
              {BET_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`${opt.color} py-4 rounded-xl font-bold text-lg transition-all ${
                    selectedType === opt.type ? 'ring-2 ring-white scale-105' : 'opacity-70'
                  }`}
                >
                  {t(opt.type)}
                </button>
              ))}
            </div>
          </div>

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
          </div>

          <button onClick={placeBet} disabled={betAmount > balance} className="btn-green">
            {t('betOn').replace('{n}', String(betAmount)).replace('{c}', t(selectedType))}
          </button>
        </div>
      )}

      {store.status === 'spinning' && store.myBet && (
        <div className="text-center text-tg-gold text-lg animate-pulse">
          {t('waitingResult')}
        </div>
      )}

      {store.status === 'result' && (
        <button onClick={() => store.reset()} className="btn-primary">
          {t('playAgain')}
        </button>
      )}
    </div>
  );
}