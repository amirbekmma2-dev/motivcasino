const { v4: uuidv4 } = require('uuid');
const { GAME } = require('../config');
const { atomicBalanceOp, getDb } = require('../db');

const BETTING_WINDOW_MS = 10000;

const COLORS = {
  red: { multiplier: 2, numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36] },
  black: { multiplier: 2, numbers: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35] },
  green: { multiplier: 14, numbers: [0] },
};

class RouletteRoom {
  constructor(io) {
    this.io = io;
    this.namespace = io.of('/roulette');
    this.queue = null;

    this.namespace.on('connection', (socket) => {
      if (!this._started) {
        this._started = true;
        this.startRound();
      }
      this._onConnection(socket);
    });
  }

  _onConnection(socket) {
    socket.on('roulette:bet', async (data) => this._handleBet(socket, data));
    socket.on('disconnect', () => {
      if (socket.user && this.queue && this.queue.players.has(socket.user.id)) {
        this.queue.players.delete(socket.user.id);
        this.namespace.emit('roulette:player_left', {
          userId: socket.user.id,
          players: this._getPlayersInfo(),
        });
      }
    });
  }

  async _handleBet(socket, data) {
    try {
      const { type, amount: rawAmount } = data || {};
      const betAmount = parseInt(rawAmount, 10);

      if (!betAmount || betAmount < GAME.ROULETTE.MIN_BET) {
        return socket.emit('roulette:error', {
          message: `Minimum bet: ${GAME.ROULETTE.MIN_BET} Stars`,
        });
      }

      if (!['red', 'black', 'green'].includes(type)) {
        return socket.emit('roulette:error', { message: 'Invalid bet type' });
      }

      if (!this.queue || this.queue.status !== 'betting') {
        return socket.emit('roulette:error', {
          message: 'Betting is closed. Wait for next round.',
        });
      }

      if (this.queue.players.has(socket.user.id)) {
        return socket.emit('roulette:error', {
          message: 'You already placed a bet.',
        });
      }

      const result = await atomicBalanceOp(
        socket.user.id,
        -betAmount,
        'bet',
        `Roulette bet (${type}): ${betAmount}`,
        'roulette',
        this.queue.gameId
      );
      socket.balance = result.balance;

      this.queue.players.set(socket.user.id, {
        userId: socket.user.id,
        username: socket.user.username,
        betType: type,
        amount: betAmount,
      });

      this.queue.totalBets += betAmount;

      socket.emit('roulette:bet_confirmed', {
        balance: result.balance,
        betType: type,
        amount: betAmount,
      });

      this.namespace.emit('roulette:player_joined', {
        players: this._getPlayersInfo(),
        totalBets: this.queue.totalBets,
      });
    } catch (err) {
      socket.emit('roulette:error', {
        message: err.message === 'INSUFFICIENT_BALANCE'
          ? 'Insufficient balance'
          : 'Bet failed',
      });
    }
  }

  _getPlayersInfo() {
    if (!this.queue) return [];
    return Array.from(this.queue.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      betType: p.betType,
      amount: p.amount,
    }));
  }

  async startRound() {
    const gameId = uuidv4();
    const db = getDb();
    db.prepare('INSERT INTO games (id, type, status) VALUES (?, ?, ?)')
      .run(gameId, 'roulette', 'betting');

    this.queue = {
      gameId,
      status: 'betting',
      totalBets: 0,
      players: new Map(),
      result: null,
    };

    this.namespace.emit('roulette:round_start', {
      gameId,
      players: [],
      totalBets: 0,
      bettingEndsIn: BETTING_WINDOW_MS,
    });

    setTimeout(async () => {
      if (!this.queue || this.queue.players.size === 0) {
        this.namespace.emit('roulette:round_empty', { gameId });
        const db2 = getDb();
        db2.prepare("UPDATE games SET status = 'cancelled' WHERE id = ?").run(gameId);
        this.queue = null;
        setTimeout(() => this.startRound(), 3000);
        return;
      }

      this.queue.status = 'spinning';
      this.namespace.emit('roulette:spinning', { gameId });

      const spinResult = Math.floor(Math.random() * 37);
      let resultColor = 'green';
      if (COLORS.red.numbers.includes(spinResult)) resultColor = 'red';
      else if (COLORS.black.numbers.includes(spinResult)) resultColor = 'black';

      setTimeout(async () => {
        if (!this.queue) return;
        this.queue.result = { number: spinResult, color: resultColor };

        await this._resolveBets(gameId, spinResult, resultColor);
      }, 4000);
    }, BETTING_WINDOW_MS);
  }

  async _resolveBets(gameId, resultNumber, resultColor) {
    const db = getDb();
    let totalPlatformFee = 0;
    let totalPaid = 0;

    const winStatsStmt = db.prepare(
      "UPDATE users SET total_won = total_won + ?, games_played = games_played + 1, updated_at = datetime('now') WHERE id = ?"
    );
    const loseStatsStmt = db.prepare(
      "UPDATE users SET total_lost = total_lost + ?, games_played = games_played + 1, updated_at = datetime('now') WHERE id = ?"
    );
    const insertPlayerStmt = db.prepare(
      'INSERT INTO game_players (game_id, user_id, bet_amount, win_amount, cashed_out) VALUES (?, ?, ?, ?, ?)'
    );

    for (const [, player] of this.queue.players) {
      const won = player.betType === resultColor;
      if (won) {
        const multiplier = COLORS[resultColor].multiplier;
        const winAmount = player.amount * multiplier;
        const fee = Math.floor(winAmount * GAME.ROULETTE.PLATFORM_FEE_PCT / 100);
        const netWin = winAmount - fee;

        totalPlatformFee += fee;
        totalPaid += netWin;

        try {
          const result = await atomicBalanceOp(
            player.userId,
            netWin,
            'win',
            `Roulette win (${resultColor} ${resultNumber}): ${netWin}`,
            'roulette',
            gameId
          );

          const sock = this._findSocket(player.userId);
          if (sock) sock.balance = result.balance;

          winStatsStmt.run(netWin, player.userId);
        } catch (err) {
          console.error('Roulette payout failed:', err);
        }
      } else {
        loseStatsStmt.run(player.amount, player.userId);
      }

      insertPlayerStmt.run(
        gameId,
        player.userId,
        player.amount,
        won ? (player.amount * COLORS[resultColor].multiplier) : 0,
        won ? 1 : 0
      );
    }

    const db2 = getDb();
    db2.prepare(
      "UPDATE games SET status = 'finished', result = ?, total_bets = ?, platform_fee = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(
      JSON.stringify({ number: resultNumber, color: resultColor }),
      this.queue.totalBets,
      totalPlatformFee,
      gameId
    );

    this.namespace.emit('roulette:result', {
      gameId,
      number: resultNumber,
      color: resultColor,
      players: this._getPlayersInfo(),
      winners: Array.from(this.queue.players.values())
        .filter((p) => p.betType === resultColor)
        .map((p) => ({
          userId: p.userId,
          username: p.username,
          winAmount: p.amount * COLORS[resultColor].multiplier - Math.floor(p.amount * COLORS[resultColor].multiplier * GAME.ROULETTE.PLATFORM_FEE_PCT / 100),
        })),
    });

    this.queue = null;
    setTimeout(() => this.startRound(), 5000);
  }

  _findSocket(userId) {
    for (const [, socket] of this.io.of('/roulette').sockets) {
      if (socket.user?.id === userId) return socket;
    }
    return null;
  }
}

module.exports = RouletteRoom;
