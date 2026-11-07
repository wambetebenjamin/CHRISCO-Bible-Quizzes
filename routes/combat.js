const express = require('express');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const router = express.Router();

const pursuitSchema = new mongoose.Schema({
  actionId: { type: String, required: true, unique: true },
  campId: { type: String, required: true, index: true },
  playerId: { type: String, required: true },
  targetId: { type: String, required: true },
  strength: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['started'], default: 'started' },
}, { timestamps: true, strict: true });
const Pursuit = mongoose.models.ChriscoPursuit || mongoose.model('ChriscoPursuit', pursuitSchema);
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);

router.post('/pursue', async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Persistent game database is unavailable.' });
  const { campId, playerId, targetId } = req.body || {};
  const strength = Number(req.body && req.body.strength);
  if (![campId, playerId, targetId].every(safeId) || !Number.isSafeInteger(strength) || strength < 1) {
    return res.status(400).json({ error: 'Provide campId, playerId, targetId, and a positive integer strength.' });
  }
  try {
    const action = await Pursuit.create({ actionId: randomUUID(), campId, playerId, targetId, strength });
    return res.status(201).json({ actionId: action.actionId, status: action.status, createdAt: action.createdAt });
  } catch (error) { return next(error); }
});

module.exports = router;
