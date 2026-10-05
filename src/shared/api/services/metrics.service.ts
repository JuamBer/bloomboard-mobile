import { apiClient } from '../client';
import type { MetricsCatalog } from '../../types/api.types';

export const METRICS_CATALOG_KEY = ['metrics', 'catalog'] as const;

export const metricsService = {
  /** Every metric, composite and unit — what sets are printed with. Open to
   *  members (@AllowMember). */
  getCatalog: async (): Promise<MetricsCatalog> => {
    const { data } = await apiClient.get<MetricsCatalog>('/metrics/catalog');
    return data;
  },
};
