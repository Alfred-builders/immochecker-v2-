import { Router } from 'express';
import { query, queryOne, queryAll, getClient } from '../db/index.js';

const router = Router();

// ─── Helper: display name for a tiers ─────────────────────────
function displayName(t) {
  if (t.type === 'personne_morale') return t.raison_sociale || '';
  return [t.prenom, t.nom].filter(Boolean).join(' ');
}

// ─── GET / — List tiers for current workspace ─────────────────
router.get('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      search,
      type,
      role,
      archived = 'false',
      cursor,
      limit: rawLimit,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);
    const isArchived = archived === 'true';

    const conditions = ['t.workspace_id = $1', 't.est_archive = $2'];
    const params = [wsId, isArchived];
    let idx = 3;

    if (type) {
      conditions.push(`t.type = $${idx}`);
      params.push(type);
      idx++;
    }

    if (search) {
      conditions.push(
        `(t.nom ILIKE $${idx}
          OR t.prenom ILIKE $${idx}
          OR t.raison_sociale ILIKE $${idx}
          OR t.email ILIKE $${idx}
          OR t.telephone ILIKE $${idx}
          OR t.reference_interne ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    // Filter by role (proprietaire, locataire, mandataire)
    if (role) {
      conditions.push(
        `EXISTS (SELECT 1 FROM imv2_lot_tiers lt WHERE lt.tiers_id = t.id AND lt.role = $${idx})`
      );
      params.push(role);
      idx++;
    }

    if (cursor) {
      conditions.push(`t.created_at < $${idx}`);
      params.push(cursor);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const tiers = await queryAll(
      `SELECT t.id, t.type, t.nom, t.prenom, t.raison_sociale, t.siret,
              t.email, t.telephone, t.telephone2, t.adresse, t.code_postal,
              t.ville, t.reference_interne, t.civilite, t.forme_juridique,
              t.est_archive, t.created_at, t.updated_at,
              (
                SELECT COALESCE(jsonb_agg(DISTINCT lt.role), '[]'::jsonb)
                FROM imv2_lot_tiers lt WHERE lt.tiers_id = t.id
              ) AS roles,
              (
                SELECT COUNT(DISTINCT lt.lot_id)::int
                FROM imv2_lot_tiers lt WHERE lt.tiers_id = t.id
              ) AS nb_lots
       FROM imv2_tiers t
       WHERE ${whereClause}
       ORDER BY COALESCE(t.raison_sociale, t.nom) ASC, t.created_at DESC
       LIMIT $${idx}`,
      [...params, limit + 1]
    );

    const hasMore = tiers.length > limit;
    if (hasMore) tiers.pop();

    const nextCursor = hasMore && tiers.length > 0
      ? tiers[tiers.length - 1].created_at
      : null;

    res.json({ tiers, nextCursor, hasMore });
  } catch (err) {
    console.error('[Tiers] List error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /:id — Tiers detail ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const tiers = await queryOne(
      `SELECT t.*
       FROM imv2_tiers t
       WHERE t.id = $1 AND t.workspace_id = $2`,
      [req.params.id, wsId]
    );

    if (!tiers) {
      return res.status(404).json({ error: 'Tiers non trouvé' });
    }

    // Get linked lots with role
    const lots = await queryAll(
      `SELECT lt.id AS link_id, lt.role, lt.quote_part, lt.date_debut,
              lt.date_fin, lt.est_principal,
              l.id AS lot_id, l.designation AS lot_designation,
              l.type_bien, l.surface, l.etage,
              b.id AS batiment_id, b.designation AS batiment_designation,
              (
                SELECT jsonb_build_object(
                  'rue', ab.rue, 'code_postal', ab.code_postal, 'ville', ab.ville
                )
                FROM imv2_adresse_batiment ab
                WHERE ab.batiment_id = b.id
                ORDER BY ab.ordre ASC NULLS LAST
                LIMIT 1
              ) AS adresse
       FROM imv2_lot_tiers lt
       JOIN imv2_lot l ON l.id = lt.lot_id
       JOIN imv2_batiment b ON b.id = l.batiment_id
       WHERE lt.tiers_id = $1
       ORDER BY lt.role, l.designation`,
      [tiers.id]
    );

    // Get linked organisations (for PP) or linked persons (for PM)
    let organisations = [];
    let personnes = [];

    if (tiers.type === 'personne_physique') {
      organisations = await queryAll(
        `SELECT o.id, o.organisation_id, o.fonction,
                t.raison_sociale, t.siret, t.forme_juridique
         FROM imv2_tiers_organisation o
         JOIN imv2_tiers t ON t.id = o.organisation_id
         WHERE o.personne_id = $1
         ORDER BY t.raison_sociale`,
        [tiers.id]
      );
    } else {
      personnes = await queryAll(
        `SELECT o.id, o.personne_id, o.fonction,
                t.nom, t.prenom, t.civilite, t.email, t.telephone
         FROM imv2_tiers_organisation o
         JOIN imv2_tiers t ON t.id = o.personne_id
         WHERE o.organisation_id = $1
         ORDER BY t.nom, t.prenom`,
        [tiers.id]
      );
    }

    res.json({
      tiers: {
        ...tiers,
        lots,
        organisations,
        personnes,
      },
    });
  } catch (err) {
    console.error('[Tiers] Get error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST / — Create tiers (US588) ───────────────────────────
router.post('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      type, nom, prenom, raison_sociale, siret, email,
      telephone, telephone2, adresse, code_postal, ville,
      notes, commentaire, reference_interne, civilite,
      date_naissance, forme_juridique, representant_nom,
      representant_prenom,
    } = req.body;

    if (!type || !['personne_physique', 'personne_morale'].includes(type)) {
      return res.status(400).json({ error: 'Type de tiers invalide' });
    }

    if (type === 'personne_physique' && !nom) {
      return res.status(400).json({ error: 'Le nom est obligatoire pour une personne physique' });
    }

    if (type === 'personne_morale' && !raison_sociale) {
      return res.status(400).json({ error: 'La raison sociale est obligatoire pour une personne morale' });
    }

    const tiers = await queryOne(
      `INSERT INTO imv2_tiers
        (workspace_id, type, nom, prenom, raison_sociale, siret, email,
         telephone, telephone2, adresse, code_postal, ville, notes,
         commentaire, reference_interne, civilite, date_naissance,
         forme_juridique, representant_nom, representant_prenom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        wsId, type, nom || null, prenom || null, raison_sociale || null,
        siret || null, email || null, telephone || null, telephone2 || null,
        adresse || null, code_postal || null, ville || null, notes || null,
        commentaire || null, reference_interne || null, civilite || null,
        date_naissance || null, forme_juridique || null,
        representant_nom || null, representant_prenom || null,
      ]
    );

    res.status(201).json({ tiers });
  } catch (err) {
    console.error('[Tiers] Create error:', err);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// ─── PUT /:id — Update tiers (US593) ─────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const existing = await queryOne(
      'SELECT id FROM imv2_tiers WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Tiers non trouvé' });
    }

    const {
      nom, prenom, raison_sociale, siret, email,
      telephone, telephone2, adresse, code_postal, ville,
      notes, commentaire, reference_interne, civilite,
      date_naissance, forme_juridique, representant_nom,
      representant_prenom,
    } = req.body;

    const tiers = await queryOne(
      `UPDATE imv2_tiers SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        raison_sociale = COALESCE($3, raison_sociale),
        siret = COALESCE($4, siret),
        email = COALESCE($5, email),
        telephone = COALESCE($6, telephone),
        telephone2 = COALESCE($7, telephone2),
        adresse = COALESCE($8, adresse),
        code_postal = COALESCE($9, code_postal),
        ville = COALESCE($10, ville),
        notes = COALESCE($11, notes),
        commentaire = COALESCE($12, commentaire),
        reference_interne = COALESCE($13, reference_interne),
        civilite = COALESCE($14, civilite),
        date_naissance = COALESCE($15, date_naissance),
        forme_juridique = COALESCE($16, forme_juridique),
        representant_nom = COALESCE($17, representant_nom),
        representant_prenom = COALESCE($18, representant_prenom),
        updated_at = NOW()
       WHERE id = $19 AND workspace_id = $20
       RETURNING *`,
      [
        nom, prenom, raison_sociale, siret, email,
        telephone, telephone2, adresse, code_postal, ville,
        notes, commentaire, reference_interne, civilite,
        date_naissance, forme_juridique, representant_nom,
        representant_prenom, req.params.id, wsId,
      ]
    );

    res.json({ tiers });
  } catch (err) {
    console.error('[Tiers] Update error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ─── PATCH /:id/archive — Toggle archive (US593) ─────────────
router.patch('/:id/archive', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const existing = await queryOne(
      'SELECT id, est_archive FROM imv2_tiers WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Tiers non trouvé' });
    }

    const newArchived = !existing.est_archive;

    const tiers = await queryOne(
      `UPDATE imv2_tiers
       SET est_archive = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING *`,
      [newArchived, req.params.id, wsId]
    );

    await query(
      `INSERT INTO imv2_archive_log
        (entity_type, entity_id, workspace_id, action, performed_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'tiers',
        tiers.id,
        wsId,
        newArchived ? 'archive' : 'restore',
        req.user.userId,
        JSON.stringify({ type: tiers.type, nom: displayName(tiers) }),
      ]
    );

    res.json({ tiers });
  } catch (err) {
    console.error('[Tiers] Archive error:', err);
    res.status(500).json({ error: "Erreur lors de l'archivage" });
  }
});

// ─── POST /:id/organisations — Link PP to PM (US589) ─────────
router.post('/:id/organisations', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { organisation_id, fonction } = req.body;

    const pp = await queryOne(
      "SELECT id FROM imv2_tiers WHERE id = $1 AND workspace_id = $2 AND type = 'personne_physique'",
      [req.params.id, wsId]
    );
    if (!pp) {
      return res.status(404).json({ error: 'Personne physique non trouvée' });
    }

    const pm = await queryOne(
      "SELECT id FROM imv2_tiers WHERE id = $1 AND workspace_id = $2 AND type = 'personne_morale'",
      [organisation_id, wsId]
    );
    if (!pm) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const link = await queryOne(
      `INSERT INTO imv2_tiers_organisation (personne_id, organisation_id, fonction)
       VALUES ($1, $2, $3)
       ON CONFLICT (personne_id, organisation_id) DO UPDATE SET fonction = $3
       RETURNING *`,
      [req.params.id, organisation_id, fonction || null]
    );

    res.status(201).json({ organisation: link });
  } catch (err) {
    console.error('[Tiers] Link org error:', err);
    res.status(500).json({ error: "Erreur lors de l'association" });
  }
});

// ─── DELETE /:id/organisations/:orgId — Unlink PP from PM ────
router.delete('/:id/organisations/:linkId', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    // Verify tiers belongs to workspace
    const tiers = await queryOne(
      'SELECT id FROM imv2_tiers WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!tiers) {
      return res.status(404).json({ error: 'Tiers non trouvé' });
    }

    await query(
      'DELETE FROM imv2_tiers_organisation WHERE id = $1 AND personne_id = $2',
      [req.params.linkId, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Tiers] Unlink org error:', err);
    res.status(500).json({ error: 'Erreur lors de la dissociation' });
  }
});

// ─── POST /lot-links — Link tiers to lot (US590/591) ─────────
router.post('/lot-links', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { lot_id, tiers_id, role, quote_part, date_debut, date_fin, est_principal } = req.body;

    if (!lot_id || !tiers_id || !role) {
      return res.status(400).json({ error: 'lot_id, tiers_id et rôle sont obligatoires' });
    }

    if (!['proprietaire', 'locataire', 'mandataire'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Verify both belong to workspace
    const lot = await queryOne(
      'SELECT id FROM imv2_lot WHERE id = $1 AND workspace_id = $2',
      [lot_id, wsId]
    );
    if (!lot) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }

    const tiers = await queryOne(
      'SELECT id FROM imv2_tiers WHERE id = $1 AND workspace_id = $2',
      [tiers_id, wsId]
    );
    if (!tiers) {
      return res.status(404).json({ error: 'Tiers non trouvé' });
    }

    // For mandataire, only one per lot
    if (role === 'mandataire') {
      const existing = await queryOne(
        "SELECT id FROM imv2_lot_tiers WHERE lot_id = $1 AND role = 'mandataire' AND tiers_id != $2",
        [lot_id, tiers_id]
      );
      if (existing) {
        return res.status(409).json({ error: 'Ce lot a déjà un mandataire' });
      }
    }

    const link = await queryOne(
      `INSERT INTO imv2_lot_tiers
        (lot_id, tiers_id, role, quote_part, date_debut, date_fin, est_principal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (lot_id, tiers_id, role) DO UPDATE SET
         quote_part = COALESCE($4, imv2_lot_tiers.quote_part),
         date_debut = COALESCE($5, imv2_lot_tiers.date_debut),
         date_fin = COALESCE($6, imv2_lot_tiers.date_fin),
         est_principal = COALESCE($7, imv2_lot_tiers.est_principal),
         updated_at = NOW()
       RETURNING *`,
      [lot_id, tiers_id, role, quote_part || null, date_debut || null, date_fin || null, est_principal ?? false]
    );

    res.status(201).json({ link });
  } catch (err) {
    console.error('[Tiers] Link lot error:', err);
    res.status(500).json({ error: "Erreur lors de l'association au lot" });
  }
});

// ─── DELETE /lot-links/:linkId — Unlink tiers from lot ───────
router.delete('/lot-links/:linkId', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    // Verify via join
    const link = await queryOne(
      `SELECT lt.id FROM imv2_lot_tiers lt
       JOIN imv2_tiers t ON t.id = lt.tiers_id
       WHERE lt.id = $1 AND t.workspace_id = $2`,
      [req.params.linkId, wsId]
    );
    if (!link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    await query('DELETE FROM imv2_lot_tiers WHERE id = $1', [req.params.linkId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[Tiers] Unlink lot error:', err);
    res.status(500).json({ error: 'Erreur lors de la dissociation' });
  }
});

export default router;
