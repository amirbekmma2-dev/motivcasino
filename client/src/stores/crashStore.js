import { create } from 'zustand';

export const useCrashStore = create((set) => ({
  status: 'idle',
  gameId: null,
  multiplier: 1.0,
  players: [],
  totalBets: 0,
  myBet: null,
  myCashout: null,
  crashPoint: null,

  setStatus: (status) => set({ status }),
  setGameId: (gameId) => set({ gameId }),
  setMultiplier: (multiplier) => set({ multiplier }),
  setPlayers: (players) => set({ players }),
  setTotalBets: (totalBets) => set({ totalBets }),
  setMyBet: (myBet) => set({ myBet }),
  setMyCashout: (myCashout) => set({ myCashout }),
  setCrashPoint: (crashPoint) => set({ crashPoint }),

  reset: () =>
    set({
      status: 'idle',
      gameId: null,
      multiplier: 1.0,
      players: [],
      totalBets: 0,
      myBet: null,
      myCashout: null,
      crashPoint: null,
    }),
}));
