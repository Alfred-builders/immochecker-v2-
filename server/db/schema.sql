-- ImmoChecker V2 — Database Schema
-- Prefix: imv2_ (shared Railway PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AUTH & WORKSPACE
-- ============================================

CREATE TABLE IF NOT EXISTS imv2_workspace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom VARCHAR(255) NOT NULL,
  type_workspace VARCHAR(30) NOT NULL CHECK (type_workspace IN ('societe_edl', 'bailleur', 'agence')),
  siret VARCHAR(14),
  email VARCHAR(255),
  telephone VARCHAR(20),
  adresse TEXT,
  code_postal VARCHAR(5),
  ville VARCHAR(100),
  logo_url TEXT,
  couleur_primaire VARCHAR(7) DEFAULT '#2563EB',
  statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'trial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imv2_utilisateur (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  tel VARCHAR(20),
  avatar_color VARCHAR(50) DEFAULT 'blue',
  statut VARCHAR(20) NOT NULL DEFAULT 'actif' CHECK (statut IN ('pending', 'actif', 'suspendu', 'desactive')),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imv2_workspace_user (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES imv2_utilisateur(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'technicien' CHECK (role IN ('admin', 'gestionnaire', 'technicien')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS imv2_invitation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'technicien' CHECK (role IN ('admin', 'gestionnaire', 'technicien')),
  token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  invited_by UUID REFERENCES imv2_utilisateur(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imv2_user_preference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES imv2_utilisateur(id) ON DELETE CASCADE,
  page VARCHAR(100) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, page)
);

-- ============================================
-- PATRIMOINE
-- ============================================

CREATE TABLE IF NOT EXISTS imv2_batiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  designation VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'immeuble' CHECK (type IN ('immeuble', 'maison', 'local_commercial', 'mixte', 'autre')),
  num_batiment VARCHAR(50),
  nb_etages INT,
  annee_construction INT,
  reference_interne VARCHAR(50),
  commentaire TEXT,
  est_archive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imv2_adresse_batiment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batiment_id UUID NOT NULL REFERENCES imv2_batiment(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'principale' CHECK (type IN ('principale', 'secondaire')),
  rue VARCHAR(255) NOT NULL,
  complement VARCHAR(255),
  code_postal VARCHAR(10) NOT NULL,
  ville VARCHAR(100) NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ordre INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imv2_lot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batiment_id UUID NOT NULL REFERENCES imv2_batiment(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  designation VARCHAR(255) NOT NULL,
  type_bien VARCHAR(30) NOT NULL DEFAULT 'appartement' CHECK (type_bien IN ('appartement', 'maison', 'studio', 'local_commercial', 'parking', 'cave', 'autre')),
  reference_interne VARCHAR(50),
  num_appartement VARCHAR(20),
  nb_pieces VARCHAR(20) CHECK (nb_pieces IN ('studio', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'autre')),
  nb_pieces_precision VARCHAR(50),
  etage VARCHAR(30),
  emplacement_palier VARCHAR(100),
  surface NUMERIC(8,2),
  meuble BOOLEAN NOT NULL DEFAULT false,
  chauffage_type VARCHAR(20) CHECK (chauffage_type IN ('individuel', 'collectif', 'aucun')),
  chauffage_mode VARCHAR(20) CHECK (chauffage_mode IN ('gaz', 'electrique', 'fioul', 'autre')),
  eau_chaude_type VARCHAR(20) CHECK (eau_chaude_type IN ('individuelle', 'collective', 'aucun', 'autre')),
  eau_chaude_mode VARCHAR(20) CHECK (eau_chaude_mode IN ('gaz', 'electrique', 'autre')),
  dpe_classe CHAR(1) CHECK (dpe_classe IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  ges_classe CHAR(1) CHECK (ges_classe IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  num_parking VARCHAR(20),
  num_cave VARCHAR(20),
  commentaire TEXT,
  est_archive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ARCHIVE LOG (US582 — cold archiving audit)
-- ============================================

CREATE TABLE IF NOT EXISTS imv2_archive_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('archive', 'restore')),
  performed_by UUID REFERENCES imv2_utilisateur(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_imv2_workspace_user_ws ON imv2_workspace_user(workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_workspace_user_user ON imv2_workspace_user(user_id);
CREATE INDEX IF NOT EXISTS idx_imv2_invitation_token ON imv2_invitation(token);
CREATE INDEX IF NOT EXISTS idx_imv2_invitation_ws ON imv2_invitation(workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_batiment_ws ON imv2_batiment(workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_batiment_archive ON imv2_batiment(workspace_id, est_archive);
CREATE INDEX IF NOT EXISTS idx_imv2_adresse_bat ON imv2_adresse_batiment(batiment_id);
CREATE INDEX IF NOT EXISTS idx_imv2_lot_bat ON imv2_lot(batiment_id);
CREATE INDEX IF NOT EXISTS idx_imv2_lot_ws ON imv2_lot(workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_lot_archive ON imv2_lot(workspace_id, est_archive);
CREATE INDEX IF NOT EXISTS idx_imv2_archive_log_entity ON imv2_archive_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_imv2_user_pref ON imv2_user_preference(user_id, page);
