import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, queryAll, getClient } from '../db/index.js';
import { signToken, verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── POST /register ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, nom, prenom, workspaceName, workspaceType } = req.body;

  if (!email || !password || !nom || !prenom || !workspaceName || !workspaceType) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check existing user
    const existing = await client.query(
      'SELECT id FROM imv2_utilisateur WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await client.query(
      `INSERT INTO imv2_utilisateur (email, password_hash, nom, prenom, statut)
       VALUES ($1, $2, $3, $4, 'actif')
       RETURNING id, email, nom, prenom, statut, avatar_color, created_at`,
      [email.toLowerCase().trim(), passwordHash, nom.trim(), prenom.trim()]
    );
    const user = userResult.rows[0];

    // Create workspace
    const wsResult = await client.query(
      `INSERT INTO imv2_workspace (nom, type_workspace)
       VALUES ($1, $2)
       RETURNING id, nom, type_workspace, couleur_primaire, statut, created_at`,
      [workspaceName.trim(), workspaceType]
    );
    const workspace = wsResult.rows[0];

    // Link user as admin of workspace
    await client.query(
      `INSERT INTO imv2_workspace_user (workspace_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [workspace.id, user.id]
    );

    await client.query('COMMIT');

    const token = signToken({
      userId: user.id,
      email: user.email,
      workspaceId: workspace.id,
      role: 'admin',
    });

    res.status(201).json({ token, user, workspace });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  } finally {
    client.release();
  }
});

// ─── POST /login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const user = await queryOne(
      `SELECT id, email, password_hash, nom, prenom, statut, avatar_color,
              failed_login_attempts, locked_until
       FROM imv2_utilisateur WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Check lockout
    if (user.failed_login_attempts >= 10 && user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(429).json({
        error: 'Compte temporairement verrouillé suite à trop de tentatives',
        locked_until: user.locked_until,
      });
    }

    // Check password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Increment failed attempts, lock for 15 minutes after 10 failures
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = newAttempts >= 10 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await query(
        `UPDATE imv2_utilisateur SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3`,
        [newAttempts, lockUntil, user.id]
      );
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Reset failed attempts on success
    await query(
      `UPDATE imv2_utilisateur SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // Get workspace memberships
    const memberships = await queryAll(
      `SELECT wu.workspace_id, wu.role, w.nom as workspace_nom, w.type_workspace, w.logo_url, w.couleur_primaire
       FROM imv2_workspace_user wu
       JOIN imv2_workspace w ON w.id = wu.workspace_id
       WHERE wu.user_id = $1 AND w.statut = 'actif'
       ORDER BY wu.created_at ASC`,
      [user.id]
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      statut: user.statut,
      avatar_color: user.avatar_color,
    };

    if (memberships.length === 0) {
      return res.status(403).json({ error: 'Aucun espace de travail actif associé' });
    }

    if (memberships.length === 1) {
      const m = memberships[0];
      const token = signToken({
        userId: user.id,
        email: user.email,
        workspaceId: m.workspace_id,
        role: m.role,
      });
      return res.json({
        token,
        user: safeUser,
        workspace: {
          id: m.workspace_id,
          nom: m.workspace_nom,
          type_workspace: m.type_workspace,
          logo_url: m.logo_url,
          couleur_primaire: m.couleur_primaire,
          role: m.role,
        },
      });
    }

    // Multiple workspaces — user must select
    const token = signToken({ userId: user.id, email: user.email });
    return res.json({
      requireWorkspaceSelect: true,
      token,
      user: safeUser,
      workspaces: memberships.map((m) => ({
        id: m.workspace_id,
        nom: m.workspace_nom,
        type_workspace: m.type_workspace,
        logo_url: m.logo_url,
        couleur_primaire: m.couleur_primaire,
        role: m.role,
      })),
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ─── POST /select-workspace ─────────────────────────────────────
router.post('/select-workspace', verifyToken, async (req, res) => {
  const { workspaceId } = req.body;

  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId requis' });
  }

  try {
    const membership = await queryOne(
      `SELECT wu.role, w.nom as workspace_nom, w.type_workspace, w.logo_url, w.couleur_primaire
       FROM imv2_workspace_user wu
       JOIN imv2_workspace w ON w.id = wu.workspace_id
       WHERE wu.user_id = $1 AND wu.workspace_id = $2 AND w.statut = 'actif'`,
      [req.user.userId, workspaceId]
    );

    if (!membership) {
      return res.status(403).json({ error: 'Accès non autorisé à cet espace de travail' });
    }

    const token = signToken({
      userId: req.user.userId,
      email: req.user.email,
      workspaceId,
      role: membership.role,
    });

    res.json({
      token,
      workspace: {
        id: workspaceId,
        nom: membership.workspace_nom,
        type_workspace: membership.type_workspace,
        logo_url: membership.logo_url,
        couleur_primaire: membership.couleur_primaire,
        role: membership.role,
      },
    });
  } catch (err) {
    console.error('[Auth] Select workspace error:', err);
    res.status(500).json({ error: 'Erreur lors de la sélection du workspace' });
  }
});

// ─── GET /me ─────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id, email, nom, prenom, tel, avatar_color, statut, created_at
       FROM imv2_utilisateur WHERE id = $1`,
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    let workspace = null;
    if (req.user.workspaceId) {
      workspace = await queryOne(
        `SELECT w.id, w.nom, w.type_workspace, w.siret, w.email, w.telephone,
                w.adresse, w.code_postal, w.ville, w.logo_url, w.couleur_primaire, w.statut,
                wu.role
         FROM imv2_workspace w
         JOIN imv2_workspace_user wu ON wu.workspace_id = w.id
         WHERE w.id = $1 AND wu.user_id = $2`,
        [req.user.workspaceId, req.user.userId]
      );
    }

    res.json({ user, workspace });
  } catch (err) {
    console.error('[Auth] /me error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /invite ───────────────────────────────────────────────
router.post('/invite', verifyToken, requireRole('admin', 'gestionnaire'), async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ error: 'Email et rôle requis' });
  }

  if (!['admin', 'gestionnaire', 'technicien'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  if (!req.user.workspaceId) {
    return res.status(400).json({ error: 'Aucun workspace sélectionné' });
  }

  try {
    // Check if user already in workspace
    const existingMember = await queryOne(
      `SELECT wu.id FROM imv2_workspace_user wu
       JOIN imv2_utilisateur u ON u.id = wu.user_id
       WHERE u.email = $1 AND wu.workspace_id = $2`,
      [email.toLowerCase().trim(), req.user.workspaceId]
    );
    if (existingMember) {
      return res.status(409).json({ error: 'Cet utilisateur est déjà membre du workspace' });
    }

    // Check if pending invitation exists
    const existingInvite = await queryOne(
      `SELECT id FROM imv2_invitation
       WHERE email = $1 AND workspace_id = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
      [email.toLowerCase().trim(), req.user.workspaceId]
    );
    if (existingInvite) {
      return res.status(409).json({ error: 'Une invitation en attente existe déjà pour cet email' });
    }

    const invitation = await queryOne(
      `INSERT INTO imv2_invitation (workspace_id, email, role, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
       RETURNING id, workspace_id, email, role, token, expires_at, created_at`,
      [req.user.workspaceId, email.toLowerCase().trim(), role, req.user.userId]
    );

    res.status(201).json({ invitation });
  } catch (err) {
    console.error('[Auth] Invite error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'invitation' });
  }
});

// ─── POST /accept-invite ────────────────────────────────────────
router.post('/accept-invite', async (req, res) => {
  const { token, nom, prenom, password } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token d\'invitation requis' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find valid invitation
    const invResult = await client.query(
      `SELECT id, workspace_id, email, role, accepted_at, expires_at
       FROM imv2_invitation WHERE token = $1`,
      [token]
    );
    const invitation = invResult.rows[0];

    if (!invitation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    if (invitation.accepted_at) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invitation déjà acceptée' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invitation expirée' });
    }

    // Check if user already exists
    const existingResult = await client.query(
      'SELECT id, email, nom, prenom, statut, avatar_color FROM imv2_utilisateur WHERE email = $1',
      [invitation.email]
    );
    let user;

    if (existingResult.rows.length > 0) {
      // Existing user — just add to workspace
      user = existingResult.rows[0];
    } else {
      // New user — must provide credentials
      if (!nom || !prenom || !password) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Nom, prénom et mot de passe requis pour un nouveau compte' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const newUserResult = await client.query(
        `INSERT INTO imv2_utilisateur (email, password_hash, nom, prenom, statut)
         VALUES ($1, $2, $3, $4, 'actif')
         RETURNING id, email, nom, prenom, statut, avatar_color`,
        [invitation.email, passwordHash, nom.trim(), prenom.trim()]
      );
      user = newUserResult.rows[0];
    }

    // Check if already member
    const alreadyMember = await client.query(
      'SELECT id FROM imv2_workspace_user WHERE workspace_id = $1 AND user_id = $2',
      [invitation.workspace_id, user.id]
    );
    if (alreadyMember.rows.length === 0) {
      await client.query(
        `INSERT INTO imv2_workspace_user (workspace_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [invitation.workspace_id, user.id, invitation.role]
      );
    }

    // Mark invitation as accepted
    await client.query(
      'UPDATE imv2_invitation SET accepted_at = NOW() WHERE id = $1',
      [invitation.id]
    );

    await client.query('COMMIT');

    const jwtToken = signToken({
      userId: user.id,
      email: user.email,
      workspaceId: invitation.workspace_id,
      role: invitation.role,
    });

    res.json({ token: jwtToken, user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth] Accept invite error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation de l\'invitation' });
  } finally {
    client.release();
  }
});

// ─── GET /invitations ───────────────────────────────────────────
router.get('/invitations', verifyToken, async (req, res) => {
  if (!req.user.workspaceId) {
    return res.status(400).json({ error: 'Aucun workspace sélectionné' });
  }

  try {
    const invitations = await queryAll(
      `SELECT i.id, i.email, i.role, i.token, i.expires_at, i.created_at,
              u.nom as invited_by_nom, u.prenom as invited_by_prenom
       FROM imv2_invitation i
       LEFT JOIN imv2_utilisateur u ON u.id = i.invited_by
       WHERE i.workspace_id = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [req.user.workspaceId]
    );

    res.json({ invitations });
  } catch (err) {
    console.error('[Auth] List invitations error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /invitations/:id ────────────────────────────────────
router.delete('/invitations/:id', verifyToken, requireRole('admin'), async (req, res) => {
  if (!req.user.workspaceId) {
    return res.status(400).json({ error: 'Aucun workspace sélectionné' });
  }

  try {
    const result = await query(
      `DELETE FROM imv2_invitation
       WHERE id = $1 AND workspace_id = $2 AND accepted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation non trouvée ou déjà acceptée' });
    }

    res.json({ deleted: true });
  } catch (err) {
    console.error('[Auth] Delete invitation error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
