import { Router } from 'express';
import { query, queryOne, queryAll, getClient } from '../db/index.js';

const router = Router();

// ─── GET / — List buildings for current workspace ──────────────
router.get('/', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const {
      search,
      type,
      archived = 'false',
      cursor,
      limit: rawLimit,
    } = req.query;

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 100);
    const isArchived = archived === 'true';

    const conditions = ['b.workspace_id = $1', 'b.est_archive = $2'];
    const params = [wsId, isArchived];
    let idx = 3;

    if (type) {
      conditions.push(`b.type = $${idx}`);
      params.push(type);
      idx++;
    }

    if (search) {
      conditions.push(
        `(b.designation ILIKE $${idx}
          OR b.reference_interne ILIKE $${idx}
          OR EXISTS (
            SELECT 1 FROM imv2_adresse_batiment ab
            WHERE ab.batiment_id = b.id
              AND (ab.rue ILIKE $${idx} OR ab.ville ILIKE $${idx} OR ab.code_postal ILIKE $${idx})
          ))`
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (cursor) {
      conditions.push(`b.created_at < $${idx}`);
      params.push(cursor);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    const batiments = await queryAll(
      `SELECT b.id, b.designation, b.type, b.num_batiment, b.nb_etages,
              b.annee_construction, b.reference_interne, b.commentaire,
              b.est_archive, b.created_at, b.updated_at,
              (
                SELECT jsonb_build_object(
                  'rue', ab.rue, 'complement', ab.complement,
                  'code_postal', ab.code_postal, 'ville', ab.ville
                )
                FROM imv2_adresse_batiment ab
                WHERE ab.batiment_id = b.id
                ORDER BY ab.ordre ASC NULLS LAST, ab.created_at ASC
                LIMIT 1
              ) AS adresse_principale,
              (
                SELECT COUNT(*)::int FROM imv2_lot l
                WHERE l.batiment_id = b.id AND l.est_archive = false
              ) AS nb_lots
       FROM imv2_batiment b
       WHERE ${whereClause}
       ORDER BY b.designation ASC, b.created_at DESC
       LIMIT $${idx}`,
      [...params, limit + 1]
    );

    const hasMore = batiments.length > limit;
    if (hasMore) batiments.pop();

    const nextCursor = hasMore && batiments.length > 0
      ? batiments[batiments.length - 1].created_at
      : null;

    res.json({ batiments, nextCursor, hasMore });
  } catch (err) {
    console.error('[Batiment] List error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /:id — Building detail with adresses + lots ──────────
router.get('/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const batiment = await queryOne(
      `SELECT b.id, b.designation, b.type, b.num_batiment, b.nb_etages,
              b.annee_construction, b.reference_interne, b.commentaire,
              b.est_archive, b.created_at, b.updated_at
       FROM imv2_batiment b
       WHERE b.id = $1 AND b.workspace_id = $2`,
      [req.params.id, wsId]
    );

    if (!batiment) {
      return res.status(404).json({ error: 'Bâtiment non trouvé' });
    }

    const adresses = await queryAll(
      `SELECT id, type, rue, complement, code_postal, ville,
              latitude, longitude, ordre, created_at, updated_at
       FROM imv2_adresse_batiment
       WHERE batiment_id = $1
       ORDER BY ordre ASC NULLS LAST, created_at ASC`,
      [batiment.id]
    );

    const lots = await queryAll(
      `SELECT id, designation, type_bien, reference_interne, num_appartement,
              nb_pieces, nb_pieces_precision, etage, emplacement_palier, surface,
              meuble, chauffage_type, chauffage_mode, eau_chaude_type, eau_chaude_mode,
              dpe_classe, ges_classe, num_parking, num_cave, commentaire,
              est_archive, created_at, updated_at
       FROM imv2_lot
       WHERE batiment_id = $1
       ORDER BY etage ASC NULLS LAST, designation ASC`,
      [batiment.id]
    );

    res.json({ batiment: { ...batiment, adresses, lots } });
  } catch (err) {
    console.error('[Batiment] Get error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST / — Create building + adresses (transaction) ────────
router.post('/', async (req, res) => {
  const client = await getClient();
  try {
    const wsId = req.user.workspaceId;
    const {
      designation, type, num_batiment, nb_etages,
      annee_construction, reference_interne, commentaire,
      adresses = [],
    } = req.body;

    if (!designation) {
      return res.status(400).json({ error: 'La désignation est obligatoire' });
    }

    await client.query('BEGIN');

    const batiment = (await client.query(
      `INSERT INTO imv2_batiment
        (workspace_id, designation, type, num_batiment, nb_etages,
         annee_construction, reference_interne, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, designation, type, num_batiment, nb_etages,
                 annee_construction, reference_interne, commentaire,
                 est_archive, created_at, updated_at`,
      [wsId, designation, type || null, num_batiment || null, nb_etages || null,
       annee_construction || null, reference_interne || null, commentaire || null]
    )).rows[0];

    const insertedAdresses = [];
    for (let i = 0; i < adresses.length; i++) {
      const a = adresses[i];
      const row = (await client.query(
        `INSERT INTO imv2_adresse_batiment
          (batiment_id, type, rue, complement, code_postal, ville,
           latitude, longitude, ordre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, type, rue, complement, code_postal, ville,
                   latitude, longitude, ordre, created_at, updated_at`,
        [batiment.id, a.type || null, a.rue || null, a.complement || null,
         a.code_postal || null, a.ville || null,
         a.latitude || null, a.longitude || null, i]
      )).rows[0];
      insertedAdresses.push(row);
    }

    await client.query('COMMIT');

    res.status(201).json({
      batiment: { ...batiment, adresses: insertedAdresses },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Batiment] Create error:', err);
    res.status(500).json({ error: 'Erreur lors de la création' });
  } finally {
    client.release();
  }
});

// ─── POST /house — Create house shortcut (US585) ──────────────
router.post('/house', async (req, res) => {
  const client = await getClient();
  try {
    const wsId = req.user.workspaceId;
    const {
      designation, rue, code_postal, ville,
      surface, nb_pieces, meuble, etage,
    } = req.body;

    if (!designation) {
      return res.status(400).json({ error: 'La désignation est obligatoire' });
    }

    await client.query('BEGIN');

    // 1. Create batiment (type = maison)
    const batiment = (await client.query(
      `INSERT INTO imv2_batiment (workspace_id, designation, type)
       VALUES ($1, $2, 'maison')
       RETURNING id, designation, type, num_batiment, nb_etages,
                 annee_construction, reference_interne, commentaire,
                 est_archive, created_at, updated_at`,
      [wsId, designation]
    )).rows[0];

    // 2. Create adresse
    const adresse = (await client.query(
      `INSERT INTO imv2_adresse_batiment
        (batiment_id, type, rue, code_postal, ville, ordre)
       VALUES ($1, 'principale', $2, $3, $4, 0)
       RETURNING id, type, rue, complement, code_postal, ville,
                 latitude, longitude, ordre, created_at, updated_at`,
      [batiment.id, rue || null, code_postal || null, ville || null]
    )).rows[0];

    // 3. Create lot (type_bien = maison)
    const lot = (await client.query(
      `INSERT INTO imv2_lot
        (batiment_id, workspace_id, designation, type_bien, surface,
         nb_pieces, meuble, etage)
       VALUES ($1, $2, $3, 'maison', $4, $5, $6, $7)
       RETURNING id, batiment_id, designation, type_bien, reference_interne,
                 num_appartement, nb_pieces, nb_pieces_precision, etage,
                 emplacement_palier, surface, meuble, chauffage_type,
                 chauffage_mode, eau_chaude_type, eau_chaude_mode,
                 dpe_classe, ges_classe, num_parking, num_cave, commentaire,
                 est_archive, created_at, updated_at`,
      [batiment.id, wsId, designation, surface || null,
       nb_pieces || null, meuble || null, etage || null]
    )).rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      batiment: { ...batiment, adresses: [adresse] },
      lot,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Batiment] Create house error:', err);
    res.status(500).json({ error: 'Erreur lors de la création de la maison' });
  } finally {
    client.release();
  }
});

// ─── PUT /:id — Update building + sync adresses ───────────────
router.put('/:id', async (req, res) => {
  const client = await getClient();
  try {
    const wsId = req.user.workspaceId;

    // Verify ownership
    const existing = await queryOne(
      'SELECT id FROM imv2_batiment WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Bâtiment non trouvé' });
    }

    const {
      designation, type, num_batiment, nb_etages,
      annee_construction, reference_interne, commentaire,
      adresses,
    } = req.body;

    await client.query('BEGIN');

    const batiment = (await client.query(
      `UPDATE imv2_batiment SET
        designation = COALESCE($1, designation),
        type = COALESCE($2, type),
        num_batiment = COALESCE($3, num_batiment),
        nb_etages = COALESCE($4, nb_etages),
        annee_construction = COALESCE($5, annee_construction),
        reference_interne = COALESCE($6, reference_interne),
        commentaire = COALESCE($7, commentaire),
        updated_at = NOW()
       WHERE id = $8 AND workspace_id = $9
       RETURNING id, designation, type, num_batiment, nb_etages,
                 annee_construction, reference_interne, commentaire,
                 est_archive, created_at, updated_at`,
      [designation, type, num_batiment, nb_etages,
       annee_construction, reference_interne, commentaire,
       req.params.id, wsId]
    )).rows[0];

    // Sync adresses: delete existing, re-insert
    let insertedAdresses = [];
    if (Array.isArray(adresses)) {
      await client.query(
        'DELETE FROM imv2_adresse_batiment WHERE batiment_id = $1',
        [batiment.id]
      );

      for (let i = 0; i < adresses.length; i++) {
        const a = adresses[i];
        const row = (await client.query(
          `INSERT INTO imv2_adresse_batiment
            (batiment_id, type, rue, complement, code_postal, ville,
             latitude, longitude, ordre)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, type, rue, complement, code_postal, ville,
                     latitude, longitude, ordre, created_at, updated_at`,
          [batiment.id, a.type || null, a.rue || null, a.complement || null,
           a.code_postal || null, a.ville || null,
           a.latitude || null, a.longitude || null, i]
        )).rows[0];
        insertedAdresses.push(row);
      }
    } else {
      // If adresses not provided, fetch current ones
      insertedAdresses = (await client.query(
        `SELECT id, type, rue, complement, code_postal, ville,
                latitude, longitude, ordre, created_at, updated_at
         FROM imv2_adresse_batiment
         WHERE batiment_id = $1
         ORDER BY ordre ASC NULLS LAST, created_at ASC`,
        [batiment.id]
      )).rows;
    }

    await client.query('COMMIT');

    res.json({ batiment: { ...batiment, adresses: insertedAdresses } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Batiment] Update error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  } finally {
    client.release();
  }
});

// ─── PATCH /:id/archive — Toggle est_archive ──────────────────
router.patch('/:id/archive', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;

    const existing = await queryOne(
      'SELECT id, est_archive FROM imv2_batiment WHERE id = $1 AND workspace_id = $2',
      [req.params.id, wsId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Bâtiment non trouvé' });
    }

    const newArchived = !existing.est_archive;

    const batiment = await queryOne(
      `UPDATE imv2_batiment
       SET est_archive = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING id, designation, type, num_batiment, nb_etages,
                 annee_construction, reference_interne, commentaire,
                 est_archive, created_at, updated_at`,
      [newArchived, req.params.id, wsId]
    );

    // Log to archive log
    await query(
      `INSERT INTO imv2_archive_log
        (entity_type, entity_id, workspace_id, action, performed_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'batiment',
        batiment.id,
        wsId,
        newArchived ? 'archive' : 'unarchive',
        req.user.userId,
        JSON.stringify({ designation: batiment.designation }),
      ]
    );

    res.json({ batiment });
  } catch (err) {
    console.error('[Batiment] Archive error:', err);
    res.status(500).json({ error: "Erreur lors de l'archivage" });
  }
});

export default router;
