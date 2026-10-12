import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CONFIGURATION_QUERY_KEY } from '@features/auth/AppEffects';
import { useAuthStore } from '@features/auth/auth.store';
import { configurationsService } from '@shared/api/services/configurations.service';
import type { Configuration, UnitSystem } from '@shared/types/api.types';

/**
 * The member's unit system (kg/km/cm or lb/mi/in) — the configuration read
 * the theme already makes (AppEffects), so it costs no request of its own.
 * Metric until the server says otherwise.
 */
export function useUnitSystem(): UnitSystem {
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const { data } = useQuery({
    queryKey: CONFIGURATION_QUERY_KEY,
    queryFn: configurationsService.getMine,
    enabled: signedIn,
    staleTime: Infinity,
  });
  return data?.unitSystem ?? 'METRIC';
}

/** Changes it, applying at once everywhere that reads `useUnitSystem`. */
export function useSetUnitSystem() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (unitSystem: UnitSystem) =>
      configurationsService.update({ unitSystem }),
    onMutate: (unitSystem) => {
      const previous = queryClient.getQueryData<Configuration>(
        CONFIGURATION_QUERY_KEY,
      );
      if (previous) {
        queryClient.setQueryData(CONFIGURATION_QUERY_KEY, {
          ...previous,
          unitSystem,
        });
      }
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONFIGURATION_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (config) =>
      queryClient.setQueryData(CONFIGURATION_QUERY_KEY, config),
  });
  return { setUnitSystem: mutation.mutate, isSaving: mutation.isPending };
}
