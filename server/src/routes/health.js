const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
