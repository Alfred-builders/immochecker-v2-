import { Router } from 'express';
import { query, queryOne, queryAll } from '../db/index.js';

const router = Router();

// ─── TypePiece ─────────────────────────────────────────────────────────────

router.get('/pieces', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { search, archived = 'false' } = req.query;

    const conditions = ['(workspace_id = $1 OR workspace_id IS NULL)', 'est_archive = $2'];
    const params = [wsId, archived === 'true'];
    let idx = 3;

    if (search) {
      conditions.push(`nom ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }

    const rows = await queryAll(
      `SELECT *, (workspace_id IS NULL) AS is_plateforme
       FROM imv2_type_piece
       WHERE ${conditions.join(' AND ')}
       ORDER BY source DESC, nom ASC`,
      params,
    );
    res.json(rows);
  } catch (err) {
    console.error('[templates] GET /pieces', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/pieces', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { nom, categorie_piece, icon } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis' });

    const row = await queryOne(
      `INSERT INTO imv2_type_piece (workspace_id, nom, categorie_piece, icon, source)
       VALUES ($1, $2, $3, $4, 'workspace') RETURNING *`,
      [wsId, nom, categorie_piece || null, icon || null],
    );
    res.status(201).json(row);
  } catch (err) {
    console.error('[templates] POST /pieces', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/pieces/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { nom, categorie_piece, icon } = req.body;

    const existing = await queryOne(
      'SELECT id FROM imv2_type_piece WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    if (!existing) return res.status(404).json({ error: 'Type de pièce introuvable' });

    const row = await queryOne(
      `UPDATE imv2_type_piece SET nom=$1, categorie_piece=$2, icon=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [nom, categorie_piece || null, icon || null, id],
    );
    res.json(row);
  } catch (err) {
    console.error('[templates] PUT /pieces/:id', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/pieces/:id/archive', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { archive = true } = req.body;

    const row = await queryOne(
      `UPDATE imv2_type_piece SET est_archive=$1, updated_at=NOW()
       WHERE id=$2 AND workspace_id=$3 RETURNING *`,
      [archive, id, wsId],
    );
    if (!row) return res.status(404).json({ error: 'Type de pièce introuvable' });
    res.json(row);
  } catch (err) {
    console.error('[templates] PATCH /pieces/:id/archive', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── CatalogueItem ─────────────────────────────────────────────────────────

router.get('/items', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { search, contexte, categorie, archived = 'false' } = req.query;

    const conditions = ['(ci.workspace_id = $1 OR ci.workspace_id IS NULL)', 'ci.est_archive = $2'];
    const params = [wsId, archived === 'true'];
    let idx = 3;

    if (contexte) {
      conditions.push(`ci.contexte = $${idx}`);
      params.push(contexte);
      idx++;
    }
    if (categorie) {
      conditions.push(`ci.categorie = $${idx}`);
      params.push(categorie);
      idx++;
    }
    if (search) {
      conditions.push(`ci.nom ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }

    const rows = await queryAll(
      `SELECT ci.*, (ci.workspace_id IS NULL) AS is_plateforme
       FROM imv2_catalogue_item ci
       WHERE ${conditions.join(' AND ')} AND ci.parent_item_id IS NULL
       ORDER BY ci.categorie ASC, ci.nom ASC`,
      params,
    );
    res.json(rows);
  } catch (err) {
    console.error('[templates] GET /items', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { nom, categorie, contexte = 'edl', aide_contextuelle } = req.body;
    if (!nom || !categorie) return res.status(400).json({ error: 'Nom et catégorie requis' });

    const row = await queryOne(
      `INSERT INTO imv2_catalogue_item (workspace_id, nom, categorie, contexte, aide_contextuelle, source)
       VALUES ($1, $2, $3, $4, $5, 'workspace') RETURNING *`,
      [wsId, nom, categorie, contexte, aide_contextuelle || null],
    );
    res.status(201).json(row);
  } catch (err) {
    console.error('[templates] POST /items', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { nom, categorie, contexte, aide_contextuelle } = req.body;

    const existing = await queryOne(
      'SELECT id FROM imv2_catalogue_item WHERE id=$1 AND workspace_id=$2',
      [id, wsId],
    );
    if (!existing) return res.status(404).json({ error: 'Item introuvable' });

    const row = await queryOne(
      `UPDATE imv2_catalogue_item SET nom=$1, categorie=$2, contexte=$3, aide_contextuelle=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [nom, categorie, contexte || 'edl', aide_contextuelle || null, id],
    );
    res.json(row);
  } catch (err) {
    console.error('[templates] PUT /items/:id', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/items/:id/archive', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { id } = req.params;
    const { archive = true } = req.body;

    const row = await queryOne(
      `UPDATE imv2_catalogue_item SET est_archive=$1, updated_at=NOW()
       WHERE id=$2 AND workspace_id=$3 RETURNING *`,
      [archive, id, wsId],
    );
    if (!row) return res.status(404).json({ error: 'Item introuvable' });
    res.json(row);
  } catch (err) {
    console.error('[templates] PATCH /items/:id/archive', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── TemplatePieceItem ─────────────────────────────────────────────────────

router.get('/pieces/:pieceId/items', async (req, res) => {
  try {
    const { pieceId } = req.params;
    const rows = await queryAll(
      `SELECT tpi.*, ci.nom, ci.categorie, ci.contexte
       FROM imv2_template_piece_item tpi
       INNER JOIN imv2_catalogue_item ci ON ci.id = tpi.catalogue_item_id
       WHERE tpi.type_piece_id = $1
       ORDER BY tpi.ordre_affichage ASC`,
      [pieceId],
    );
    res.json(rows);
  } catch (err) {
    console.error('[templates] GET /pieces/:id/items', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/pieces/:pieceId/items', async (req, res) => {
  try {
    const { pieceId } = req.params;
    const { catalogue_item_id, quantite_defaut = 1, labels_defaut, ordre_affichage = 0 } = req.body;
    if (!catalogue_item_id) return res.status(400).json({ error: 'catalogue_item_id requis' });

    const row = await queryOne(
      `INSERT INTO imv2_template_piece_item (type_piece_id, catalogue_item_id, quantite_defaut, labels_defaut, ordre_affichage)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (type_piece_id, catalogue_item_id) DO UPDATE SET quantite_defaut=$3, labels_defaut=$4, ordre_affichage=$5
       RETURNING *`,
      [pieceId, catalogue_item_id, quantite_defaut, labels_defaut ? JSON.stringify(labels_defaut) : null, ordre_affichage],
    );
    res.status(201).json(row);
  } catch (err) {
    console.error('[templates] POST /pieces/:id/items', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/pieces/:pieceId/items/:itemId', async (req, res) => {
  try {
    const { pieceId, itemId } = req.params;
    await query(
      'DELETE FROM imv2_template_piece_item WHERE type_piece_id=$1 AND catalogue_item_id=$2',
      [pieceId, itemId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[templates] DELETE /pieces/:id/items/:itemId', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── ConfigCritereCategorie ────────────────────────────────────────────────

router.get('/config-criteres', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const rows = await queryAll(
      'SELECT * FROM imv2_config_critere_categorie WHERE workspace_id=$1 ORDER BY categorie',
      [wsId],
    );
    res.json(rows);
  } catch (err) {
    console.error('[templates] GET /config-criteres', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/config-criteres/:categorie', async (req, res) => {
  try {
    const wsId = req.user.workspaceId;
    const { categorie } = req.params;
    const { etat_general, proprete, photos, caracteristiques, couleur, degradations, fonctionnement, quantite } = req.body;

    const row = await queryOne(
      `INSERT INTO imv2_config_critere_categorie
         (workspace_id, categorie, etat_general, proprete, photos, caracteristiques, couleur, degradations, fonctionnement, quantite)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (workspace_id, categorie) DO UPDATE SET
         etat_general=$3, proprete=$4, photos=$5, caracteristiques=$6, couleur=$7,
         degradations=$8, fonctionnement=$9, quantite=$10, updated_at=NOW()
       RETURNING *`,
      [wsId, categorie, etat_general || 'recommande', proprete || 'optionnel',
       photos || 'recommande', caracteristiques || 'optionnel', couleur || 'optionnel',
       degradations || 'optionnel', fonctionnement || 'masque', quantite || 'masque'],
    );
    res.json(row);
  } catch (err) {
    console.error('[templates] PUT /config-criteres/:categorie', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
