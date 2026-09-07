import React, { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';

const AMOUNTS = [50, 100, 200, 500, 1000];

export default function Wallet({ navigate }) {
  const { balance, refreshBalance, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(100);

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

  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-6 flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-tg-muted text-xl">←</button>
        <h1 className="text-xl font-bold">Wallet</h1>
      </div>

      <div className="card text-center mb-6">
        <p className="text-tg-muted text-sm">Your Balance</p>
        <p className="text-4xl font-black text-tg-gold mt-1">{balance} ★</p>
        <button onClick={refreshBalance} className="text-tg-accent text-sm mt-2 underline">
          Refresh
        </button>
      </div>

      <div className="card mb-4">
        <p className="text-tg-muted text-sm mb-3">Select amount to deposit</p>
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
        {loading ? 'Processing...' : `Deposit ${selected} Stars`}
      </button>

      <div className="card mt-6">
        <h3 className="font-bold mb-2">How it works</h3>
        <ul className="text-tg-muted text-sm space-y-1">
          <li>1. Select an amount above</li>
          <li>2. Pay with Telegram Stars</li>
          <li>3. Stars are instantly credited to your balance</li>
          <li>4. Use them to play games</li>
        </ul>
      </div>
    </div>
  );
}
