import React, { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useLang } from '../providers/LangProvider';

const AMOUNTS = [50, 100, 200, 500, 1000];

export default function Wallet({ navigate }) {
  const { balance, refreshBalance, token } = useAuth();
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(100);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [notice, setNotice] = useState('');

  const MIN_WITHDRAW = 500;

  const handleTopUp = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${token}`,
        },
        body: JSON.stringify({ amount: selected }),
      });
      const data = await res.json();
      if (data.invoiceLink) {
        window.Telegram?.WebApp?.openInvoice(data.invoiceLink, async (status) => {
          if (status === 'paid' || status === 'cancelled') {
            setTimeout(() => refreshBalance(), 2000);
          }
        });
      }
    } catch (err) {
      console.error('Invoice error:', err);
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!token || !withdrawAmount) return;
    const amount = Math.floor(Number(withdrawAmount));
    if (!Number.isInteger(amount) || amount < MIN_WITHDRAW) {
      setNotice(t('errMinWithdraw').replace('{n}', String(MIN_WITHDRAW)));
      return;
    }
    setWithdrawing(true);
    setNotice('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `tma ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.balance !== undefined) {
        setNotice(t('withdrawOk'));
        setWithdrawAmount('');
        refreshBalance();
      } else {
        setNotice(data.error || t('errGeneric'));
      }
    } catch (err) {
      setNotice(t('errGeneric'));
    }
    setWithdrawing(false);
  };

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-tg-muted text-xl">←</button>
        <h1 className="text-xl font-bold">{t('walletTitle')}</h1>
      </div>

      <div className="card text-center mb-6">
        <p className="text-tg-muted text-sm">{t('yourBalance')}</p>
        <p className="text-4xl font-black text-tg-gold mt-1">{balance} ★</p>
        <button onClick={refreshBalance} className="text-tg-accent text-sm mt-2 underline">
          {t('refresh')}
        </button>
      </div>

      <div className="card mb-4">
        <p className="text-tg-muted text-sm mb-3">{t('selectAmount')}</p>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setSelected(a)}
              className={`py-3 rounded-xl font-bold text-lg transition-all ${
                selected === a
                  ? 'bg-tg-gold text-tg-bg'
                  : 'bg-gray-700 text-tg-muted'
              }`}
            >
              {a}★
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleTopUp} disabled={loading} className="btn-green text-lg py-4">
        {loading ? t('processing') : t('depositStars').replace('{n}', String(selected))}
      </button>

      <div className="card mt-6">
        <h3 className="font-bold mb-1">{t('withdrawTitle')}</h3>
        <p className="text-tg-muted text-sm mb-3">{t('minWithdraw').replace('{n}', String(MIN_WITHDRAW))}</p>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_WITHDRAW}
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder={t('withdrawAmount')}
          className="w-full p-3 rounded-xl bg-gray-700 text-tg-text mb-3"
        />
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="btn-green text-lg py-3 w-full"
        >
          {withdrawing
            ? t('processing')
            : t('withdrawBtn').replace('{n}', withdrawAmount || String(MIN_WITHDRAW))}
        </button>
        {notice && <p className="text-tg-gold text-sm mt-3 text-center">{notice}</p>}
      </div>

      <div className="card mt-6">
        <h3 className="font-bold mb-2">{t('howItWorks')}</h3>
        <ul className="text-tg-muted text-sm space-y-1">
          <li>{t('hw1')}</li>
          <li>{t('hw2')}</li>
          <li>{t('hw3')}</li>
          <li>{t('hw4')}</li>
        </ul>
      </div>
    </div>
  );
}