import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { getClient } from '../db/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── POST /patrimoine — CSV import for buildings + lots ────────
router.post('/patrimoine', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier CSV requis' });
  }

  const client = await getClient();
  const wsId = req.user.workspaceId;
  const errors = [];
  let imported = 0;

  try {
    // Parse CSV content
    const csvContent = req.file.buffer.toString('utf-8');
    let records;
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        delimiter: [',', ';'],
      });
    } catch (parseErr) {
      return res.status(400).json({
        error: 'Format CSV invalide',
        details: parseErr.message,
      });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'Le fichier CSV est vide' });
    }

    await client.query('BEGIN');

    // Cache: designation -> batiment_id (to avoid duplicates within this import)
    const batimentCache = new Map();

    // Pre-load existing batiment designations for this workspace
    const existingBatiments = (await client.query(
      'SELECT id, designation FROM imv2_batiment WHERE workspace_id = $1',
      [wsId]
    )).rows;
    for (const b of existingBatiments) {
      batimentCache.set(b.designation.toLowerCase().trim(), b.id);
    }

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because row 1 is headers, data starts at row 2

      try {
        const designation = (row.designation || '').trim();
        if (!designation) {
          errors.push({ row: rowNum, message: 'Désignation manquante' });
          continue;
        }

        const cacheKey = designation.toLowerCase();
        let batimentId = batimentCache.get(cacheKey);

        // Create batiment if not already existing
        if (!batimentId) {
          const batimentResult = (await client.query(
            `INSERT INTO imv2_batiment
              (workspace_id, designation, type, num_batiment, annee_construction)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              wsId,
              designation,
              (row.type || '').trim() || null,
              (row.num_batiment || '').trim() || null,
              (row.annee_construction || '').trim()
                ? parseInt(row.annee_construction, 10) || null
                : null,
            ]
          )).rows[0];
          batimentId = batimentResult.id;
          batimentCache.set(cacheKey, batimentId);

          // Create adresse if address fields present
          const rue = (row.rue || '').trim();
          const codePostal = (row.code_postal || '').trim();
          const ville = (row.ville || '').trim();

          if (rue || codePostal || ville) {
            await client.query(
              `INSERT INTO imv2_adresse_batiment
                (batiment_id, type, rue, code_postal, ville, ordre)
               VALUES ($1, 'principale', $2, $3, $4, 0)`,
              [batimentId, rue || null, codePostal || null, ville || null]
            );
          }
        }

        // Create lot if lot_designation present
        const lotDesignation = (row.lot_designation || '').trim();
        if (lotDesignation) {
          const surface = (row.surface || '').trim();
          const nbPieces = (row.nb_pieces || '').trim();
          const etage = (row.etage || '').trim();
          const meuble = (row.meuble || '').trim().toLowerCase();

          await client.query(
            `INSERT INTO imv2_lot
              (batiment_id, workspace_id, designation, type_bien, etage, surface, meuble, nb_pieces)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              batimentId,
              wsId,
              lotDesignation,
              (row.type_bien || '').trim() || null,
              etage ? parseInt(etage, 10) || null : null,
              surface ? parseFloat(surface) || null : null,
              meuble === 'oui' || meuble === 'true' || meuble === '1' ? true
                : meuble === 'non' || meuble === 'false' || meuble === '0' ? false
                : null,
              nbPieces ? parseInt(nbPieces, 10) || null : null,
            ]
          );
        }

        imported++;
      } catch (rowErr) {
        errors.push({ row: rowNum, message: rowErr.message });
      }
    }

    await client.query('COMMIT');

    res.json({ imported, errors });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Import] Patrimoine error:', err);
    res.status(500).json({ error: "Erreur lors de l'import", details: err.message });
  } finally {
    client.release();
  }
});

export default router;
