import { apiClient } from '../client';
import type {
  HevyDecision,
  HevyImportResult,
  HevyPreview,
} from '../../types/api.types';

/** A file the document picker handed over. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  /** The browser's File, on the web build (development checks only). */
  file?: File;
}

const MULTIPART = { 'Content-Type': 'multipart/form-data' };

const form = (files: PickedFile[], decisions?: HevyDecision[]) => {
  const body = new FormData();
  for (const f of files) {
    // React Native uploads a file from its uri; the web build has a File.
    body.append(
      'files',
      f.file ??
        ({
          uri: f.uri,
          name: f.name,
          type: f.mimeType || 'text/csv',
        } as unknown as Blob),
    );
  }
  body.append('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (decisions) body.append('decisions', JSON.stringify(decisions));
  return body;
};

// Bringing a member's history over from Hevy (backend specs/hevy-import.md):
// the same files twice — a preview that writes nothing, then the import with
// the member's answer for each exercise. Mirrors the web's imports.service.
export const importsService = {
  previewHevy: async (files: PickedFile[]): Promise<HevyPreview> => {
    const { data } = await apiClient.post<HevyPreview>(
      '/me/imports/hevy/preview',
      form(files),
      { headers: MULTIPART, timeout: 90_000, silentErrors: true },
    );
    return data;
  },

  importHevy: async (
    files: PickedFile[],
    decisions: HevyDecision[],
  ): Promise<HevyImportResult> => {
    const { data } = await apiClient.post<HevyImportResult>(
      '/me/imports/hevy',
      form(files, decisions),
      // A long history takes a while to write.
      { headers: MULTIPART, timeout: 180_000 },
    );
    return data;
  },
};
