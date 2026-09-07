const express = require('express');
const { BOT_TOKEN, WEBHOOK_URL } = require('../config');
const { authMiddleware } = require('../auth');
const { getOrCreateUser, getDb } = require('../db');

const router = express.Router();

router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await getOrCreateUser(req.user.id, req.user.username);
    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const user = await getOrCreateUser(req.user.id, req.user.username);
    const stats = db.prepare(
      'SELECT total_won, total_lost, games_played FROM users WHERE id = ?'
    ).get(req.user.id);
    res.json({
      balance: user.balance,
      totalWon: stats.total_won,
      totalLost: stats.total_lost,
      gamesPlayed: stats.games_played,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoice', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const payload = JSON.stringify({
      type: 'deposit',
      user_id: req.user.id,
      amount,
      ts: Date.now(),
    });

    const apiRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${amount} Stars Deposit`,
          description: `Add ${amount} Telegram Stars to your game balance`,
          payload,
          provider_token: '',
          currency: 'XTR',
          prices: [{ label: `${amount} Stars`, amount: amount * 100 }],
          need_name: false,
          need_phone: false,
          need_email: false,
          need_shipping_address: false,
          send_email_to_provider: false,
        }),
      }
    );

    const data = await apiRes.json();
    if (!data.ok) {
      return res.status(400).json({ error: data.description || 'Invoice failed' });
    }

    res.json({ invoiceLink: data.result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook/pre-checkout', async (req, res) => {
  const { pre_checkout_query } = req.body;
  if (!pre_checkout_query) {
    return res.sendStatus(400);
  }

  try {
    const payload = JSON.parse(pre_checkout_query.invoice_payload);
    if (payload.type !== 'deposit' || !payload.user_id || !payload.amount) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: pre_checkout_query.id,
          ok: false,
          error_message: 'Invalid payment',
        }),
      });
      return res.sendStatus(200);
    }

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_checkout_query_id: pre_checkout_query.id,
        ok: true,
      }),
    });
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(200);
  }
});

router.post('/webhook/successful-payment', async (req, res) => {
  const { message } = req.body;
  if (!message?.successful_payment) {
    return res.sendStatus(200);
  }

  const payment = message.successful_payment;
  const userId = message.from?.id;

  if (!userId || !payment.invoice_payload) {
    return res.sendStatus(200);
  }

  try {
    const payload = JSON.parse(payment.invoice_payload);
    if (payload.type !== 'deposit') return res.sendStatus(200);

    const db = await require('../db').getDb();
    const existing = db.prepare(
      'SELECT id FROM transactions WHERE description LIKE ? AND user_id = ?'
    ).get(`%payment:${payment.telegram_payment_charge_id}%`, userId);
    if (existing) return res.sendStatus(200);

    await getOrCreateUser(userId, message.from.username || '');
    await require('../db').atomicBalanceOp(
      userId,
      payload.amount,
      'deposit',
      `Stars deposit: ${payload.amount} (payment:${payment.telegram_payment_charge_id})`,
      null,
      null
    );

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(200);
  }
});

module.exports = router;
