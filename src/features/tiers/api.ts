import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import type { Tiers, TiersDetail } from './types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  tiers: ['tiers'] as const,
  tiersOne: (id: string) => ['tiers', id] as const,
};

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

interface TiersParams {
  search?: string;
  type?: string;
  role?: string;
  archived?: boolean;
}

export function useTiersList(params?: TiersParams) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.type) qs.set('type', params.type);
  if (params?.role) qs.set('role', params.role);
  if (params?.archived !== undefined) qs.set('archived', String(params.archived));
  const query = qs.toString();

  return useQuery({
    queryKey: [...keys.tiers, params],
    queryFn: async () => {
      const res = await apiGet<{ tiers: Tiers[] }>(`/tiers${query ? `?${query}` : ''}`);
      return res.tiers;
    },
  });
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export function useTiers(id: string | undefined) {
  return useQuery({
    queryKey: keys.tiersOne(id!),
    queryFn: async () => {
      const res = await apiGet<{ tiers: TiersDetail }>(`/tiers/${id}`);
      return res.tiers;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function useCreateTiers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost<{ tiers: Tiers }>('/tiers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export function useUpdateTiers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPut<{ tiers: Tiers }>(`/tiers/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.tiersOne(variables.id) });
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

export function useArchiveTiers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<{ tiers: Tiers }>(`/tiers/${id}/archive`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}

// ---------------------------------------------------------------------------
// Organisation links (US589)
// ---------------------------------------------------------------------------

export function useLinkOrganisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tiersId, ...data }: { tiersId: string; organisation_id: string; fonction?: string }) =>
      apiPost(`/tiers/${tiersId}/organisations`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}

export function useUnlinkOrganisation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tiersId, linkId }: { tiersId: string; linkId: string }) =>
      apiDelete(`/tiers/${tiersId}/organisations/${linkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}

// ---------------------------------------------------------------------------
// Lot links (US590/591)
// ---------------------------------------------------------------------------

export function useLinkLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost('/tiers/lot-links', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}

export function useUnlinkLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      apiDelete(`/tiers/lot-links/${linkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.tiers });
    },
  });
}
