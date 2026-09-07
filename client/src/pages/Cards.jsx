import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useSocket } from '../hooks/useSocket';
import { useCardsStore } from '../stores/cardsStore';
import { useLang } from '../providers/LangProvider';
import { translateError } from '../i18n';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: 'text-tg-red', diamonds: 'text-tg-red', clubs: 'text-white', spades: 'text-white' };

function CardView({ card, hidden }) {
  if (hidden) {
    return (
      <div className="w-14 h-20 bg-gray-600 rounded-lg flex items-center justify-center border border-gray-500">
        <span className="text-xl">?</span>
      </div>
    );
  }
  return (
    <div className="w-14 h-20 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-gray-300 shadow-lg">
      <span className={`text-xs font-bold ${SUIT_COLORS[card.suit]}`}>
        {card.rank}
      </span>
      <span className={`text-lg ${SUIT_COLORS[card.suit]}`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
}

export default function Cards({ navigate }) {
  const { token, balance, updateBalance } = useAuth();
  const { emit, on } = useSocket('cards', token);
  const store = useCardsStore();
  const { t } = useLang();

  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    const unsubs = [
      on('cards:waiting', (data) => {
        store.setStatus('waiting');
        store.setDuelId(data.duelId);
        updateBalance(data.balance);
        setError('');
        setResultData(null);
      }),
      on('cards:game_start', (data) => {
        store.setStatus('playing');
        store.setDuelId(data.duelId);
        store.setMyHand(data.yourHand);
        store.setMyScore(data.yourScore);
        store.setOpponentUsername(data.opponentUsername);
        store.setCardsInDeck(data.cardsInDeck);
        setError('');
      }),
      on('cards:hit_result', (data) => {
        store.setMyHand((prev) => [...prev, data.card]);
        store.setMyScore(data.newScore);
        store.setCardsInDeck(data.cardsInDeck);
      }),
      on('cards:bust', (data) => store.setResult({ type: 'bust', score: data.score })),
      on('cards:stood', () => store.setStatus('stood')),
      on('cards:result', (data) => {
        updateBalance(data.balance);
        store.setResult(data);
        setResultData(data);
        store.setStatus('finished');
      }),
      on('cards:cancelled', (data) => {
        updateBalance(data.balance);
        store.reset();
      }),
      on('cards:error', (data) => {
        setError(translateError(data.message, t));
        store.setStatus('idle');
      }),
    ];

    return () => unsubs.forEach((u) => u?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  const findMatch = useCallback(() => {
    emit('cards:find_match', {});
    store.setStatus('searching');
  }, [emit]);

  const hit = useCallback(() => emit('cards:hit', {}), [emit]);
  const stand = useCallback(() => emit('cards:stand', {}), [emit]);
  const cancel = useCallback(() => {
    emit('cards:cancel', {});
    store.reset();
  }, [emit]);

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-tg-muted text-xl">←</button>
        <h1 className="text-xl font-bold">{t('cardsTitle')}</h1>
      </div>

      <div className="card mb-4 text-center">
        <p className="text-tg-muted text-sm">{t('pvpInfo')}</p>
      </div>

      {error && (
        <div className="bg-tg-red/20 text-tg-red text-sm rounded-xl p-3 mb-4 text-center">
          {error}
        </div>
      )}

      {store.status === 'idle' && (
        <button onClick={findMatch} disabled={balance < 70} className="btn-green text-lg py-4">
          {t('findMatch')}
        </button>
      )}

      {store.status === 'searching' && (
        <div className="card text-center">
          <div className="text-4xl animate-pulse-slow mb-3">🔍</div>
          <p className="text-tg-gold font-bold">{t('searching')}</p>
          <p className="text-tg-muted text-sm mt-1">{t('bothPay')}</p>
          <button onClick={cancel} className="btn-red mt-4">
            {t('cancel')}
          </button>
        </div>
      )}

      {store.status === 'waiting' && (
        <div className="card text-center">
          <div className="text-4xl animate-pulse-slow mb-3">⏳</div>
          <p className="text-tg-gold font-bold">{t('waitingMatch')}</p>
          <button onClick={cancel} className="btn-red mt-4">
            {t('cancel')}
          </button>
        </div>
      )}

      {(store.status === 'playing' || store.status === 'stood' || store.status === 'finished') && (
        <div className="space-y-4">
          <div className="card">
            <p className="text-tg-muted text-sm mb-2">
              {t('vs')} <span className="text-white font-medium">{store.opponentUsername}</span>
            </p>
            <p className="text-tg-muted text-xs mb-3">
              {t('cardsLeft').replace('{n}', store.cardsInDeck)}
            </p>

            <p className="text-sm text-tg-muted mb-1">
              {t('yourHand').replace('{n}', store.myScore)}
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {store.myHand.map((card, i) => (
                <CardView key={i} card={card} />
              ))}
            </div>

            {resultData?.opponentHand && (
              <div className="mt-4">
                <p className="text-sm text-tg-muted mb-1">
                  {t('opponent')} ({resultData.opponentScore})
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {resultData.opponentHand.map((card, i) => (
                    <CardView key={i} card={card} />
                  ))}
                </div>
              </div>
            )}

            {!resultData?.opponentHand && store.status === 'playing' && (
              <div className="mt-4">
                <p className="text-sm text-tg-muted mb-1">{t('opponent')}</p>
                <div className="flex gap-2 justify-center">
                  <CardView hidden />
                  <CardView hidden />
                </div>
              </div>
            )}
          </div>

          {resultData && (
            <div className={`card text-center ${
              resultData.result === 'win' ? 'border-tg-green' :
              resultData.result === 'push' ? 'border-tg-gold' :
              'border-tg-red'
            } border-2`}>
              <p className={`text-2xl font-black ${
                resultData.result === 'win' ? 'text-tg-green' :
                resultData.result === 'push' ? 'text-tg-gold' :
                'text-tg-red'
              }`}>
                {resultData.result === 'win' ? t('youWin') :
                 resultData.result === 'push' ? t('push') : t('youLose')}
              </p>
              <p className="text-tg-muted mt-1">{resultData.message}</p>
              {resultData.winAmount && (
                <p className="text-tg-gold text-2xl font-bold mt-2">+{resultData.winAmount} ★</p>
              )}
            </div>
          )}

          {store.status === 'playing' && store.myScore < 22 && (
            <div className="flex gap-3">
              <button onClick={hit} className="btn-green flex-1">
                {t('hit')}
              </button>
              <button onClick={stand} className="btn-primary flex-1">
                {t('stand')}
              </button>
            </div>
          )}

          {store.status === 'finished' && (
            <button onClick={() => { store.reset(); setResultData(null); }} className="btn-primary">
              {t('playAgain')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}