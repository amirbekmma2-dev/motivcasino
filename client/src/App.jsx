import React, { useState } from 'react';
import { AuthProvider } from './providers/AuthProvider';
import Home from './pages/Home';
import MetaCrash from './pages/MetaCrash';
import Roulette from './pages/Roulette';
import Cards from './pages/Cards';
import Wallet from './pages/Wallet';

const pages = {
  home: Home,
  crash: MetaCrash,
  roulette: Roulette,
  cards: Cards,
  wallet: Wallet,
};

export default function App() {
  const [page, setPage] = useState('home');

  const navigate = (target) => setPage(target);

  const PageComponent = pages[page] || Home;

  return (
    <AuthProvider>
      <PageComponent navigate={navigate} />
    </AuthProvider>
  );
}
