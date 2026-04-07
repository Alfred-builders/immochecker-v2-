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
  adresse_principale?: string;
  nb_lots: number;
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
  adresse_principale?: string;
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
}
