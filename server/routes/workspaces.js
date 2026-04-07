import { Router } from 'express';
import { query, queryOne, queryAll } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// ─── GET / — List workspaces for current user ───────────────────
router.get('/', async (req, res) => {
  try {
    const workspaces = await queryAll(
      `SELECT w.id, w.nom, w.type_workspace, w.siret, w.email, w.telephone,
              w.adresse, w.code_postal, w.ville, w.logo_url, w.couleur_primaire, w.statut,
              wu.role, w.created_at
       FROM imv2_workspace w
       JOIN imv2_workspace_user wu ON wu.workspace_id = w.id
       WHERE wu.user_id = $1
       ORDER BY w.nom ASC`,
      [req.user.userId]
    );

    res.json({ workspaces });
  } catch (err) {
    console.error('[Workspace] List error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /:id — Workspace detail ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const workspace = await queryOne(
      `SELECT w.id, w.nom, w.type_workspace, w.siret, w.email, w.telephone,
              w.adresse, w.code_postal, w.ville, w.logo_url, w.couleur_primaire, w.statut,
              wu.role, w.created_at, w.updated_at
       FROM imv2_workspace w
       JOIN imv2_workspace_user wu ON wu.workspace_id = w.id
       WHERE w.id = $1 AND wu.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace non trouvé ou accès refusé' });
    }

    res.json({ workspace });
  } catch (err) {
    console.error('[Workspace] Get error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /:id — Update workspace (admin only) ──────────────────
router.put('/:id', async (req, res) => {
  try {
    // Check admin access
    const membership = await queryOne(
      'SELECT role FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (!membership) {
      return res.status(404).json({ error: 'Workspace non trouvé ou accès refusé' });
    }
    if (membership.role !== 'admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut modifier le workspace' });
    }

    const {
      nom, type_workspace, siret, email, telephone,
      adresse, code_postal, ville, logo_url, couleur_primaire,
    } = req.body;

    const workspace = await queryOne(
      `UPDATE imv2_workspace SET
        nom = COALESCE($1, nom),
        type_workspace = COALESCE($2, type_workspace),
        siret = COALESCE($3, siret),
        email = COALESCE($4, email),
        telephone = COALESCE($5, telephone),
        adresse = COALESCE($6, adresse),
        code_postal = COALESCE($7, code_postal),
        ville = COALESCE($8, ville),
        logo_url = COALESCE($9, logo_url),
        couleur_primaire = COALESCE($10, couleur_primaire),
        updated_at = NOW()
       WHERE id = $11
       RETURNING id, nom, type_workspace, siret, email, telephone,
                 adresse, code_postal, ville, logo_url, couleur_primaire, statut,
                 created_at, updated_at`,
      [nom, type_workspace, siret, email, telephone,
       adresse, code_postal, ville, logo_url, couleur_primaire,
       req.params.id]
    );

    res.json({ workspace });
  } catch (err) {
    console.error('[Workspace] Update error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ─── GET /:id/members — List workspace members ─────────────────
router.get('/:id/members', async (req, res) => {
  try {
    // Verify user has access
    const access = await queryOne(
      'SELECT role FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (!access) {
      return res.status(404).json({ error: 'Workspace non trouvé ou accès refusé' });
    }

    const members = await queryAll(
      `SELECT u.id, u.email, u.nom, u.prenom, u.tel, u.avatar_color, u.statut,
              wu.role, wu.created_at as joined_at
       FROM imv2_workspace_user wu
       JOIN imv2_utilisateur u ON u.id = wu.user_id
       WHERE wu.workspace_id = $1
       ORDER BY wu.role ASC, u.nom ASC`,
      [req.params.id]
    );

    res.json({ members });
  } catch (err) {
    console.error('[Workspace] List members error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PUT /:id/members/:userId — Update member role (admin only) ─
router.put('/:id/members/:userId', async (req, res) => {
  try {
    // Check admin access
    const adminCheck = await queryOne(
      'SELECT role FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (!adminCheck || adminCheck.role !== 'admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut modifier les rôles' });
    }

    const { role } = req.body;
    if (!role || !['admin', 'gestionnaire', 'technicien'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Protect last admin: if changing an admin to non-admin, check count
    if (role !== 'admin') {
      const targetMember = await queryOne(
        'SELECT role FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
        [req.params.id, req.params.userId]
      );

      if (targetMember && targetMember.role === 'admin') {
        const adminCount = await queryOne(
          `SELECT COUNT(*)::int as count FROM imv2_workspace_user
           WHERE workspace_id = $1 AND role = 'admin'`,
          [req.params.id]
        );
        if (adminCount.count <= 1) {
          return res.status(400).json({ error: 'Impossible de retirer le dernier administrateur' });
        }
      }
    }

    const updated = await queryOne(
      `UPDATE imv2_workspace_user SET role = $1, updated_at = NOW()
       WHERE workspace_id = $2 AND user_id = $3
       RETURNING workspace_id, user_id, role, updated_at`,
      [role, req.params.id, req.params.userId]
    );

    if (!updated) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    res.json({ member: updated });
  } catch (err) {
    console.error('[Workspace] Update member error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /:id/members/:userId — Remove member (admin only) ──
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    // Check admin access
    const adminCheck = await queryOne(
      'SELECT role FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (!adminCheck || adminCheck.role !== 'admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut retirer un membre' });
    }

    // Prevent self-removal
    if (req.params.userId === req.user.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous retirer vous-même' });
    }

    // Protect last admin
    const targetMember = await queryOne(
      'SELECT role FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );

    if (!targetMember) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    if (targetMember.role === 'admin') {
      const adminCount = await queryOne(
        `SELECT COUNT(*)::int as count FROM imv2_workspace_user
         WHERE workspace_id = $1 AND role = 'admin'`,
        [req.params.id]
      );
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Impossible de retirer le dernier administrateur' });
      }
    }

    const result = await query(
      'DELETE FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id',
      [req.params.id, req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('[Workspace] Remove member error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
