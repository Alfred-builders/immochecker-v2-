import { Router } from 'express';
import { query, queryOne, queryAll } from '../db/index.js';

const router = Router();

// ─── GET / — List lots for current workspace ───────────────────
router.get('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      search,
      type_bien,
      meuble,
      etage,
      dpe_classe,
      batiment_id,
      archived = 'false',
      cursor,
      limit: rawLimit,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);
    const isArchived = archived === 'true';

    const conditions = ['l.workspace_id = $1', 'l.est_archive = $2'];
    const params = [wsId, isArchived];
    let idx = 3;

    if (type_bien) {
      conditions.push(`l.type_bien = $${idx}`);
      params.push(type_bien);
      idx++;
    }

    if (meuble !== undefined && meuble !== '') {
      conditions.push(`l.meuble = $${idx}`);
      params.push(meuble === 'true');
      idx++;
    }

    if (etage !== undefined && etage !== '') {
      conditions.push(`l.etage = $${idx}`);
      params.push(parseInt(etage, 10));
      idx++;
    }

    if (dpe_classe) {
      conditions.push(`l.dpe_classe = $${idx}`);
      params.push(dpe_classe);
      idx++;
    }

    if (batiment_id) {
      conditions.push(`l.batiment_id = $${idx}`);
      params.push(batiment_id);
      idx++;
    }

    if (search) {
      conditions.push(
        `(l.designation ILIKE $${idx}
          OR l.reference_interne ILIKE $${idx}
          OR l.num_appartement ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (cursor) {
      conditions.push(`l.created_at < $${idx}`);
      params.push(cursor);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const lots = await queryAll(
      `SELECT l.id, l.batiment_id, l.designation, l.type_bien, l.reference_interne,
              l.num_appartement, l.nb_pieces, l.nb_pieces_precision, l.etage,
              l.emplacement_palier, l.surface, l.meuble,
              l.chauffage_type, l.chauffage_mode, l.eau_chaude_type, l.eau_chaude_mode,
              l.dpe_classe, l.ges_classe, l.num_parking, l.num_cave,
              l.commentaire, l.est_archive, l.created_at, l.updated_at,
              b.designation AS batiment_designation,
              (
                SELECT jsonb_build_object(
                  'rue', ab.rue, 'complement', ab.complement,
                  'code_postal', ab.code_postal, 'ville', ab.ville
                )
                FROM imv2_adresse_batiment ab
                WHERE ab.batiment_id = b.id
                ORDER BY ab.ordre ASC NULLS LAST, ab.created_at ASC
                LIMIT 1
              ) AS adresse_principale
       FROM imv2_lot l
       JOIN imv2_batiment b ON b.id = l.batiment_id
       WHERE ${whereClause}
       ORDER BY l.designation ASC, l.created_at DESC
       LIMIT $${idx}`,
      [...params, limit + 1]
    );

    const hasMore = lots.length > limit;
    if (hasMore) lots.pop();

    const nextCursor = hasMore && lots.length > 0
      ? lots[lots.length - 1].created_at
      : null;

    res.json({ lots, nextCursor, hasMore });
  } catch (err) {
    console.error('[Lot] List error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /:id — Lot detail with batiment info ─────────────────
router.get('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const lot = await queryOne(
      `SELECT l.id, l.batiment_id, l.designation, l.type_bien, l.reference_interne,
              l.num_appartement, l.nb_pieces, l.nb_pieces_precision, l.etage,
              l.emplacement_palier, l.surface, l.meuble,
              l.chauffage_type, l.chauffage_mode, l.eau_chaude_type, l.eau_chaude_mode,
              l.dpe_classe, l.ges_classe, l.num_parking, l.num_cave,
              l.commentaire, l.est_archive, l.created_at, l.updated_at,
              jsonb_build_object(
                'id', b.id,
                'designation', b.designation,
                'type', b.type,
                'num_batiment', b.num_batiment,
                'nb_etages', b.nb_etages,
                'annee_construction', b.annee_construction,
                'reference_interne', b.reference_interne
              ) AS batiment,
              (
                SELECT jsonb_build_object(
                  'rue', ab.rue, 'complement', ab.complement,
                  'code_postal', ab.code_postal, 'ville', ab.ville
                )
                FROM imv2_adresse_batiment ab
                WHERE ab.batiment_id = b.id
                ORDER BY ab.ordre ASC NULLS LAST, ab.created_at ASC
                LIMIT 1
              ) AS adresse_principale
       FROM imv2_lot l
       JOIN imv2_batiment b ON b.id = l.batiment_id
       WHERE l.id = $1 AND l.workspace_id = $2`,
      [req.params.id, wsId]
    );

    if (!lot) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }

    res.json({ lot });
  } catch (err) {
    console.error('[Lot] Get error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST / — Create lot ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      batiment_id, designation, type_bien, reference_interne,
      num_appartement, nb_pieces, nb_pieces_precision, etage,
      emplacement_palier, surface, meuble,
      chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
      dpe_classe, ges_classe, num_parking, num_cave, commentaire,
    } = req.body;

    if (!batiment_id) {
      return res.status(400).json({ error: 'Le bâtiment est obligatoire (batiment_id)' });
    }
    if (!designation) {
      return res.status(400).json({ error: 'La désignation est obligatoire' });
    }

    // Verify batiment belongs to workspace
    const batiment = await queryOne(
      'SELECT id FROM imv2_batiment WHERE id = $1 AND workspace_id = $2',
      [batiment_id, wsId]
    );
    if (!batiment) {
      return res.status(404).json({ error: 'Bâtiment non trouvé dans ce workspace' });
    }

    const lot = await queryOne(
      `INSERT INTO imv2_lot
        (batiment_id, workspace_id, designation, type_bien, reference_interne,
         num_appartement, nb_pieces, nb_pieces_precision, etage,
         emplacement_palier, surface, meuble,
         chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
         dpe_classe, ges_classe, num_parking, num_cave, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING id, batiment_id, designation, type_bien, reference_interne,
                 num_appartement, nb_pieces, nb_pieces_precision, etage,
                 emplacement_palier, surface, meuble,
                 chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
                 dpe_classe, ges_classe, num_parking, num_cave, commentaire,
                 est_archive, created_at, updated_at`,
      [batiment_id, wsId, designation, type_bien || 'appartement', reference_interne || null,
       num_appartement || null, nb_pieces || null, nb_pieces_precision || null,
       etage || null, emplacement_palier || null,
       surface != null && surface !== '' ? surface : null, meuble ?? false,
       chauffage_type || null, chauffage_mode || null,
       eau_chaude_type || null, eau_chaude_mode || null,
       dpe_classe || null, ges_classe || null,
       num_parking || null, num_cave || null, commentaire || null]
    );

    res.status(201).json({ lot });
  } catch (err) {
    console.error('[Lot] Create error:', err);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

// ─── PUT /:id — Update lot ────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    // Verify lot belongs to workspace
    const existing = await queryOne(
      'SELECT id FROM imv2_lot WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }

    const {
      batiment_id, designation, type_bien, reference_interne,
      num_appartement, nb_pieces, nb_pieces_precision, etage,
      emplacement_palier, surface, meuble,
      chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
      dpe_classe, ges_classe, num_parking, num_cave, commentaire,
    } = req.body;

    // If changing batiment_id, verify new batiment belongs to workspace
    if (batiment_id) {
      const batiment = await queryOne(
        'SELECT id FROM imv2_batiment WHERE id = $1 AND workspace_id = $2',
        [batiment_id, wsId]
      );
      if (!batiment) {
        return res.status(404).json({ error: 'Bâtiment non trouvé dans ce workspace' });
      }
    }

    const lot = await queryOne(
      `UPDATE imv2_lot SET
        batiment_id = COALESCE($1, batiment_id),
        designation = COALESCE($2, designation),
        type_bien = COALESCE($3, type_bien),
        reference_interne = COALESCE($4, reference_interne),
        num_appartement = COALESCE($5, num_appartement),
        nb_pieces = COALESCE($6, nb_pieces),
        nb_pieces_precision = COALESCE($7, nb_pieces_precision),
        etage = COALESCE($8, etage),
        emplacement_palier = COALESCE($9, emplacement_palier),
        surface = COALESCE($10, surface),
        meuble = COALESCE($11, meuble),
        chauffage_type = COALESCE($12, chauffage_type),
        chauffage_mode = COALESCE($13, chauffage_mode),
        eau_chaude_type = COALESCE($14, eau_chaude_type),
        eau_chaude_mode = COALESCE($15, eau_chaude_mode),
        dpe_classe = COALESCE($16, dpe_classe),
        ges_classe = COALESCE($17, ges_classe),
        num_parking = COALESCE($18, num_parking),
        num_cave = COALESCE($19, num_cave),
        commentaire = COALESCE($20, commentaire),
        updated_at = NOW()
       WHERE id = $21 AND workspace_id = $22
       RETURNING id, batiment_id, designation, type_bien, reference_interne,
                 num_appartement, nb_pieces, nb_pieces_precision, etage,
                 emplacement_palier, surface, meuble,
                 chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
                 dpe_classe, ges_classe, num_parking, num_cave, commentaire,
                 est_archive, created_at, updated_at`,
      [batiment_id, designation, type_bien, reference_interne,
       num_appartement, nb_pieces, nb_pieces_precision,
       etage != null ? etage : null, emplacement_palier,
       surface, meuble != null ? meuble : null,
       chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
       dpe_classe, ges_classe, num_parking, num_cave, commentaire,
       req.params.id, wsId]
    );

    res.json({ lot });
  } catch (err) {
    console.error('[Lot] Update error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ─── PATCH /:id/archive — Toggle est_archive ──────────────────
router.patch('/:id/archive', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const existing = await queryOne(
      'SELECT id, est_archive FROM imv2_lot WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }

    const newArchived = !existing.est_archive;

    const lot = await queryOne(
      `UPDATE imv2_lot
       SET est_archive = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING id, batiment_id, designation, type_bien, reference_interne,
                 num_appartement, nb_pieces, nb_pieces_precision, etage,
                 emplacement_palier, surface, meuble,
                 chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
                 dpe_classe, ges_classe, num_parking, num_cave, commentaire,
                 est_archive, created_at, updated_at`,
      [newArchived, req.params.id, wsId]
    );

    // Log to archive log
    await query(
      `INSERT INTO imv2_archive_log
        (entity_type, entity_id, workspace_id, action, performed_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'lot',
        lot.id,
        wsId,
        newArchived ? 'archive' : 'unarchive',
        req.user.userId,
        JSON.stringify({ designation: lot.designation, type_bien: lot.type_bien }),
      ]
    );

    res.json({ lot });
  } catch (err) {
    console.error('[Lot] Archive error:', err);
    res.status(500).json({ error: "Erreur lors de l'archivage" });
  }
});

export default router;
