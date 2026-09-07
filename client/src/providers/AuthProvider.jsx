import React, { createContext, useContext, useState, useEffect } from 'react';
import { init, backButton, mainButton, themeParams, miniApp } from '@telegram-apps/sdk-react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      init();
      backButton.mount();
      themeParams.mount();
      miniApp.mount();
    } catch (e) {
      console.log('TG SDK init:', e);
    }

    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      setToken(tg.initData);

      fetch(`${import.meta.env.VITE_API_URL || ''}/api/balance`, {
        headers: { Authorization: `tma ${tg.initData}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.balance !== undefined) {
            setBalance(data.balance);
            setUser({
              id: tg.initDataUnsafe?.user?.id,
              username: tg.initDataUnsafe?.user?.username || '',
              firstName: tg.initDataUnsafe?.user?.first_name || '',
            });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const updateBalance = (newBalance) => setBalance(newBalance);

  const refreshBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/balance`, {
        headers: { Authorization: `tma ${token}` },
      });
      const data = await res.json();
      if (data.balance !== undefined) setBalance(data.balance);
    } catch (e) {
      console.error('Refresh balance failed:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, balance, loading, updateBalance, refreshBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
