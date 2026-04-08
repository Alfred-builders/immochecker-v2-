import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import type { Mission, MissionDetail, CleMission, Indisponibilite } from './types';

interface MissionListResponse {
  data: Mission[];
  meta: { cursor: string | null; has_more: boolean; total: number };
}

export interface MissionFilters {
  search?: string;
  statut?: string;
  technicien_id?: string;
  lot_id?: string;
  batiment_id?: string;
  date_from?: string;
  date_to?: string;
  archived?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────

export function useMissions(filters: MissionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.statut) params.set('statut', filters.statut);
  if (filters.technicien_id) params.set('technicien_id', filters.technicien_id);
  if (filters.lot_id) params.set('lot_id', filters.lot_id);
  if (filters.batiment_id) params.set('batiment_id', filters.batiment_id);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.archived) params.set('archived', 'true');

  return useQuery({
    queryKey: ['missions', filters],
    queryFn: () =>
      apiGet<MissionListResponse>(`/missions?${params.toString()}`).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useMissionStats() {
  return useQuery({
    queryKey: ['missions', 'stats'],
    queryFn: () => apiGet<any>('/missions/stats'),
    staleTime: 60_000,
  });
}

export function useMissionDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['missions', id],
    queryFn: () => apiGet<MissionDetail>(`/missions/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useIndisponibilites(params: { date_from?: string; date_to?: string } = {}) {
  const query = new URLSearchParams();
  if (params.date_from) query.set('date_from', params.date_from);
  if (params.date_to) query.set('date_to', params.date_to);
  return useQuery({
    queryKey: ['indisponibilites', params],
    queryFn: () => apiGet<Indisponibilite[]>(`/missions/indisponibilites?${query.toString()}`),
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateMission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPost<MissionDetail>('/missions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useUpdateMission(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiPut<MissionDetail>(`/missions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['missions', id] });
    },
  });
}

export function useCancelMission(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (motif_annulation?: string) =>
      apiPatch<MissionDetail>(`/missions/${id}/cancel`, { motif_annulation }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['missions', id] });
    },
  });
}

export function useAssignTechnicien(missionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) =>
      apiPost(`/missions/${missionId}/techniciens`, { user_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['missions', missionId] });
    },
  });
}

export function useRemoveTechnicien(missionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiDelete(`/missions/${missionId}/techniciens/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions'] });
      qc.invalidateQueries({ queryKey: ['missions', missionId] });
    },
  });
}

export function useAddCle(missionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CleMission>) =>
      apiPost<CleMission>(`/missions/${missionId}/cles`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions', missionId] }),
  });
}

export function useUpdateCle(missionId: string, cleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CleMission>) =>
      apiPatch<CleMission>(`/missions/${missionId}/cles/${cleId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions', missionId] }),
  });
}

export function useDeleteCle(missionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cleId: string) =>
      apiDelete(`/missions/${missionId}/cles/${cleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions', missionId] }),
  });
}

export function useCreateIndisponibilite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiPost<Indisponibilite>('/missions/indisponibilites', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indisponibilites'] }),
  });
}

export function useDeleteIndisponibilite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/missions/indisponibilites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indisponibilites'] }),
  });
}
