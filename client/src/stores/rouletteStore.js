import { create } from 'zustand';

export const useRouletteStore = create((set) => ({
  status: 'idle',
  gameId: null,
  players: [],
  totalBets: 0,
  myBet: null,
  lastResult: null,

  setStatus: (status) => set({ status }),
  setGameId: (gameId) => set({ gameId }),
  setPlayers: (players) => set({ players }),
  setTotalBets: (totalBets) => set({ totalBets }),
  setMyBet: (myBet) => set({ myBet }),
  setLastResult: (lastResult) => set({ lastResult }),

  reset: () =>
    set({
      status: 'idle',
      gameId: null,
      players: [],
      totalBets: 0,
      myBet: null,
      lastResult: null,
    }),
}));
