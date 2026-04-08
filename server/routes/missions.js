import { Router } from 'express';
import { query, queryOne, queryAll, getClient } from '../db/index.js';

const router = Router();

// ─── Helper: generate reference M-YYYY-XXXX ──────────────────────────────
async function generateReference() {
  const year = new Date().getFullYear();
  const res = await queryOne(
    `SELECT nextval('imv2_mission_seq') AS seq`,
  );
  const seq = String(res.seq).padStart(4, '0');
  return `M-${year}-${seq}`;
}

// ─── Helper: mission with relations ──────────────────────────────────────
async function enrichMission(mission, wsId) {
  const techniciens = await queryAll(
    `SELECT mt.id, mt.statut_invitation, mt.user_id,
            u.nom, u.prenom, u.email, u.avatar_color
     FROM imv2_mission_technicien mt
     INNER JOIN imv2_utilisateur u ON u.id = mt.user_id
     WHERE mt.mission_id = $1`,
    [mission.id],
  );

  const lot = await queryOne(
    `SELECT l.id, l.designation, l.type_bien, l.reference_interne,
            b.id AS batiment_id, b.designation AS batiment_designation,
            a.rue, a.code_postal, a.ville, a.latitude, a.longitude
     FROM imv2_lot l
     INNER JOIN imv2_batiment b ON b.id = l.batiment_id
     LEFT JOIN imv2_adresse_batiment a ON a.batiment_id = b.id AND a.type = 'principale'
     WHERE l.id = $1`,
    [mission.lot_id],
  );

  return { ...mission, techniciens, lot };
}

// ─── GET / — List missions ────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      search, statut, technicien_id,
      date_from, date_to, lot_id,
      archived = 'false',
      cursor, limit: rawLimit,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 50, 1), 100);
    const isArchived = archived === 'true';

    const conditions = ['m.workspace_id = $1', 'm.est_archive = $2'];
    const params = [wsId, isArchived];
    let idx = 3;

    if (statut) {
      conditions.push(`m.statut = $${idx}`);
      params.push(statut);
      idx++;
    }

    if (search) {
      conditions.push(
        `(m.reference ILIKE $${idx} OR m.titre ILIKE $${idx} OR l.designation ILIKE $${idx})`,
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (date_from) {
      conditions.push(`m.date_debut >= $${idx}`);
      params.push(date_from);
      idx++;
    }

    if (date_to) {
      conditions.push(`m.date_debut <= $${idx}`);
      params.push(date_to);
      idx++;
    }

    if (lot_id) {
      conditions.push(`m.lot_id = $${idx}`);
      params.push(lot_id);
      idx++;
    }

    if (technicien_id) {
      conditions.push(
        `EXISTS(SELECT 1 FROM imv2_mission_technicien mt WHERE mt.mission_id = m.id AND mt.user_id = $${idx})`,
      );
      params.push(technicien_id);
      idx++;
    }

    if (cursor) {
      conditions.push(`m.created_at < (SELECT created_at FROM imv2_mission WHERE id = $${idx})`);
      params.push(cursor);
      idx++;
    }

    const sql = `
      SELECT m.*,
             l.designation AS lot_designation,
             l.type_bien AS lot_type_bien,
             b.designation AS batiment_designation,
             a.rue, a.code_postal, a.ville, a.latitude, a.longitude,
             (SELECT COUNT(*) FROM imv2_mission_technicien mt WHERE mt.mission_id = m.id) AS nb_techniciens,
             (SELECT json_agg(json_build_object(
               'id', u.id, 'nom', u.nom, 'prenom', u.prenom, 'avatar_color', u.avatar_color
             ))
              FROM imv2_mission_technicien mt2
              INNER JOIN imv2_utilisateur u ON u.id = mt2.user_id
              WHERE mt2.mission_id = m.id) AS techniciens
      FROM imv2_mission m
      INNER JOIN imv2_lot l ON l.id = m.lot_id
      INNER JOIN imv2_batiment b ON b.id = l.batiment_id
      LEFT JOIN imv2_adresse_batiment a ON a.batiment_id = b.id AND a.type = 'principale'
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.date_debut ASC NULLS LAST, m.created_at DESC
      LIMIT $${idx}
    `;
    params.push(limit + 1);

    const rows = await queryAll(sql, params);
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    res.json({
      data,
      meta: {
        cursor: hasMore ? data[data.length - 1].id : null,
        has_more: hasMore,
        total: data.length,
      },
    });
  } catch (err) {
    console.error('[missions] GET /', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /stats — Dashboard stats ────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const [totals, byStatut, upcoming, overdue] = await Promise.all([
      queryOne(
        `SELECT
           COUNT(*) FILTER (WHERE est_archive = false) AS total,
           COUNT(*) FILTER (WHERE statut = 'planifiee' AND est_archive = false) AS planifiees,
           COUNT(*) FILTER (WHERE statut = 'assignee' AND est_archive = false) AS assignees,
           COUNT(*) FILTER (WHERE statut = 'terminee') AS terminees,
           COUNT(*) FILTER (WHERE statut = 'annulee') AS annulees
         FROM imv2_mission WHERE workspace_id = $1`,
        [wsId],
      ),
      queryAll(
        `SELECT statut, COUNT(*) AS count
         FROM imv2_mission
         WHERE workspace_id = $1 AND est_archive = false
         GROUP BY statut`,
        [wsId],
      ),
      queryAll(
        `SELECT m.id, m.reference, m.titre, m.statut, m.date_debut, m.heure_debut,
                l.designation AS lot_designation,
                b.designation AS batiment_designation,
                a.ville
         FROM imv2_mission m
         INNER JOIN imv2_lot l ON l.id = m.lot_id
         INNER JOIN imv2_batiment b ON b.id = l.batiment_id
         LEFT JOIN imv2_adresse_batiment a ON a.batiment_id = b.id AND a.type = 'principale'
         WHERE m.workspace_id = $1 AND m.est_archive = false
           AND m.statut IN ('planifiee', 'assignee')
           AND m.date_debut >= CURRENT_DATE
         ORDER BY m.date_debut ASC, m.heure_debut ASC
         LIMIT 5`,
        [wsId],
      ),
      queryOne(
        `SELECT COUNT(*) AS count
         FROM imv2_mission
         WHERE workspace_id = $1 AND est_archive = false
           AND statut IN ('planifiee', 'assignee')
           AND date_debut < CURRENT_DATE`,
        [wsId],
      ),
    ]);

    res.json({
      ...totals,
      by_statut: byStatut,
      upcoming,
      overdue: parseInt(overdue?.count ?? '0', 10),
    });
  } catch (err) {
    console.error('[missions] GET /stats', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /:id — Detail ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;

    const mission = await queryOne(
      `SELECT m.*,
              l.designation AS lot_designation, l.type_bien AS lot_type_bien, l.reference_interne AS lot_ref,
              b.id AS batiment_id, b.designation AS batiment_designation,
              a.rue, a.code_postal, a.ville, a.latitude, a.longitude
       FROM imv2_mission m
       INNER JOIN imv2_lot l ON l.id = m.lot_id
       INNER JOIN imv2_batiment b ON b.id = l.batiment_id
       LEFT JOIN imv2_adresse_batiment a ON a.batiment_id = b.id AND a.type = 'principale'
       WHERE m.id = $1 AND m.workspace_id = $2`,
      [id, wsId],
    );

    if (!mission) return res.status(404).json({ error: 'Mission introuvable' });

    const enriched = await enrichMission(mission, wsId);

    // Clés
    const cles = await queryAll(
      `SELECT * FROM imv2_cle_mission WHERE mission_id = $1 ORDER BY created_at`,
      [id],
    );

    // EDL
    const edls = await queryAll(
      `SELECT e.*,
              (SELECT json_agg(json_build_object('id', t.id, 'nom_complet',
                CASE WHEN t.type='morale' THEN t.raison_sociale ELSE CONCAT(t.prenom,' ',t.nom) END
              )) FROM imv2_edl_locataire el INNER JOIN imv2_tiers t ON t.id = el.tiers_id WHERE el.edl_id = e.id) AS locataires
       FROM imv2_edl_inventaire e WHERE e.mission_id = $1 ORDER BY e.created_at`,
      [id],
    );

    res.json({ ...enriched, cles, edls });
  } catch (err) {
    console.error('[missions] GET /:id', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST / — Create ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      lot_id, titre, statut = 'planifiee', statut_rdv = 'a_confirmer',
      date_debut, heure_debut, date_fin, heure_fin, commentaire,
      technicien_ids = [],
    } = req.body;

    if (!lot_id) return res.status(400).json({ error: 'lot_id requis' });

    const lot = await queryOne(
      'SELECT id FROM imv2_lot WHERE id=$1 AND workspace_id=$2 AND est_archive=false',
      [lot_id, wsId],
    );
    if (!lot) return res.status(400).json({ error: 'Lot introuvable ou archivé' });

    const reference = await generateReference();

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const mission = await client.query(
        `INSERT INTO imv2_mission
           (workspace_id, lot_id, reference, titre, statut, statut_rdv,
            date_debut, heure_debut, date_fin, heure_fin, commentaire)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [wsId, lot_id, reference, titre || null, statut, statut_rdv,
         date_debut || null, heure_debut || null, date_fin || null, heure_fin || null,
         commentaire || null],
      );

      const m = mission.rows[0];

      // Assign technicians
      for (const userId of technicien_ids) {
        await client.query(
          `INSERT INTO imv2_mission_technicien (mission_id, user_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [m.id, userId],
        );
      }

      // Update statut if techniciens assigned
      if (technicien_ids.length > 0 && statut === 'planifiee') {
        await client.query(
          `UPDATE imv2_mission SET statut='assignee', updated_at=NOW() WHERE id=$1`,
          [m.id],
        );
        m.statut = 'assignee';
      }

      await client.query('COMMIT');

      const enriched = await enrichMission(m, wsId);
      res.status(201).json(enriched);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[missions] POST /', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /:id — Update ────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const {
      titre, statut_rdv, date_debut, heure_debut, date_fin, heure_fin, commentaire,
    } = req.body;

    const existing = await queryOne(
      'SELECT * FROM imv2_mission WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    if (!existing) return res.status(404).json({ error: 'Mission introuvable' });

    // Post-terminaison: only commentaire can change
    if (existing.statut === 'terminee') {
      const updated = await queryOne(
        `UPDATE imv2_mission SET commentaire=$1, updated_at=NOW()
         WHERE id=$2 AND workspace_id=$3 RETURNING *`,
        [commentaire ?? existing.commentaire, id, wsId],
      );
      return res.json(await enrichMission(updated, wsId));
    }

    const updated = await queryOne(
      `UPDATE imv2_mission SET
         titre=$1, statut_rdv=$2,
         date_debut=$3, heure_debut=$4, date_fin=$5, heure_fin=$6,
         commentaire=$7, updated_at=NOW()
       WHERE id=$8 AND workspace_id=$9 RETURNING *`,
      [titre ?? existing.titre, statut_rdv ?? existing.statut_rdv,
       date_debut ?? existing.date_debut, heure_debut ?? existing.heure_debut,
       date_fin ?? existing.date_fin, heure_fin ?? existing.heure_fin,
       commentaire ?? existing.commentaire, id, wsId],
    );

    res.json(await enrichMission(updated, wsId));
  } catch (err) {
    console.error('[missions] PUT /:id', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /:id/cancel — Annuler ─────────────────────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { motif_annulation } = req.body;

    const existing = await queryOne(
      'SELECT * FROM imv2_mission WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    if (!existing) return res.status(404).json({ error: 'Mission introuvable' });
    if (existing.statut === 'terminee') {
      return res.status(400).json({ error: 'Impossible d\'annuler une mission terminée' });
    }
    if (existing.statut === 'annulee') {
      return res.status(400).json({ error: 'Mission déjà annulée' });
    }

    const updated = await queryOne(
      `UPDATE imv2_mission SET statut='annulee', motif_annulation=$1, updated_at=NOW()
       WHERE id=$2 AND workspace_id=$3 RETURNING *`,
      [motif_annulation || null, id, wsId],
    );

    res.json(await enrichMission(updated, wsId));
  } catch (err) {
    console.error('[missions] PATCH /:id/cancel', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /:id/techniciens — Assign ───────────────────────────────────────
router.post('/:id/techniciens', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id requis' });

    const existing = await queryOne(
      'SELECT statut FROM imv2_mission WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    if (!existing) return res.status(404).json({ error: 'Mission introuvable' });
    if (['terminee', 'annulee'].includes(existing.statut)) {
      return res.status(400).json({ error: 'Impossible de modifier une mission terminée/annulée' });
    }

    // Check conflict
    const conflict = await queryOne(
      `SELECT m2.id, m2.reference, m2.date_debut, m2.heure_debut
       FROM imv2_mission_technicien mt
       INNER JOIN imv2_mission m2 ON m2.id = mt.mission_id
       INNER JOIN imv2_mission m1 ON m1.id = $1
       WHERE mt.user_id = $2
         AND m2.id != $1
         AND m2.statut NOT IN ('annulee', 'terminee')
         AND m2.date_debut = m1.date_debut
         AND (m2.heure_debut IS NULL OR m1.heure_debut IS NULL OR
              (m2.heure_debut, COALESCE(m2.heure_fin, m2.heure_debut + INTERVAL '2 hours')) OVERLAPS
              (m1.heure_debut, COALESCE(m1.heure_fin, m1.heure_debut + INTERVAL '2 hours')))`,
      [id, user_id],
    );

    await queryOne(
      `INSERT INTO imv2_mission_technicien (mission_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (mission_id, user_id) DO NOTHING
       RETURNING *`,
      [id, user_id],
    );

    // Update statut to assignee
    await query(
      `UPDATE imv2_mission SET statut='assignee', updated_at=NOW()
       WHERE id=$1 AND statut='planifiee'`,
      [id],
    );

    const updated = await queryOne(
      'SELECT * FROM imv2_mission WHERE id=$1',
      [id],
    );

    res.json({
      mission: await enrichMission(updated, wsId),
      conflict: conflict ? { warning: true, mission: conflict } : null,
    });
  } catch (err) {
    console.error('[missions] POST /:id/techniciens', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /:id/techniciens/:userId ─────────────────────────────────────
router.delete('/:id/techniciens/:userId', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id, userId } = req.params;

    const existing = await queryOne(
      'SELECT statut FROM imv2_mission WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    if (!existing) return res.status(404).json({ error: 'Mission introuvable' });
    if (['terminee', 'annulee'].includes(existing.statut)) {
      return res.status(400).json({ error: 'Impossible de modifier une mission terminée/annulée' });
    }

    await query(
      'DELETE FROM imv2_mission_technicien WHERE mission_id=$1 AND user_id=$2',
      [id, userId],
    );

    // Check remaining techs
    const remaining = await queryOne(
      'SELECT COUNT(*) AS count FROM imv2_mission_technicien WHERE mission_id=$1',
      [id],
    );
    if (parseInt(remaining.count, 10) === 0) {
      await query(
        `UPDATE imv2_mission SET statut='planifiee', updated_at=NOW()
         WHERE id=$1 AND statut='assignee'`,
        [id],
      );
    }

    const updated = await queryOne('SELECT * FROM imv2_mission WHERE id=$1', [id]);
    res.json(await enrichMission(updated, wsId));
  } catch (err) {
    console.error('[missions] DELETE /:id/techniciens/:userId', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Clés ─────────────────────────────────────────────────────────────────
router.get('/:id/cles', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const m = await queryOne('SELECT id FROM imv2_mission WHERE id=$1 AND workspace_id=$2', [id, wsId]);
    if (!m) return res.status(404).json({ error: 'Mission introuvable' });
    const cles = await queryAll(
      'SELECT * FROM imv2_cle_mission WHERE mission_id=$1 ORDER BY created_at',
      [id],
    );
    res.json(cles);
  } catch (err) {
    console.error('[missions] GET /:id/cles', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/cles', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { type_cle, quantite = 1, statut = 'remise', commentaire, edl_id } = req.body;

    if (!type_cle) return res.status(400).json({ error: 'type_cle requis' });
    const m = await queryOne('SELECT id FROM imv2_mission WHERE id=$1 AND workspace_id=$2', [id, wsId]);
    if (!m) return res.status(404).json({ error: 'Mission introuvable' });

    const cle = await queryOne(
      `INSERT INTO imv2_cle_mission (mission_id, edl_id, type_cle, quantite, statut, commentaire)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, edl_id || null, type_cle, quantite, statut, commentaire || null],
    );
    res.status(201).json(cle);
  } catch (err) {
    console.error('[missions] POST /:id/cles', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:id/cles/:cleId', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id, cleId } = req.params;
    const { statut, quantite, commentaire } = req.body;

    // Verify ownership via mission
    const m = await queryOne('SELECT id, statut FROM imv2_mission WHERE id=$1 AND workspace_id=$2', [id, wsId]);
    if (!m) return res.status(404).json({ error: 'Mission introuvable' });

    const cle = await queryOne(
      `UPDATE imv2_cle_mission SET
         statut=COALESCE($1, statut),
         quantite=COALESCE($2, quantite),
         commentaire=COALESCE($3, commentaire),
         updated_at=NOW()
       WHERE id=$4 AND mission_id=$5 RETURNING *`,
      [statut || null, quantite || null, commentaire || null, cleId, id],
    );
    if (!cle) return res.status(404).json({ error: 'Clé introuvable' });
    res.json(cle);
  } catch (err) {
    console.error('[missions] PATCH /:id/cles/:cleId', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id/cles/:cleId', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id, cleId } = req.params;
    const m = await queryOne('SELECT id FROM imv2_mission WHERE id=$1 AND workspace_id=$2', [id, wsId]);
    if (!m) return res.status(404).json({ error: 'Mission introuvable' });
    await query('DELETE FROM imv2_cle_mission WHERE id=$1 AND mission_id=$2', [cleId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[missions] DELETE /:id/cles/:cleId', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Indisponibilités ─────────────────────────────────────────────────────
router.get('/indisponibilites', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { user_id, date_from, date_to } = req.query;

    const conditions = ['workspace_id = $1'];
    const params = [wsId];
    let idx = 2;

    if (user_id) {
      conditions.push(`user_id = $${idx}`);
      params.push(user_id);
      idx++;
    }
    if (date_from) {
      conditions.push(`date_fin >= $${idx}`);
      params.push(date_from);
      idx++;
    }
    if (date_to) {
      conditions.push(`date_debut <= $${idx}`);
      params.push(date_to);
      idx++;
    }

    const rows = await queryAll(
      `SELECT i.*, u.nom, u.prenom, u.avatar_color
       FROM imv2_indisponibilite_technicien i
       INNER JOIN imv2_utilisateur u ON u.id = i.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY date_debut`,
      params,
    );
    res.json(rows);
  } catch (err) {
    console.error('[missions] GET /indisponibilites', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/indisponibilites', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { user_id, titre, date_debut, heure_debut, date_fin, heure_fin, recurrence, recurrence_fin } = req.body;

    if (!user_id || !date_debut || !date_fin) {
      return res.status(400).json({ error: 'user_id, date_debut, date_fin requis' });
    }

    const indispo = await queryOne(
      `INSERT INTO imv2_indisponibilite_technicien
         (user_id, workspace_id, titre, date_debut, heure_debut, date_fin, heure_fin, recurrence, recurrence_fin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [user_id, wsId, titre || 'Indisponible',
       date_debut, heure_debut || null, date_fin, heure_fin || null,
       recurrence || 'none', recurrence_fin || null],
    );
    res.status(201).json(indispo);
  } catch (err) {
    console.error('[missions] POST /indisponibilites', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/indisponibilites/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    await query(
      'DELETE FROM imv2_indisponibilite_technicien WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[missions] DELETE /indisponibilites/:id', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
