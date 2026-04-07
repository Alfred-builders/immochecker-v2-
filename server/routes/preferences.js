import { Router } from 'express';
import { queryOne } from '../db/index.js';

const router = Router();

// ─── GET /:page — Get user preference for a page ───────────────
router.get('/:page', async (req, res) => {
  const { page } = req.params;

  try {
    const pref = await queryOne(
      `SELECT config FROM imv2_user_preference
       WHERE user_id = $1 AND page = $2`,
      [req.user.userId, page]
    );

    res.json({ config: pref ? pref.config : {} });
  } catch (err) {
    console.error('[Preferences] Get error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /:page — Upsert preference ────────────────────────────
router.put('/:page', async (req, res) => {
  const { page } = req.params;
  const { config } = req.body;

  if (config === undefined || config === null) {
    return res.status(400).json({ error: 'config requis' });
  }

  try {
    const result = await queryOne(
      `INSERT INTO imv2_user_preference (user_id, page, config)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, page) DO UPDATE
       SET config = $3, updated_at = NOW()
       RETURNING id, user_id, page, config, updated_at`,
      [req.user.userId, page, JSON.stringify(config)]
    );

    res.json({ config: result.config });
  } catch (err) {
    console.error('[Preferences] Upsert error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
