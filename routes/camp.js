const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const campSchema = new mongoose.Schema({
  campId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true, index: true },
  resources: { coins: { type: Number, default: 0 } },
  upgrades: { type: Map, of: Number, default: {} },
}, { timestamps: true, strict: true });
const Camp = mongoose.models.ChriscoCamp || mongoose.model('ChriscoCamp', campSchema);
const safeKey = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,40}$/.test(value);

router.post('/upgrade', async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Persistent game database is unavailable.' });
  const { campId, ownerId, upgrade } = req.body || {};
  const cost = Number(req.body && req.body.cost);
  if (![campId, ownerId, upgrade].every(safeKey) || !Number.isSafeInteger(cost) || cost < 1) {
    return res.status(400).json({ error: 'Provide campId, ownerId, upgrade, and a positive integer cost.' });
  }
  try {
    const camp = await Camp.findOneAndUpdate(
      { campId, ownerId, 'resources.coins': { $gte: cost } },
      { $inc: { 'resources.coins': -cost, [`upgrades.${upgrade}`]: 1 } },
      { new: true, runValidators: true }
    ).lean();
    if (!camp) return res.status(409).json({ error: 'Camp not found, not owned by this player, or not enough coins.' });
    return res.json({ camp });
  } catch (error) { return next(error); }
});

module.exports = router;
