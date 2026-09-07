const { v4: uuidv4 } = require('uuid');
const { GAME } = require('../config');
const { atomicBalanceOp, getDb } = require('../db');

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank, 10);
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

class CardsRoom {
  constructor(io) {
    this.io = io;
    this.namespace = io.of('/cards');
    this.duels = new Map();

    this.namespace.on('connection', (socket) => {
      this._onConnection(socket);
    });
  }

  _onConnection(socket) {
    socket.on('cards:find_match', () => this._handleFindMatch(socket));
    socket.on('cards:hit', () => this._handleHit(socket));
    socket.on('cards:stand', () => this._handleStand(socket));
    socket.on('cards:cancel', () => this._handleCancel(socket));
    socket.on('disconnect', () => this._handleDisconnect(socket));
  }

  async _handleFindMatch(socket) {
    const BET = GAME.CARDS.BET;

    let waiting = null;
    for (const [, duels] of this.namespace.sockets) {
      for (const [id, d] of this.duels) {
        if (d.status === 'waiting' && !d.player2 && d.player1.userId !== socket.user.id) {
          waiting = { id, duel: d };
          break;
        }
      }
      if (waiting) break;
    }

    if (waiting) {
      try {
        const result = await atomicBalanceOp(
          socket.user.id,
          -BET,
          'bet',
          `Cards duel bet: ${BET}`,
          'cards',
          waiting.id
        );
        socket.balance = result.balance;

        waiting.duel.player2 = {
          socketId: socket.id,
          userId: socket.user.id,
          username: socket.user.username,
          hand: [],
          score: 0,
          stood: false,
        };
        waiting.duel.status = 'playing';
        waiting.duel.deck = createDeck();
        waiting.duel.dbGameId = uuidv4();

        const db = getDb();
        db.prepare(
          'INSERT INTO games (id, type, status, total_bets, platform_fee) VALUES (?, ?, ?, ?, ?)'
        ).run(
          waiting.duel.dbGameId,
          'cards',
          'playing',
          BET * 2,
          Math.floor(BET * 2 * GAME.CARDS.PLATFORM_FEE_PCT / 100)
        );
        db.prepare('INSERT INTO game_players (game_id, user_id, bet_amount) VALUES (?, ?, ?)')
          .run(waiting.duel.dbGameId, waiting.duel.player1.userId, BET);
        db.prepare('INSERT INTO game_players (game_id, user_id, bet_amount) VALUES (?, ?, ?)')
          .run(waiting.duel.dbGameId, socket.user.id, BET);

        this._dealInitialCards(waiting.id);
      } catch (err) {
        socket.emit('cards:error', {
          message: err.message === 'INSUFFICIENT_BALANCE'
            ? 'Insufficient balance'
            : 'Failed to join match',
        });
      }
    } else {
      const duelId = uuidv4();
      try {
        const result = await atomicBalanceOp(
          socket.user.id,
          -BET,
          'bet',
          `Cards duel bet (waiting): ${BET}`,
          'cards',
          duelId
        );
        socket.balance = result.balance;

        this.duels.set(duelId, {
          status: 'waiting',
          player1: {
            socketId: socket.id,
            userId: socket.user.id,
            username: socket.user.username,
            hand: [],
            score: 0,
            stood: false,
          },
          player2: null,
          deck: [],
          dbGameId: null,
        });

        socket.emit('cards:waiting', { duelId, balance: result.balance });
      } catch (err) {
        socket.emit('cards:error', {
          message: err.message === 'INSUFFICIENT_BALANCE'
            ? 'Insufficient balance'
            : 'Failed to create match',
        });
      }
    }
  }

  _dealInitialCards(duelId) {
    const duel = this.duels.get(duelId);
    if (!duel || duel.status !== 'playing') return;

    duel.deck = createDeck();

    duel.player1.hand = [duel.deck.pop(), duel.deck.pop()];
    duel.player2.hand = [duel.deck.pop(), duel.deck.pop()];
    duel.player1.score = handValue(duel.player1.hand);
    duel.player2.score = handValue(duel.player2.hand);

    const s1 = this.namespace.sockets.get(duel.player1.socketId);
    const s2 = this.namespace.sockets.get(duel.player2.socketId);

    if (s1) s1.emit('cards:game_start', {
      duelId,
      yourHand: duel.player1.hand,
      yourScore: duel.player1.score,
      opponentUsername: duel.player2.username,
      cardsInDeck: duel.deck.length,
    });
    if (s2) s2.emit('cards:game_start', {
      duelId,
      yourHand: duel.player2.hand,
      yourScore: duel.player2.score,
      opponentUsername: duel.player1.username,
      cardsInDeck: duel.deck.length,
    });
  }

  _getPlayer(duel, socketId) {
    if (duel.player1.socketId === socketId) return { player: duel.player1, opponent: duel.player2, key: 'player1' };
    if (duel.player2?.socketId === socketId) return { player: duel.player2, opponent: duel.player1, key: 'player2' };
    return null;
  }

  async _handleHit(socket) {
    for (const [duelId, duel] of this.duels) {
      if (duel.status !== 'playing') continue;
      const info = this._getPlayer(duel, socket.id);
      if (!info || info.player.stood) continue;

      if (duel.deck.length === 0) continue;

      info.player.hand.push(duel.deck.pop());
      info.player.score = handValue(info.player.hand);

      socket.emit('cards:hit_result', {
        card: info.player.hand[info.player.hand.length - 1],
        newScore: info.player.score,
        cardsInDeck: duel.deck.length,
      });

      if (info.player.score > 21) {
        socket.emit('cards:bust', { score: info.player.score });
        await this._resolveDuel(duelId, info.opponent, info.player, 'bust');
      } else if (info.player.score === 21) {
        info.player.stood = true;
        await this._checkBothStood(duelId);
      }
      return;
    }
  }

  async _handleStand(socket) {
    for (const [duelId, duel] of this.duels) {
      if (duel.status !== 'playing') continue;
      const info = this._getPlayer(duel, socket.id);
      if (!info || info.player.stood) continue;

      info.player.stood = true;
      socket.emit('cards:stood');

      await this._checkBothStood(duelId);
      return;
    }
  }

  async _checkBothStood(duelId) {
    const duel = this.duels.get(duelId);
    if (!duel || duel.status !== 'playing') return;
    if (!duel.player1.stood || !duel.player2?.stood) return;

    const s1 = this.namespace.sockets.get(duel.player1.socketId);
    const s2 = this.namespace.sockets.get(duel.player2.socketId);

    const p1Score = duel.player1.score;
    const p2Score = duel.player2.score;

    let winner, loser;
    if (p1Score > p2Score) {
      winner = duel.player1;
      loser = duel.player2;
    } else if (p2Score > p1Score) {
      winner = duel.player2;
      loser = duel.player1;
    } else {
      await this._resolveDuel(duelId, null, null, 'push');
      return;
    }

    if (s1) s1.emit('cards:reveal', {
      opponentHand: duel.player2.hand,
      opponentScore: p2Score,
    });
    if (s2) s2.emit('cards:reveal', {
      opponentHand: duel.player1.hand,
      opponentScore: p1Score,
    });

    await this._resolveDuel(duelId, winner, loser, 'higher');
  }

  async _resolveDuel(duelId, winner, loser, reason) {
    const duel = this.duels.get(duelId);
    if (!duel) return;
    duel.status = 'finished';

    const s1 = this.namespace.sockets.get(duel.player1.socketId);
    const s2 = this.namespace.sockets.get(duel.player2.socketId);
    const allSockets = [s1, s2].filter(Boolean);

    const BET = GAME.CARDS.BET;
    const totalPot = BET * 2;
    const platformFee = Math.floor(totalPot * GAME.CARDS.PLATFORM_FEE_PCT / 100);
    const winnerPayout = totalPot - platformFee;

    const db = await getDb();

    if (reason === 'push') {
      for (const sock of allSockets) {
        try {
          const refund = await atomicBalanceOp(
            sock.user.id,
            BET,
            'refund',
            'Cards duel refund: push',
            'cards',
            duelId
          );
          sock.balance = refund.balance;
          sock.emit('cards:result', {
            result: 'push',
            message: 'Draw! Both players refunded.',
            balance: refund.balance,
          });
        } catch (err) {
          console.error('Push refund failed:', err);
        }
      }

      db.prepare(
        "UPDATE games SET status = 'finished', result = 'push', finished_at = datetime('now') WHERE id = ?"
      ).run(duel.dbGameId);
    } else {
      const wSock = allSockets.find((s) => s.user.id === winner.userId);
      const lSock = allSockets.find((s) => s.user.id === loser.userId);

      try {
        const wResult = await atomicBalanceOp(
          winner.userId,
          winnerPayout,
          'win',
          `Cards duel win: ${winnerPayout}`,
          'cards',
          duelId
        );
        if (wSock) wSock.balance = wResult.balance;
      } catch (err) {
        console.error('Card win payout failed:', err);
      }

      db.prepare(
        "UPDATE users SET total_won = total_won + ?, games_played = games_played + 1, updated_at = datetime('now') WHERE id = ?"
      ).run(winnerPayout, winner.userId);
      db.prepare(
        "UPDATE users SET total_lost = total_lost + ?, games_played = games_played + 1, updated_at = datetime('now') WHERE id = ?"
      ).run(BET, loser.userId);

      db.prepare(
        "UPDATE games SET status = 'finished', result = ?, winner_id = ?, platform_fee = ?, finished_at = datetime('now') WHERE id = ?"
      ).run(reason, winner.userId, platformFee, duel.dbGameId);

      if (wSock) {
        wSock.emit('cards:result', {
          result: 'win',
          message: `You won! +${winnerPayout} Stars`,
          winAmount: winnerPayout,
          balance: wSock.balance,
          opponentHand: loser.hand,
          opponentScore: loser.score,
        });
      }
      if (lSock) {
        lSock.emit('cards:result', {
          result: 'lose',
          message: reason === 'bust'
            ? `Bust! You went over 21. -${BET} Stars`
            : `You lost. -${BET} Stars`,
          balance: lSock.balance,
          opponentHand: winner.hand,
          opponentScore: winner.score,
        });
      }
    }

    this.duels.delete(duelId);
  }

  async _handleCancel(socket) {
    for (const [duelId, duel] of this.duels) {
      if (duel.status === 'waiting' && duel.player1.userId === socket.user.id) {
        try {
          const result = await atomicBalanceOp(
            socket.user.id,
            GAME.CARDS.BET,
            'refund',
            'Cards duel refund: cancelled',
            'cards',
            duelId
          );
          socket.balance = result.balance;
          socket.emit('cards:cancelled', { balance: result.balance });
        } catch (err) {
          console.error('Cancel refund failed:', err);
        }
        this.duels.delete(duelId);
        return;
      }
    }
  }

  async _handleDisconnect(socket) {
    if (!socket.user) return;
    for (const [duelId, duel] of this.duels) {
      if (duel.status === 'waiting' && duel.player1.userId === socket.user.id) {
        this.duels.delete(duelId);
        continue;
      }

      if (duel.status === 'playing') {
        const info = this._getPlayer(duel, socket.id);
        if (info) {
          await this._resolveDuel(duelId, info.opponent, info.player, 'disconnect');
        }
      }
    }
  }
}

module.exports = CardsRoom;
