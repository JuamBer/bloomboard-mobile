import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  METRICS_CATALOG_KEY,
  metricsService,
} from '@shared/api/services/metrics.service';

/** Every metric, composite and unit. Rarely changes: cached for an hour. */
export function useMetricsCatalog() {
  return useQuery({
    queryKey: METRICS_CATALOG_KEY,
    queryFn: metricsService.getCatalog,
    staleTime: 60 * 60 * 1000,
  });
}

/** A unit key's compact form ("KILOGRAMS" → "kg"), from the catalog. */
export function useUnitAcronym() {
  const { data: catalog } = useMetricsCatalog();
  return useMemo(() => {
    const map = new Map((catalog?.units ?? []).map((u) => [u.key, u.acronym]));
    return (key: string) => map.get(key) ?? key;
  }, [catalog]);
}
