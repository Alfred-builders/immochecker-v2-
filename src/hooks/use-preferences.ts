import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api';

interface PreferencesResponse {
  config: Record<string, unknown>;
}

export function usePreferences(page: string) {
  return useQuery({
    queryKey: ['preferences', page],
    queryFn: () => apiGet<PreferencesResponse>(`/preferences/${page}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

export function useUpdatePreferences(page: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      apiPut<PreferencesResponse>(`/preferences/${page}`, { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', page] });
    },
  });
}
