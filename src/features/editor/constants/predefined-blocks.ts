import type { BlockMode } from '@shared/types/api.types';

export interface PredefinedBlock {
  name: string;
  description: string;
  color: string;
  mode: BlockMode;
}

// Predefined block presets shown in the block editor. They are only frontend
// presets: selecting one prefills the form, and saving always creates a brand
// new block row (a copy), so editing it never affects other templates.
export const PREDEFINED_BLOCKS: PredefinedBlock[] = [
  {
    name: 'Calentamiento',
    description:
      'Movilidad articular y activación previa al trabajo principal.',
    color: '#f59e0b',
    mode: 'NORMAL',
  },
  {
    name: 'Principal',
    description: 'Trabajo principal de fuerza/hipertrofia de la sesión.',
    color: '#22c55e',
    mode: 'NORMAL',
  },
  {
    name: 'HIIT',
    description: 'Intervalos de alta intensidad para acabar la sesión.',
    color: '#ef4444',
    mode: 'WORK_REST',
  },
];
