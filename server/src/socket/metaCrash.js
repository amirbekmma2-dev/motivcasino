const { v4: uuidv4 } = require('uuid');
const { GAME } = require('../config');
const { atomicBalanceOp, getDb } = require('../db');

const ROUND_DURATION_MS = 8000;
const BETTING_WINDOW_MS = 10000;

class MetaCrashRoom {
  constructor(io) {
    this.io = io;
    this.namespace = io.of('/crash');
    this.games = new Map();
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
    socket.on('crash:bet', async (data) => this._handleBet(socket, data));
    socket.on('crash:cashout', (data) => this._handleCashout(socket, data));
    socket.on('disconnect', () => {
      if (socket.user && this.queue && this.queue.players.has(socket.user.id)) {
        this.queue.players.delete(socket.user.id);
        this.namespace.emit('crash:player_left', {
          userId: socket.user.id,
          players: this._getPlayersInfo(),
        });
      }
    });
  }

  async _handleBet(socket, data) {
    try {
      const betAmount = parseInt(data?.amount, 10);
      if (!betAmount || betAmount < GAME.CRASH.MIN_BET) {
        return socket.emit('crash:error', {
          message: `Minimum bet: ${GAME.CRASH.MIN_BET} Stars`,
        });
      }

      if (!this.queue || this.queue.status !== 'betting') {
        return socket.emit('crash:error', {
          message: 'Betting is closed. Wait for next round.',
        });
      }

      if (this.queue.players.has(socket.user.id)) {
        return socket.emit('crash:error', {
          message: 'You already placed a bet.',
        });
      }

      const result = await atomicBalanceOp(
        socket.user.id,
        -betAmount,
        'bet',
        `Crash bet: ${betAmount}`,
        'crash',
        this.queue.gameId
      );
      socket.balance = result.balance;

      this.queue.players.set(socket.user.id, {
        userId: socket.user.id,
        username: socket.user.username,
        amount: betAmount,
        cashedOut: false,
        cashOutMultiplier: 0,
      });

      this.queue.totalBets += betAmount;

      socket.emit('crash:bet_confirmed', {
        balance: result.balance,
        amount: betAmount,
      });

      this.namespace.emit('crash:player_joined', {
        players: this._getPlayersInfo(),
        totalBets: this.queue.totalBets,
      });
    } catch (err) {
      socket.emit('crash:error', {
        message: err.message === 'INSUFFICIENT_BALANCE'
          ? 'Insufficient balance'
          : 'Bet failed',
      });
    }
  }

  async _handleCashout(socket, data) {
    if (!this.queue || this.queue.status !== 'running') {
      return socket.emit('crash:error', {
        message: 'Game is not running',
      });
    }

    const player = this.queue.players.get(socket.user.id);
    if (!player || player.cashedOut) {
      return;
    }

    const multiplier = this.queue.currentMultiplier;
    player.cashedOut = true;
    player.cashOutMultiplier = multiplier;

    const winAmount = Math.floor(player.amount * multiplier);
    try {
      const result = await atomicBalanceOp(
        socket.user.id,
        winAmount,
        'win',
        `Crash win: ${winAmount} at ${multiplier.toFixed(2)}x`,
        'crash',
        this.queue.gameId
      );
      socket.balance = result.balance;

      socket.emit('crash:cashout_success', {
        multiplier: parseFloat(multiplier.toFixed(2)),
        winAmount,
        balance: result.balance,
      });

      this.namespace.emit('crash:player_cashout', {
        userId: socket.user.id,
        username: player.username,
        multiplier: parseFloat(multiplier.toFixed(2)),
        winAmount,
      });
    } catch (err) {
      socket.emit('crash:error', { message: 'Cashout failed' });
    }
  }

  _getPlayersInfo() {
    if (!this.queue) return [];
    return Array.from(this.queue.players.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
      amount: p.amount,
      cashedOut: p.cashedOut,
      cashOutMultiplier: p.cashOutMultiplier,
    }));
  }

  generateCrashPoint() {
    const e = 2 ** 32;
    const h = Math.floor(Math.random() * e);
    if (h % 33 === 0) return 1.0;
    const fair = 1 / (1 - h / e);
    return Math.min(6.0, parseFloat(fair.toFixed(2)));
  }

  async startRound() {
    const gameId = uuidv4();
    const db = getDb();
    db.prepare('INSERT INTO games (id, type, status) VALUES (?, ?, ?)')
      .run(gameId, 'crash', 'betting');

    this.queue = {
      gameId,
      status: 'betting',
      totalBets: 0,
      players: new Map(),
      crashPoint: this.generateCrashPoint(),
      currentMultiplier: 1.0,
    };

    this.namespace.emit('crash:round_start', {
      gameId,
      players: [],
      totalBets: 0,
      bettingEndsIn: BETTING_WINDOW_MS,
    });

    setTimeout(async () => {
      if (!this.queue || this.queue.players.size === 0) {
        this.namespace.emit('crash:round_empty', { gameId });
        const db2 = getDb();
        db2.prepare("UPDATE games SET status = 'cancelled' WHERE id = ?").run(gameId);
        this.queue = null;
        setTimeout(() => this.startRound(), 3000);
        return;
      }

      this.queue.status = 'running';
      const db2 = getDb();
      db2.prepare("UPDATE games SET status = 'running' WHERE id = ?").run(gameId);

      this.namespace.emit('crash:game_start', {
        gameId,
        players: this._getPlayersInfo(),
      });

      this._runMultiplier(gameId);
    }, BETTING_WINDOW_MS);
  }

  _runMultiplier(gameId) {
    const startTime = Date.now();
    const crashPoint = this.queue.crashPoint;

    const tick = () => {
      if (!this.queue || this.queue.gameId !== gameId) return;

      const elapsed = Date.now() - startTime;
      this.queue.currentMultiplier = parseFloat(
        (1 + elapsed / 1000).toFixed(2)
      );

      if (this.queue.currentMultiplier >= crashPoint) {
        this._crashRound(gameId);
        return;
      }

      this.namespace.emit('crash:tick', {
        multiplier: this.queue.currentMultiplier,
      });

      setTimeout(tick, 50);
    };

    tick();
  }

  async _crashRound(gameId) {
    this.queue.status = 'crashed';
    const crashPoint = this.queue.crashPoint;

    this.namespace.emit('crash:game_crash', {
      gameId,
      crashPoint,
    });

    const db = getDb();
    const platformFee = Math.floor(this.queue.totalBets * GAME.CRASH.PLATFORM_FEE_PCT / 100);

    db.prepare(
      "UPDATE games SET status = 'finished', result = ?, total_bets = ?, platform_fee = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(crashPoint.toString(), this.queue.totalBets, platformFee, gameId);

    const insertLoserStmt = db.prepare(
      'INSERT INTO game_players (game_id, user_id, bet_amount, win_amount, cashed_out) VALUES (?, ?, ?, 0, 0)'
    );
    const insertWinnerStmt = db.prepare(
      'INSERT INTO game_players (game_id, user_id, bet_amount, win_amount, cashed_out) VALUES (?, ?, ?, ?, 1)'
    );
    const loseStmt = db.prepare(
      "UPDATE users SET total_lost = total_lost + ?, games_played = games_played + 1, updated_at = datetime('now') WHERE id = ?"
    );
    const winStmt = db.prepare(
      "UPDATE users SET total_won = total_won + ?, games_played = games_played + 1, updated_at = datetime('now') WHERE id = ?"
    );

    for (const [, player] of this.queue.players) {
      if (!player.cashedOut) {
        const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(player.userId);
        if (user) {
          insertLoserStmt.run(gameId, player.userId, player.amount);
          loseStmt.run(player.amount, player.userId);
        }
      } else {
        const winAmount = Math.floor(player.amount * player.cashOutMultiplier);
        insertWinnerStmt.run(gameId, player.userId, player.amount, winAmount);
        winStmt.run(winAmount, player.userId);
      }
    }

    const snapshots = this._getPlayersInfo();
    this.queue = null;

    setTimeout(() => this.startRound(), 5000);
  }
}

module.exports = MetaCrashRoom;
