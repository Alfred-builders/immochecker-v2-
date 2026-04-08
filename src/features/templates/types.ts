export type TypePieceCategorie = 'vie' | 'eau_sanitaires' | 'circulations' | 'exterieur_annexes' | 'parties_communes';
export type ItemContexte = 'edl' | 'inventaire';
export type ItemSource = 'plateforme' | 'workspace';
export type NiveauExigence = 'masque' | 'optionnel' | 'recommande' | 'obligatoire';

export const CATEGORIE_PIECE_LABELS: Record<TypePieceCategorie, string> = {
  vie: 'Pièces de vie',
  eau_sanitaires: 'Eau & Sanitaires',
  circulations: 'Circulations',
  exterieur_annexes: 'Extérieur & Annexes',
  parties_communes: 'Parties communes',
};

export const CATEGORIE_ITEM_LABELS: Record<string, string> = {
  revetements: 'Revêtements',
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  menuiseries: 'Menuiseries',
  mobilier: 'Mobilier',
  electromenager: 'Électroménager',
  chauffage: 'Chauffage',
  ventilation: 'Ventilation',
  sanitaires: 'Sanitaires',
  cuisine: 'Cuisine',
  securite: 'Sécurité',
  exterieur: 'Extérieur',
  communs: 'Communs',
  parking: 'Parking',
  cave: 'Cave',
  divers: 'Divers',
  autre: 'Autre',
};

export const NIVEAU_LABELS: Record<NiveauExigence, string> = {
  masque: 'Masqué',
  optionnel: 'Optionnel',
  recommande: 'Recommandé',
  obligatoire: 'Obligatoire',
};

export interface TypePiece {
  id: string;
  workspace_id: string | null;
  nom: string;
  categorie_piece?: TypePieceCategorie;
  icon?: string;
  source: ItemSource;
  est_archive: boolean;
  is_plateforme?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogueItem {
  id: string;
  workspace_id: string | null;
  nom: string;
  categorie: string;
  contexte: ItemContexte;
  parent_item_id?: string;
  aide_contextuelle?: string;
  source: ItemSource;
  est_archive: boolean;
  is_plateforme?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplatePieceItem {
  id: string;
  type_piece_id: string;
  catalogue_item_id: string;
  nom: string;
  categorie: string;
  quantite_defaut: number;
  labels_defaut?: string[];
  ordre_affichage: number;
}

export interface ConfigCritereCategorie {
  id: string;
  workspace_id: string;
  categorie: string;
  etat_general: NiveauExigence;
  proprete: NiveauExigence;
  photos: NiveauExigence;
  caracteristiques: NiveauExigence;
  couleur: NiveauExigence;
  degradations: NiveauExigence;
  fonctionnement: NiveauExigence;
  quantite: NiveauExigence;
}
