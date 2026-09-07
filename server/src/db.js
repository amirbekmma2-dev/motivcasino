const Database = require('better-sqlite3');
const { DATABASE_URL } = require('./config');

let db = null;

function getDb() {
  if (db) return db;

  db = new Database(DATABASE_URL);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL DEFAULT '',
      balance INTEGER NOT NULL DEFAULT 0,
      total_won INTEGER NOT NULL DEFAULT 0,
      total_lost INTEGER NOT NULL DEFAULT 0,
      games_played INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('deposit','withdraw','bet','win','fee','refund')),
      amount INTEGER NOT NULL,
      game_type TEXT,
      game_id TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('crash','roulette','cards')),
      status TEXT NOT NULL DEFAULT 'waiting',
      result TEXT,
      total_bets INTEGER NOT NULL DEFAULT 0,
      platform_fee INTEGER NOT NULL DEFAULT 0,
      winner_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      FOREIGN KEY (winner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      bet_amount INTEGER NOT NULL,
      win_amount INTEGER NOT NULL DEFAULT 0,
      cashed_out INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(game_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  `);

  return db;
}

function atomicBalanceOp(userId, amount, type, description, gameType, gameId) {
  const connection = getDb();
  const tx = connection.transaction(() => {
    const user = connection
      .prepare('SELECT id, balance FROM users WHERE id = ?')
      .get(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const newBalance = user.balance + amount;
    if (newBalance < 0) throw new Error('INSUFFICIENT_BALANCE');

    connection
      .prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newBalance, userId);

    connection
      .prepare(
        'INSERT INTO transactions (user_id, type, amount, game_type, game_id, description) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(userId, type, amount, gameType || null, gameId || null, description);

    return { balance: newBalance };
  });

  return tx();
}

function getOrCreateUser(userId, username) {
  const connection = getDb();
  let user = connection.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    connection
      .prepare('INSERT INTO users (id, username, balance) VALUES (?, ?, ?)')
      .run(userId, username || '', 100);
    user = connection.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else if (username && user.username !== username) {
    connection
      .prepare('UPDATE users SET username = ? WHERE id = ?')
      .run(username, userId);
    user.username = username;
  }
  return user;
}

module.exports = { getDb, atomicBalanceOp, getOrCreateUser };
