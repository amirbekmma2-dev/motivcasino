import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { STRINGS } from '../i18n';

const LangContext = createContext(null);

export function useLang() {
  return useContext(LangContext);
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('mc_lang') || null);

  const setLang = useCallback((code) => {
    localStorage.setItem('mc_lang', code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key,
    [lang]
  );

  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}