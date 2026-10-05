// Spanish display names for the catalog's enums — the web app's own maps
// (features/exercises/constants/exercise.labels.ts); the catalog's names are
// Spanish-only there too.
import { Equal, Menu, Minus, type LucideIcon } from 'lucide-react-native';
import type {
  BodyPart,
  Difficulty,
  Equipment,
  ExerciseMetric,
  Muscle,
} from '@shared/types/api.types';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  STEPMILL_MACHINE: 'Stepmill',
  ELLIPTICAL_MACHINE: 'Elíptica',
  TRAP_BAR: 'Trap Bar',
  TIRE: 'Neumático',
  STATIONARY_BIKE: 'Bici Estática',
  WHEEL_ROLLER: 'Rueda Ab',
  SMITH_MACHINE: 'Máquina Smith',
  HAMMER: 'Martillo',
  SKIERG_MACHINE: 'SkiErg',
  ROLLER: 'Rodillo',
  RESISTANCE_BAND: 'Banda Elástica',
  BOSU_BALL: 'Bosu',
  WEIGHTED: 'Con Peso',
  OLYMPIC_BARBELL: 'Barra Olímpica',
  KETTLEBELL: 'Kettlebell',
  UPPER_BODY_ERGOMETER: 'Ergómetro',
  SLED_MACHINE: 'Trineo',
  EZ_BARBELL: 'Barra EZ',
  DUMBBELL: 'Mancuerna',
  ROPE: 'Cuerda',
  BARBELL: 'Barra',
  BAND: 'Banda',
  STABILITY_BALL: 'Fitball',
  MEDICINE_BALL: 'Balón Medicinal',
  ASSISTED: 'Asistido',
  LEVERAGE_MACHINE: 'Máquina',
  CABLE: 'Cable',
  BODY_WEIGHT: 'Peso Corporal',
};

export const MUSCLE_LABELS: Record<Muscle, string> = {
  SHINS: 'Tibiales',
  HANDS: 'Manos',
  STERNOCLEIDOMASTOID: 'Esternocleidomastoideo',
  SOLEUS: 'Sóleo',
  INNER_THIGHS: 'Aductores',
  LOWER_ABS: 'Abdomen Inferior',
  GRIP_MUSCLES: 'Agarre',
  ABDOMINALS: 'Abdominales',
  WRIST_EXTENSORS: 'Extensores Muñeca',
  WRIST_FLEXORS: 'Flexores Muñeca',
  LATISSIMUS_DORSI: 'Dorsal',
  UPPER_CHEST: 'Pecho Superior',
  ROTATOR_CUFF: 'Manguito Rotador',
  WRISTS: 'Muñecas',
  GROIN: 'Ingle',
  BRACHIALIS: 'Braquial',
  DELTOIDS: 'Deltoides',
  FEET: 'Pies',
  ANKLES: 'Tobillos',
  TRAPEZIUS: 'Trapecio',
  REAR_DELTOIDS: 'Deltoides Posterior',
  CHEST: 'Pecho',
  QUADRICEPS: 'Cuádriceps',
  BACK: 'Espalda',
  CORE: 'Core',
  SHOULDERS: 'Hombros',
  ANKLE_STABILIZERS: 'Estabilizadores Tobillo',
  RHOMBOIDS: 'Romboides',
  OBLIQUES: 'Oblicuos',
  LOWER_BACK: 'Lumbar',
  HIP_FLEXORS: 'Flexores Cadera',
  LEVATOR_SCAPULAE: 'Elevador Escápula',
  ABDUCTORS: 'Abductores',
  SERRATUS_ANTERIOR: 'Serrato',
  TRAPS: 'Trapecios',
  FOREARMS: 'Antebrazos',
  DELTS: 'Deltoides',
  BICEPS: 'Bíceps',
  UPPER_BACK: 'Espalda Alta',
  SPINE: 'Columna',
  CARDIOVASCULAR_SYSTEM: 'Sistema Cardiovascular',
  TRICEPS: 'Tríceps',
  ADDUCTORS: 'Aductores',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  PECTORALS: 'Pectorales',
  CALVES: 'Gemelos',
  LATS: 'Dorsales',
  QUADS: 'Cuádriceps',
  ABS: 'Abdominales',
};

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  NECK: 'Cuello',
  LOWER_ARMS: 'Antebrazos',
  SHOULDERS: 'Hombros',
  CARDIO: 'Cardio',
  UPPER_ARMS: 'Brazos',
  CHEST: 'Pecho',
  LOWER_LEGS: 'Piernas Inferiores',
  BACK: 'Espalda',
  UPPER_LEGS: 'Piernas Superiores',
  WAIST: 'Cintura',
};

export const EXERCISE_METRIC_LABELS: Record<ExerciseMetric, string> = {
  ABSOLUTE_WEIGHT: 'Peso absoluto',
  ASSISTANCE_WEIGHT: 'Asistencia',
  ADDED_WEIGHT: 'Peso añadido',
  RELATIVE_WEIGHT_PERCENT: 'Peso relativo (%1RM)',
  REPS: 'Repeticiones',
  TEMPO: 'Tempo',
  DISTANCE: 'Distancia',
  PACE: 'Ritmo',
  TIME: 'Tiempo',
  RPE: 'RPE',
  RIR: 'RIR',
  CALORIES: 'Calorías',
  CALORIES_PER_TIME: 'Calorías/Tiempo',
  CARDIO_ZONE: 'Zona cardiovascular',
  ABSOLUTE_POWER: 'Potencia absoluta',
  RELATIVE_POWER: 'Potencia relativa',
  RPM: 'RPM',
  RPM_PER_TIME: 'RPM/Tiempo',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

/** Ink per difficulty (the web's green-400 / yellow-400 / red-400). */
export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  BEGINNER: '#4ade80',
  INTERMEDIATE: '#facc15',
  ADVANCED: '#f87171',
};

/** One/two/three bars to convey increasing difficulty. */
export const DIFFICULTY_ICONS: Record<Difficulty, LucideIcon> = {
  BEGINNER: Minus,
  INTERMEDIATE: Equal,
  ADVANCED: Menu,
};
