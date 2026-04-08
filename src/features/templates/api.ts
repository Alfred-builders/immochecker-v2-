import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import type { TypePiece, CatalogueItem, TemplatePieceItem, ConfigCritereCategorie } from './types';

// ─── TypePiece ─────────────────────────────────────────────────────────────

export function useTypePieces(filters: { search?: string; archived?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.archived) params.set('archived', 'true');
  return useQuery({
    queryKey: ['type-pieces', filters],
    queryFn: () => apiGet<TypePiece[]>(`/templates/pieces?${params.toString()}`),
    staleTime: 60_000,
  });
}

export function useCreateTypePiece() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TypePiece>) => apiPost<TypePiece>('/templates/pieces', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['type-pieces'] }),
  });
}

export function useUpdateTypePiece(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TypePiece>) => apiPut<TypePiece>(`/templates/pieces/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['type-pieces'] }),
  });
}

export function useArchiveTypePiece(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archive: boolean) =>
      apiPatch<TypePiece>(`/templates/pieces/${id}/archive`, { archive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['type-pieces'] }),
  });
}

// ─── CatalogueItem ─────────────────────────────────────────────────────────

export function useCatalogueItems(filters: { search?: string; contexte?: string; categorie?: string; archived?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.contexte) params.set('contexte', filters.contexte);
  if (filters.categorie) params.set('categorie', filters.categorie);
  if (filters.archived) params.set('archived', 'true');
  return useQuery({
    queryKey: ['catalogue-items', filters],
    queryFn: () => apiGet<CatalogueItem[]>(`/templates/items?${params.toString()}`),
    staleTime: 60_000,
  });
}

export function useCreateCatalogueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CatalogueItem>) => apiPost<CatalogueItem>('/templates/items', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogue-items'] }),
  });
}

export function useUpdateCatalogueItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CatalogueItem>) => apiPut<CatalogueItem>(`/templates/items/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogue-items'] }),
  });
}

export function useArchiveCatalogueItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archive: boolean) =>
      apiPatch<CatalogueItem>(`/templates/items/${id}/archive`, { archive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalogue-items'] }),
  });
}

// ─── TemplatePieceItems ────────────────────────────────────────────────────

export function useTemplatePieceItems(pieceId: string | undefined) {
  return useQuery({
    queryKey: ['template-piece-items', pieceId],
    queryFn: () => apiGet<TemplatePieceItem[]>(`/templates/pieces/${pieceId}/items`),
    enabled: !!pieceId,
    staleTime: 60_000,
  });
}

// ─── ConfigCriteres ────────────────────────────────────────────────────────

export function useConfigCriteres() {
  return useQuery({
    queryKey: ['config-criteres'],
    queryFn: () => apiGet<ConfigCritereCategorie[]>('/templates/config-criteres'),
    staleTime: 60_000,
  });
}

export function useUpdateConfigCritere() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categorie, ...data }: { categorie: string } & Partial<ConfigCritereCategorie>) =>
      apiPut<ConfigCritereCategorie>(`/templates/config-criteres/${categorie}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config-criteres'] }),
  });
}
