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
-- TIERS (US588-593, US806-810)
-- ============================================

CREATE TABLE IF NOT EXISTS imv2_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('personne_physique', 'personne_morale')),
  -- Common fields
  email VARCHAR(255),
  telephone VARCHAR(20),
  telephone2 VARCHAR(20),
  adresse TEXT,
  code_postal VARCHAR(10),
  ville VARCHAR(100),
  notes TEXT,
  commentaire TEXT,
  reference_interne VARCHAR(50),
  est_archive BOOLEAN NOT NULL DEFAULT false,
  -- PP-specific fields
  civilite VARCHAR(10),
  nom VARCHAR(255),
  prenom VARCHAR(255),
  date_naissance DATE,
  -- PM-specific fields
  raison_sociale VARCHAR(255),
  siret VARCHAR(14),
  forme_juridique VARCHAR(50),
  representant_nom VARCHAR(255),
  representant_prenom VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link PP to PM (US589)
CREATE TABLE IF NOT EXISTS imv2_tiers_organisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_id UUID NOT NULL REFERENCES imv2_tiers(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES imv2_tiers(id) ON DELETE CASCADE,
  fonction VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(personne_id, organisation_id)
);

-- Link tiers to lots with role (US590, US591)
CREATE TABLE IF NOT EXISTS imv2_lot_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES imv2_lot(id) ON DELETE CASCADE,
  tiers_id UUID NOT NULL REFERENCES imv2_tiers(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('proprietaire', 'locataire', 'mandataire')),
  quote_part NUMERIC(5,2),
  date_debut DATE,
  date_fin DATE,
  est_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lot_id, tiers_id, role)
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
-- MISSIONS + EDL (Sprint 3 — EPIC 13)
-- ============================================

CREATE TABLE IF NOT EXISTS imv2_mission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES imv2_lot(id) ON DELETE RESTRICT,
  reference VARCHAR(20) NOT NULL,
  titre VARCHAR(255),
  statut VARCHAR(20) NOT NULL DEFAULT 'planifiee'
    CHECK (statut IN ('planifiee', 'assignee', 'terminee', 'annulee')),
  statut_rdv VARCHAR(20) NOT NULL DEFAULT 'a_confirmer'
    CHECK (statut_rdv IN ('a_confirmer', 'confirme', 'reporte')),
  date_debut DATE,
  heure_debut TIME,
  date_fin DATE,
  heure_fin TIME,
  commentaire TEXT,
  motif_annulation TEXT,
  est_archive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for mission references M-YYYY-XXXX
CREATE SEQUENCE IF NOT EXISTS imv2_mission_seq;

CREATE TABLE IF NOT EXISTS imv2_mission_technicien (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID NOT NULL REFERENCES imv2_mission(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES imv2_utilisateur(id) ON DELETE CASCADE,
  statut_invitation VARCHAR(20) NOT NULL DEFAULT 'en_attente'
    CHECK (statut_invitation IN ('en_attente', 'accepte', 'refuse')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS imv2_edl_inventaire (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES imv2_mission(id) ON DELETE SET NULL,
  lot_id UUID NOT NULL REFERENCES imv2_lot(id) ON DELETE RESTRICT,
  sens VARCHAR(10) NOT NULL CHECK (sens IN ('entree', 'sortie')),
  type_bail VARCHAR(15) NOT NULL DEFAULT 'individuel'
    CHECK (type_bail IN ('individuel', 'collectif')),
  statut VARCHAR(15) NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'signe', 'infructueux')),
  date_signature TIMESTAMPTZ,
  code_acces VARCHAR(100),
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EDL locataire(s)
CREATE TABLE IF NOT EXISTS imv2_edl_locataire (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edl_id UUID NOT NULL REFERENCES imv2_edl_inventaire(id) ON DELETE CASCADE,
  tiers_id UUID NOT NULL REFERENCES imv2_tiers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(edl_id, tiers_id)
);

CREATE TABLE IF NOT EXISTS imv2_cle_mission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID NOT NULL REFERENCES imv2_mission(id) ON DELETE CASCADE,
  edl_id UUID REFERENCES imv2_edl_inventaire(id) ON DELETE SET NULL,
  type_cle VARCHAR(30) NOT NULL
    CHECK (type_cle IN ('cle_principale','badge','boite_aux_lettres','parking','cave','digicode','autre')),
  quantite INT NOT NULL DEFAULT 1,
  statut VARCHAR(20) NOT NULL DEFAULT 'remise'
    CHECK (statut IN ('remise', 'a_deposer', 'deposee')),
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imv2_indisponibilite_technicien (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES imv2_utilisateur(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES imv2_workspace(id) ON DELETE CASCADE,
  titre VARCHAR(255) NOT NULL DEFAULT 'Indisponible',
  date_debut DATE NOT NULL,
  heure_debut TIME,
  date_fin DATE NOT NULL,
  heure_fin TIME,
  recurrence VARCHAR(20) CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  recurrence_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_imv2_tiers_ws ON imv2_tiers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_tiers_type ON imv2_tiers(workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_imv2_tiers_archive ON imv2_tiers(workspace_id, est_archive);
CREATE INDEX IF NOT EXISTS idx_imv2_tiers_org_pp ON imv2_tiers_organisation(personne_id);
CREATE INDEX IF NOT EXISTS idx_imv2_tiers_org_pm ON imv2_tiers_organisation(organisation_id);
CREATE INDEX IF NOT EXISTS idx_imv2_lot_tiers_lot ON imv2_lot_tiers(lot_id);
CREATE INDEX IF NOT EXISTS idx_imv2_lot_tiers_tiers ON imv2_lot_tiers(tiers_id);
CREATE INDEX IF NOT EXISTS idx_imv2_lot_tiers_role ON imv2_lot_tiers(lot_id, role);

-- Missions indexes
CREATE INDEX IF NOT EXISTS idx_imv2_mission_ws ON imv2_mission(workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_mission_lot ON imv2_mission(lot_id);
CREATE INDEX IF NOT EXISTS idx_imv2_mission_statut ON imv2_mission(workspace_id, statut);
CREATE INDEX IF NOT EXISTS idx_imv2_mission_date ON imv2_mission(workspace_id, date_debut);
CREATE INDEX IF NOT EXISTS idx_imv2_mission_tech ON imv2_mission_technicien(mission_id);
CREATE INDEX IF NOT EXISTS idx_imv2_mission_tech_user ON imv2_mission_technicien(user_id);
CREATE INDEX IF NOT EXISTS idx_imv2_edl_mission ON imv2_edl_inventaire(mission_id);
CREATE INDEX IF NOT EXISTS idx_imv2_edl_lot ON imv2_edl_inventaire(lot_id);
CREATE INDEX IF NOT EXISTS idx_imv2_cle_mission ON imv2_cle_mission(mission_id);
CREATE INDEX IF NOT EXISTS idx_imv2_indispo_user ON imv2_indisponibilite_technicien(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_imv2_indispo_dates ON imv2_indisponibilite_technicien(workspace_id, date_debut, date_fin);
