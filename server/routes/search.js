import { Router } from 'express';
import { queryAll } from '../db/index.js';

const router = Router();

// ─── GET /search?q=... — Global cross-entity search ──────────────────────
router.get('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { q } = req.query;

    if (!q || String(q).trim().length < 2) {
      return res.json({ batiments: [], lots: [], tiers: [], missions: [] });
    }

    const search = `%${String(q).trim()}%`;

    const [batiments, lots, tiers, missions] = await Promise.all([
      // Batiments
      queryAll(
        `SELECT b.id, b.designation, b.type_batiment AS type,
                a.rue, a.code_postal, a.ville,
                (SELECT COUNT(*) FROM imv2_lot l WHERE l.batiment_id = b.id AND l.est_archive = false) AS nb_lots
         FROM imv2_batiment b
         LEFT JOIN imv2_adresse_batiment a ON a.batiment_id = b.id AND a.type = 'principale'
         WHERE b.workspace_id = $1 AND b.est_archive = false
           AND (b.designation ILIKE $2 OR a.rue ILIKE $2 OR a.ville ILIKE $2 OR a.code_postal ILIKE $2)
         ORDER BY b.designation
         LIMIT 5`,
        [wsId, search],
      ),

      // Lots
      queryAll(
        `SELECT l.id, l.designation, l.type_bien,
                b.designation AS batiment_designation,
                a.rue, a.code_postal, a.ville
         FROM imv2_lot l
         INNER JOIN imv2_batiment b ON b.id = l.batiment_id
         LEFT JOIN imv2_adresse_batiment a ON a.batiment_id = b.id AND a.type = 'principale'
         WHERE l.workspace_id = $1 AND l.est_archive = false
           AND (l.designation ILIKE $2 OR l.reference_interne ILIKE $2 OR a.rue ILIKE $2 OR a.ville ILIKE $2)
         ORDER BY l.designation
         LIMIT 5`,
        [wsId, search],
      ),

      // Tiers
      queryAll(
        `SELECT t.id, t.type,
                CASE WHEN t.type = 'morale' THEN t.raison_sociale
                     ELSE CONCAT(t.prenom, ' ', t.nom) END AS nom_complet,
                t.email, t.telephone
         FROM imv2_tiers t
         WHERE t.workspace_id = $1 AND t.est_archive = false
           AND (t.nom ILIKE $2 OR t.prenom ILIKE $2 OR t.raison_sociale ILIKE $2 OR t.email ILIKE $2)
         ORDER BY nom_complet
         LIMIT 5`,
        [wsId, search],
      ),

      // Missions
      queryAll(
        `SELECT m.id, m.reference, m.statut, m.date_debut,
                l.designation AS lot_designation,
                b.designation AS batiment_designation
         FROM imv2_mission m
         INNER JOIN imv2_lot l ON l.id = m.lot_id
         INNER JOIN imv2_batiment b ON b.id = l.batiment_id
         WHERE m.workspace_id = $1 AND m.est_archive = false
           AND (m.reference ILIKE $2 OR l.designation ILIKE $2 OR b.designation ILIKE $2)
         ORDER BY m.date_debut DESC NULLS LAST
         LIMIT 5`,
        [wsId, search],
      ),
    ]);

    res.json({ batiments, lots, tiers, missions });
  } catch (err) {
    console.error('[search] GET /', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
