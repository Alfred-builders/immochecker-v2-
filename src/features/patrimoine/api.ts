import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import type { Batiment, BatimentDetail, Lot, LotDetail } from './types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  batiments: ['batiments'] as const,
  batiment: (id: string) => ['batiments', id] as const,
  lots: ['lots'] as const,
  lot: (id: string) => ['lots', id] as const,
};

// ---------------------------------------------------------------------------
// Batiments
// ---------------------------------------------------------------------------

interface BatimentsParams {
  search?: string;
  type?: string;
  archived?: boolean;
}

export function useBatiments(params?: BatimentsParams) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.type) qs.set('type', params.type);
  if (params?.archived !== undefined) qs.set('archived', String(params.archived));
  const query = qs.toString();

  return useQuery({
    queryKey: [...keys.batiments, params],
    queryFn: async () => {
      const res = await apiGet<{ batiments: Batiment[] }>(`/batiments${query ? `?${query}` : ''}`);
      return res.batiments;
    },
  });
}

export function useBatiment(id: string | undefined) {
  return useQuery({
    queryKey: keys.batiment(id!),
    queryFn: async () => {
      const res = await apiGet<{ batiment: BatimentDetail }>(`/batiments/${id}`);
      return res.batiment;
    },
    enabled: !!id,
  });
}

export function useCreateBatiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<BatimentDetail>('/batiments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.batiments });
    },
  });
}

export function useCreateHouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<BatimentDetail>('/batiments/house', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.batiments });
    },
  });
}

export function useUpdateBatiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPut<BatimentDetail>(`/batiments/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.batiment(variables.id) });
      qc.invalidateQueries({ queryKey: keys.batiments });
    },
  });
}

export function useArchiveBatiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ success: boolean }>(`/batiments/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.batiments });
      qc.invalidateQueries({ queryKey: keys.lots });
    },
  });
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

interface LotsParams {
  search?: string;
  type_bien?: string;
  batiment_id?: string;
  archived?: boolean;
}

export function useLots(params?: LotsParams) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.type_bien) qs.set('type_bien', params.type_bien);
  if (params?.batiment_id) qs.set('batiment_id', params.batiment_id);
  if (params?.archived !== undefined) qs.set('archived', String(params.archived));
  const query = qs.toString();

  return useQuery({
    queryKey: [...keys.lots, params],
    queryFn: async () => {
      const res = await apiGet<{ lots: Lot[] }>(`/lots${query ? `?${query}` : ''}`);
      return res.lots;
    },
  });
}

export function useLot(id: string | undefined) {
  return useQuery({
    queryKey: keys.lot(id!),
    queryFn: async () => {
      const res = await apiGet<{ lot: LotDetail }>(`/lots/${id}`);
      return res.lot;
    },
    enabled: !!id,
  });
}

export function useCreateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<Lot>('/lots', data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.lots });
      if (variables.batiment_id) {
        qc.invalidateQueries({
          queryKey: keys.batiment(variables.batiment_id as string),
        });
      }
    },
  });
}

export function useUpdateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPut<LotDetail>(`/lots/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.lot(variables.id) });
      qc.invalidateQueries({ queryKey: keys.lots });
      qc.invalidateQueries({ queryKey: keys.batiments });
    },
  });
}

export function useArchiveLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ success: boolean }>(`/lots/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lots });
      qc.invalidateQueries({ queryKey: keys.batiments });
    },
  });
}

// ---------------------------------------------------------------------------
// Lot tiers associations (proprietaires + mandataire)
// ---------------------------------------------------------------------------

export function useLinkProprietaireToLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lotId,
      tiers_id,
      date_debut,
      date_fin,
    }: {
      lotId: string;
      tiers_id: string;
      date_debut?: string;
      date_fin?: string;
    }) => apiPost(`/lots/${lotId}/proprietaires`, { tiers_id, date_debut, date_fin }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.lot(vars.lotId) });
    },
  });
}

export function useUnlinkProprietaireFromLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lotId, tiersId }: { lotId: string; tiersId: string }) =>
      apiDelete(`/lots/${lotId}/proprietaires/${tiersId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.lot(vars.lotId) });
    },
  });
}

export function useSetLotMandataire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lotId, tiers_id }: { lotId: string; tiers_id: string | null }) =>
      apiPut(`/lots/${lotId}/mandataire`, { tiers_id }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.lot(vars.lotId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Import CSV
// ---------------------------------------------------------------------------

interface ImportResult {
  imported: number;
  errors: string[];
}

export function useImportCSV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('imv2_token');
      const res = await fetch('/api/import/patrimoine', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.batiments });
      qc.invalidateQueries({ queryKey: keys.lots });
    },
  });
}
