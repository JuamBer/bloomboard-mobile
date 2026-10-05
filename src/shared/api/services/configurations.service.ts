import { apiClient } from '../client';
import type { Configuration } from '../../types/api.types';

export type ConfigurationUpdate = Partial<Pick<Configuration, 'theme'>>;

/** The member's settings, shared with the web (theme). */
export const configurationsService = {
  getMine: async (): Promise<Configuration> => {
    const { data } = await apiClient.get<Configuration>('/configurations/me');
    return data;
  },

  update: async (patch: ConfigurationUpdate): Promise<Configuration> => {
    const { data } = await apiClient.patch<Configuration>(
      '/configurations/me',
      patch,
    );
    return data;
  },
};
