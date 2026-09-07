import React, { useState } from 'react';
import { LangProvider, useLang } from './providers/LangProvider';
import { AuthProvider } from './providers/AuthProvider';
import Home from './pages/Home';
import MetaCrash from './pages/MetaCrash';
import Roulette from './pages/Roulette';
import Cards from './pages/Cards';
import Wallet from './pages/Wallet';
import About from './pages/About';
import LanguageSelect from './pages/LanguageSelect';

export default function App() {
  return (
    <LangProvider>
      <Root />
    </LangProvider>
  );
}

function Root() {
  const { lang, setLang } = useLang();
  const [page, setPage] = useState('home');

  if (!lang || page === 'lang') {
    return (
      <LanguageSelect
        onBack={lang ? () => setPage('home') : null}
        onSelect={(code) => {
          setLang(code);
          setPage('home');
        }}
      />
    );
  }

  const navigate = (target) => setPage(target);
  const PageComponent =
    page === 'home' ? Home
    : page === 'crash' ? MetaCrash
    : page === 'roulette' ? Roulette
    : page === 'cards' ? Cards
    : page === 'wallet' ? Wallet
    : page === 'about' ? About
    : Home;

  return (
    <AuthProvider>
      <PageComponent navigate={navigate} />
    </AuthProvider>
  );
}