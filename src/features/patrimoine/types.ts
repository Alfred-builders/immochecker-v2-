export interface Adresse {
  id: string;
  batiment_id: string;
  type: 'principale' | 'secondaire';
  rue: string;
  complement?: string;
  code_postal: string;
  ville: string;
  latitude?: number;
  longitude?: number;
  ordre: number;
}

export interface Batiment {
  id: string;
  workspace_id: string;
  designation: string;
  type: string;
  num_batiment?: string;
  nb_etages?: number;
  annee_construction?: number;
  reference_interne?: string;
  commentaire?: string;
  est_archive: boolean;
  created_at: string;
  updated_at: string;
  adresse_principale?: { rue: string; complement?: string; code_postal: string; ville: string } | null;
  nb_lots: number;
}

export function formatAdresse(addr?: { rue?: string; code_postal?: string; ville?: string } | null): string {
  if (!addr) return '';
  return [addr.rue, addr.code_postal, addr.ville].filter(Boolean).join(', ');
}

export interface BatimentDetail extends Batiment {
  adresses: Adresse[];
  lots: Lot[];
}

export interface Lot {
  id: string;
  batiment_id: string;
  workspace_id: string;
  designation: string;
  type_bien: string;
  reference_interne?: string;
  num_appartement?: string;
  nb_pieces?: string;
  etage?: string;
  surface?: number;
  meuble: boolean;
  dpe_classe?: string;
  ges_classe?: string;
  commentaire?: string;
  est_archive: boolean;
  created_at: string;
  updated_at: string;
  batiment_designation?: string;
  adresse_principale?: { rue: string; complement?: string; code_postal: string; ville: string } | null;
}

export interface LotProprietaire {
  tiers_id: string;
  nom_complet: string;
  type: 'physique' | 'morale';
  email?: string;
  telephone?: string;
  date_debut?: string;
  date_fin?: string;
}

export interface LotMandataire {
  tiers_id: string;
  nom_complet: string;
  type: 'physique' | 'morale';
  email?: string;
  telephone?: string;
}

export interface LotDernierLocataire {
  tiers_id: string;
  nom_complet: string;
  type: 'physique' | 'morale';
  email?: string;
  telephone?: string;
  date_edl?: string;
  sens?: 'entree' | 'sortie';
}

export interface LotDetail extends Lot {
  batiment: {
    id: string;
    designation: string;
    type: string;
  };
  chauffage_type?: string;
  chauffage_mode?: string;
  eau_chaude_type?: string;
  eau_chaude_mode?: string;
  num_parking?: string;
  num_cave?: string;
  emplacement_palier?: string;
  nb_pieces_precision?: string;
  mandataire_id?: string;
  proprietaires?: LotProprietaire[];
  mandataire?: LotMandataire | null;
  dernier_locataire?: LotDernierLocataire | null;
}
