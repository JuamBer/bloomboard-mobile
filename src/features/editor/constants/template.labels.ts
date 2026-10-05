import type { SetType } from '@shared/types/api.types';

/** Translation key suffix (under `templates:setTypes.*`) for each set type. */
export const SET_TYPE_KEYS: Record<SetType, string> = {
  WARMUP: 'warmup',
  APPROACH: 'approach',
  NORMAL: 'normal',
  ALL_OUT: 'allOut',
  TO_FAILURE: 'toFailure',
  DROP: 'drop',
  REST_PAUSE: 'restPause',
  CLUSTER: 'cluster',
};

/** Each set type's hue (the web's Tailwind 400 shades): the badge is drawn in
 *  it at 10% fill and 20% border, the row tinted at 5%. */
export const SET_TYPE_HUES: Record<SetType, string> = {
  // Calentamiento: naranja
  WARMUP: '#fb923c',
  // Aproximación: ámbar
  APPROACH: '#fbbf24',
  // Normal: neutro (the foreground, picked by the caller)
  NORMAL: '',
  // All out: rosa
  ALL_OUT: '#f472b6',
  // Al fallo: roja
  TO_FAILURE: '#f87171',
  // Drop: azul
  DROP: '#60a5fa',
  // Rest-Pause: cian
  REST_PAUSE: '#22d3ee',
  // Cluster: violeta
  CLUSTER: '#a78bfa',
};

/** Single-character glyph shown for each set type (compact badge). */
export const SET_TYPE_INITIALS: Record<SetType, string> = {
  WARMUP: 'W',
  APPROACH: 'A',
  NORMAL: 'N',
  ALL_OUT: 'O',
  TO_FAILURE: 'F',
  DROP: 'D',
  REST_PAUSE: 'R',
  CLUSTER: 'C',
};
