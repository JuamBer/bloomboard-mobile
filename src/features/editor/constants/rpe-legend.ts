export interface RpeLegendRow {
  rpe: number;
  feelingKey: string;
  /** Approximate reps in reserve (RIR) — translation key. */
  rirKey: string;
}

export const RPE_LEGEND: RpeLegendRow[] = [
  { rpe: 1, feelingKey: 'rpe1', rirKey: 'rir1' },
  { rpe: 2, feelingKey: 'rpe2', rirKey: 'rir2' },
  { rpe: 3, feelingKey: 'rpe3', rirKey: 'rir3' },
  { rpe: 4, feelingKey: 'rpe4', rirKey: 'rir4' },
  { rpe: 5, feelingKey: 'rpe5', rirKey: 'rir5' },
  { rpe: 6, feelingKey: 'rpe6', rirKey: 'rir6' },
  { rpe: 7, feelingKey: 'rpe7', rirKey: 'rir7' },
  { rpe: 8, feelingKey: 'rpe8', rirKey: 'rir8' },
  { rpe: 9, feelingKey: 'rpe9', rirKey: 'rir9' },
  { rpe: 10, feelingKey: 'rpe10', rirKey: 'rir10' },
];
