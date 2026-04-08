export type MissionStatut = 'planifiee' | 'assignee' | 'terminee' | 'annulee';
export type MissionStatutRdv = 'a_confirmer' | 'confirme' | 'reporte';
export type CleMissionStatut = 'remise' | 'a_deposer' | 'deposee';
export type CleMissionType =
  | 'cle_principale' | 'badge' | 'boite_aux_lettres'
  | 'parking' | 'cave' | 'digicode' | 'autre';

export interface MissionTechnicien {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  avatar_color?: string;
  statut_invitation: 'en_attente' | 'accepte' | 'refuse';
}

export interface Mission {
  id: string;
  workspace_id: string;
  lot_id: string;
  reference: string;
  titre?: string;
  statut: MissionStatut;
  statut_rdv: MissionStatutRdv;
  date_debut?: string;
  heure_debut?: string;
  date_fin?: string;
  heure_fin?: string;
  commentaire?: string;
  motif_annulation?: string;
  est_archive: boolean;
  created_at: string;
  updated_at: string;
  // enriched
  lot_designation?: string;
  lot_type_bien?: string;
  batiment_designation?: string;
  rue?: string;
  code_postal?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  nb_techniciens?: number;
  techniciens?: MissionTechnicien[];
}

export interface MissionDetail extends Mission {
  lot: {
    id: string;
    designation: string;
    type_bien: string;
    reference_interne?: string;
    batiment_id: string;
    batiment_designation: string;
    rue?: string;
    code_postal?: string;
    ville?: string;
    latitude?: number;
    longitude?: number;
  };
  cles: CleMission[];
  edls: EdlInventaire[];
}

export interface CleMission {
  id: string;
  mission_id: string;
  edl_id?: string;
  type_cle: CleMissionType;
  quantite: number;
  statut: CleMissionStatut;
  commentaire?: string;
  created_at: string;
  updated_at: string;
}

export interface EdlInventaire {
  id: string;
  mission_id?: string;
  lot_id: string;
  sens: 'entree' | 'sortie';
  type_bail: 'individuel' | 'collectif';
  statut: 'brouillon' | 'signe' | 'infructueux';
  date_signature?: string;
  locataires?: { id: string; nom_complet: string }[];
}

export interface Indisponibilite {
  id: string;
  user_id: string;
  workspace_id: string;
  titre: string;
  date_debut: string;
  heure_debut?: string;
  date_fin: string;
  heure_fin?: string;
  recurrence?: string;
  nom?: string;
  prenom?: string;
  avatar_color?: string;
}

export const STATUT_LABELS: Record<MissionStatut, string> = {
  planifiee: 'Planifiée',
  assignee: 'Assignée',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

export const STATUT_COLORS: Record<MissionStatut, string> = {
  planifiee: 'bg-warning/10 text-warning border-warning/20',
  assignee: 'bg-primary/10 text-primary border-primary/20',
  terminee: 'bg-success/10 text-success border-success/20',
  annulee: 'bg-destructive/10 text-destructive border-destructive/20',
};

export const STATUT_RDV_LABELS: Record<MissionStatutRdv, string> = {
  a_confirmer: 'À confirmer',
  confirme: 'Confirmé',
  reporte: 'Reporté',
};

export const CLE_TYPE_LABELS: Record<CleMissionType, string> = {
  cle_principale: 'Clé principale',
  badge: 'Badge',
  boite_aux_lettres: 'Boîte aux lettres',
  parking: 'Parking',
  cave: 'Cave',
  digicode: 'Digicode',
  autre: 'Autre',
};

export const CLE_STATUT_LABELS: Record<CleMissionStatut, string> = {
  remise: 'Remise',
  a_deposer: 'À déposer',
  deposee: 'Déposée',
};
