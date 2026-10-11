import { apiClient } from '../client';
import type {
  BodyMeasurement,
  MeasurementPayload,
} from '../../types/api.types';

/** One person's measurements: the member's own, or a client's as staff. */
export interface MeasurementsApi {
  list: () => Promise<BodyMeasurement[]>;
  create: (
    payload: MeasurementPayload & { measuredAt: string },
  ) => Promise<BodyMeasurement>;
  update: (id: string, payload: MeasurementPayload) => Promise<BodyMeasurement>;
  remove: (id: string) => Promise<void>;
}

const at = (base: string): MeasurementsApi => ({
  list: async () => {
    const { data } = await apiClient.get<BodyMeasurement[]>(base);
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post<BodyMeasurement>(base, payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.patch<BodyMeasurement>(
      `${base}/${id}`,
      payload,
    );
    return data;
  },
  remove: async (id) => {
    await apiClient.delete(`${base}/${id}`);
  },
});

// Body measurements (specs/body-measurements.md): the same list, read and
// written by the member (/me) and by their trainers (/users/:id).
export const measurementsService = {
  mine: at('/me/measurements'),
  ofClient: (clientId: string) => at(`/users/${clientId}/measurements`),
};
