import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceDetail {
  id: string;
  name: string;
  type_workspace: string;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  couleur_primaire: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  joined_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const keys = {
  workspace: (id: string) => ['workspace', id] as const,
  members: (workspaceId: string) => ['workspace', workspaceId, 'members'] as const,
  invitations: ['invitations'] as const,
};

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export function useWorkspaceDetail(id: string | undefined) {
  return useQuery({
    queryKey: keys.workspace(id!),
    queryFn: () => apiGet<WorkspaceDetail>(`/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiPut<WorkspaceDetail>(`/workspaces/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.workspace(variables.id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: keys.members(workspaceId!),
    queryFn: () => apiGet<Member[]>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string;
      userId: string;
      role: string;
    }) => apiPut<Member>(`/workspaces/${workspaceId}/members/${userId}`, { role }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.members(variables.workspaceId) });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      userId,
    }: {
      workspaceId: string;
      userId: string;
    }) => apiDelete<{ success: boolean }>(`/workspaces/${workspaceId}/members/${userId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.members(variables.workspaceId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export function useInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      apiPost<Invitation>('/auth/invite', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.invitations });
    },
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: keys.invitations,
    queryFn: () => apiGet<Invitation[]>('/auth/invitations'),
  });
}

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<{ success: boolean }>(`/auth/invitations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.invitations });
    },
  });
}
