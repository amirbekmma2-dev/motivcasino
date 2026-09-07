import { create } from 'zustand';

export const useCardsStore = create((set) => ({
  status: 'idle',
  duelId: null,
  myHand: [],
  myScore: 0,
  opponentUsername: '',
  cardsInDeck: 0,
  result: null,

  setStatus: (status) => set({ status }),
  setDuelId: (duelId) => set({ duelId }),
  setMyHand: (myHand) => set({ myHand }),
  setMyScore: (myScore) => set({ myScore }),
  setOpponentUsername: (opponentUsername) => set({ opponentUsername }),
  setCardsInDeck: (cardsInDeck) => set({ cardsInDeck }),
  setResult: (result) => set({ result }),

  reset: () =>
    set({
      status: 'idle',
      duelId: null,
      myHand: [],
      myScore: 0,
      opponentUsername: '',
      cardsInDeck: 0,
      result: null,
    }),
}));
