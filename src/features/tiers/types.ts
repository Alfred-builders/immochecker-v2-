export type TiersType = 'personne_physique' | 'personne_morale';
export type TiersRole = 'proprietaire' | 'locataire' | 'mandataire';

export interface Tiers {
  id: string;
  workspace_id: string;
  type: TiersType;
  // Common
  email?: string;
  telephone?: string;
  telephone2?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  notes?: string;
  commentaire?: string;
  reference_interne?: string;
  est_archive: boolean;
  created_at: string;
  updated_at: string;
  // PP
  civilite?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  // PM
  raison_sociale?: string;
  siret?: string;
  forme_juridique?: string;
  representant_nom?: string;
  representant_prenom?: string;
  // Computed (from list query)
  roles?: TiersRole[];
  nb_lots?: number;
}

export interface LotLink {
  link_id: string;
  role: TiersRole;
  quote_part?: number;
  date_debut?: string;
  date_fin?: string;
  est_principal: boolean;
  lot_id: string;
  lot_designation: string;
  type_bien: string;
  surface?: number;
  etage?: string;
  batiment_id: string;
  batiment_designation: string;
  adresse?: { rue: string; code_postal: string; ville: string } | null;
}

export interface OrganisationLink {
  id: string;
  organisation_id: string;
  fonction?: string;
  raison_sociale?: string;
  siret?: string;
  forme_juridique?: string;
}

export interface PersonneLink {
  id: string;
  personne_id: string;
  fonction?: string;
  nom?: string;
  prenom?: string;
  civilite?: string;
  email?: string;
  telephone?: string;
}

export interface TiersDetail extends Tiers {
  lots: LotLink[];
  organisations: OrganisationLink[];
  personnes: PersonneLink[];
}

export function displayName(t: Tiers): string {
  if (t.type === 'personne_morale') return t.raison_sociale || '';
  return [t.prenom, t.nom].filter(Boolean).join(' ');
}

export function formatRoles(roles?: TiersRole[]): string {
  if (!roles || roles.length === 0) return '';
  const labels: Record<TiersRole, string> = {
    proprietaire: 'Propriétaire',
    locataire: 'Locataire',
    mandataire: 'Mandataire',
  };
  return roles.map((r) => labels[r]).join(', ');
}
