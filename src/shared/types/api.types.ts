// The API's shapes as the member app reads them — a slice of the web app's
// src/shared/types/api.types.ts (bloomboard-frontend), copied section by
// section so both clients describe the same contract. When the backend changes
// one of these, change it in both places (AGENTS.md → Keeping in step).

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PROFESSIONAL' | 'CLIENT';

/** PHYSICAL = a real site. VIRTUAL = the workspace of a business without
 *  premises: no address, never billed as a centre, hidden while it is the
 *  company's only centre. */
export type CenterKind = 'PHYSICAL' | 'VIRTUAL';

export type ThemeMode = 'SYSTEM' | 'LIGHT' | 'DARK';

// Brand colour profile a company's UI is painted in (see shared/theme).
export type ColorPalette = 'BLOOM' | 'SUNSET' | 'LAVENDER' | 'PULSE' | 'MENTAL';

// Editing lifecycle of a routine or workout template. Mirror of the backend
// ContentStatus enum. DRAFT is editable; FINAL freezes the content and blocks
// deletion until it is reopened. Orthogonal to master/company/user ownership.
export type ContentStatus = 'DRAFT' | 'FINAL';

export type SessionUserStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'INJURED'
  // Booking cancelled (kept as history; excluded from the TV and attendee counts).
  | 'CANCELLED';

export type ExerciseStatus =
  'PENDING' | 'ACTIVE' | 'REST' | 'COMPLETED' | 'SKIPPED';

/** @deprecated Use metric.key (string) instead — kept only for static label maps */
export type ExerciseMetric = string;

export type MetricValueType =
  'NUMBER' | 'FREE_TEXT' | 'FORMAT_TEXT' | 'OPTIONS' | 'TIME';

export interface MetricOption {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number;
}

export interface Metric {
  id: string;
  key: string;
  name: string;
  acronym?: string | null;
  /** Trainer-facing explanation from the catalog. The TV legend falls back to
   *  it for metrics it has no plain-language line of its own for. */
  description?: string | null;
  valueType: MetricValueType;
  units: string[];
  defaultUnit: string | null;
  format: string | null;
  source: string | null;
  options: MetricOption[];
}

/** Measurement unit reference (key + compact acronym). Spanish display names
 *  are resolved on the frontend via UNIT_LABELS. */
export interface Unit {
  key: string;
  acronym: string;
}

export interface CompositeMetric {
  id: string;
  key: string;
  name: string;
  /** Compact display form for dense table headers (falls back to `name`). */
  acronym?: string | null;
  description?: string | null;
  valueType: MetricValueType;
  /** Compound Unit.key values, e.g. KILOMETERS_PER_HOUR. */
  units: string[];
  defaultUnit: string | null;
  numerator: {
    id: string;
    key: string;
    name: string;
    units: string[];
    defaultUnit: string | null;
  };
  denominator: {
    id: string;
    key: string;
    name: string;
    units: string[];
    defaultUnit: string | null;
  };
}

export interface MetricsCatalog {
  metrics: Metric[];
  compositeMetrics: CompositeMetric[];
  units: Unit[];
}

export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

// How a block is performed. NORMAL is the classic table the trainer walks the
// client through. WORK_REST is a timed circuit: every set carries a TIME (work)
// and a REST, and the TV runs the block on a clock, advancing on its own.
export type BlockMode = 'NORMAL' | 'WORK_REST';

export type SetType =
  | 'WARMUP'
  | 'APPROACH'
  | 'NORMAL'
  | 'ALL_OUT'
  | 'TO_FAILURE'
  | 'DROP'
  | 'REST_PAUSE'
  | 'CLUSTER';

export type MetricMode = 'EXACT' | 'RANGE' | 'LESS_THAN' | 'GREATER_THAN';

export interface MetricValue {
  /** How a plan states the value (a range, a bound…). Absent on what a
   *  workout logged: what was done is always one exact value. */
  mode?: MetricMode;
  value?: number | string | null;
  min?: number | string | null;
  max?: number | string | null;
  unit?: string | null;
}

export type SetMetrics = Record<string, MetricValue>;

export type Equipment =
  | 'STEPMILL_MACHINE'
  | 'ELLIPTICAL_MACHINE'
  | 'TRAP_BAR'
  | 'TIRE'
  | 'STATIONARY_BIKE'
  | 'WHEEL_ROLLER'
  | 'SMITH_MACHINE'
  | 'HAMMER'
  | 'SKIERG_MACHINE'
  | 'ROLLER'
  | 'RESISTANCE_BAND'
  | 'BOSU_BALL'
  | 'WEIGHTED'
  | 'OLYMPIC_BARBELL'
  | 'KETTLEBELL'
  | 'UPPER_BODY_ERGOMETER'
  | 'SLED_MACHINE'
  | 'EZ_BARBELL'
  | 'DUMBBELL'
  | 'ROPE'
  | 'BARBELL'
  | 'BAND'
  | 'STABILITY_BALL'
  | 'MEDICINE_BALL'
  | 'ASSISTED'
  | 'LEVERAGE_MACHINE'
  | 'CABLE'
  | 'BODY_WEIGHT';

export type Muscle =
  | 'SHINS'
  | 'HANDS'
  | 'STERNOCLEIDOMASTOID'
  | 'SOLEUS'
  | 'INNER_THIGHS'
  | 'LOWER_ABS'
  | 'GRIP_MUSCLES'
  | 'ABDOMINALS'
  | 'WRIST_EXTENSORS'
  | 'WRIST_FLEXORS'
  | 'LATISSIMUS_DORSI'
  | 'UPPER_CHEST'
  | 'ROTATOR_CUFF'
  | 'WRISTS'
  | 'GROIN'
  | 'BRACHIALIS'
  | 'DELTOIDS'
  | 'FEET'
  | 'ANKLES'
  | 'TRAPEZIUS'
  | 'REAR_DELTOIDS'
  | 'CHEST'
  | 'QUADRICEPS'
  | 'BACK'
  | 'CORE'
  | 'SHOULDERS'
  | 'ANKLE_STABILIZERS'
  | 'RHOMBOIDS'
  | 'OBLIQUES'
  | 'LOWER_BACK'
  | 'HIP_FLEXORS'
  | 'LEVATOR_SCAPULAE'
  | 'ABDUCTORS'
  | 'SERRATUS_ANTERIOR'
  | 'TRAPS'
  | 'FOREARMS'
  | 'DELTS'
  | 'BICEPS'
  | 'UPPER_BACK'
  | 'SPINE'
  | 'CARDIOVASCULAR_SYSTEM'
  | 'TRICEPS'
  | 'ADDUCTORS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'PECTORALS'
  | 'CALVES'
  | 'LATS'
  | 'QUADS'
  | 'ABS';

export type BodyPart =
  | 'NECK'
  | 'LOWER_ARMS'
  | 'SHOULDERS'
  | 'CARDIO'
  | 'UPPER_ARMS'
  | 'CHEST'
  | 'LOWER_LEGS'
  | 'BACK'
  | 'UPPER_LEGS'
  | 'WAIST';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

// ─── Base Entities ────────────────────────────────────────────────────────────

export interface CompanyOwned {
  companyId: string | null;
}

export interface Audit {
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  /** Nickname ("apodo"), shown on the TV instead of the name and searchable.
   *  Absent from payloads that don't select it (e.g. the auth profile). */
  alias?: string | null;
  role: Role;
  companyId: string | null;
  isActive: boolean;
  timpSubscriptionUuid: string | null;
  /** When the person set their own password and took ownership of the
   *  account. */
  claimedAt?: string | null;
  company?: { id: string; commercialName: string } | null;
  centers?: { id: string; name: string }[];
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  avatarUrl: string | null;
  address?: string | null;
  postalCode?: string | null;
  configuration?: Configuration | null;
  createdAt: string;
  updatedAt: string;
}

// Per-user settings (UI preferences). One row per user.
export interface Configuration {
  id: string;
  userId: string;
  theme: ThemeMode;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  /** Owner: a company, a member (userId), or — both null — the catalog. */
  companyId: string | null;
  userId?: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Classification
  metrics: Metric[];
  compositeMetrics: CompositeMetric[];
  difficulty: Difficulty | null;
  bodyParts: BodyPart[];
  equipments: Equipment[];
  targetMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  // Content
  overview: string | null;
  instructions: string[];
  exerciseTips: string[];
  variations: string[];
  keywords: string[];
  // Media
  imageUrls: string[];
  gifUrls: string[];
  relatedExerciseIds: string[];
}

export interface QueryExercisesParams extends QueryParams {
  sortBy?: 'name' | 'createdAt' | 'difficulty';
  search?: string;
  equipment?: Equipment;
  muscle?: Muscle;
  bodyPart?: BodyPart;
  metric?: string;
  difficulty?: Difficulty;
  isMaster?: boolean;
}

export interface Goal extends CompanyOwned, Audit {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
}

// Lightweight goal shape returned nested on Routine/WorkoutTemplate responses.
export type GoalLink = Pick<Goal, 'id' | 'name' | 'color' | 'icon'>;

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  difficulty: Difficulty | null;
  companyId: string | null;
  // Set when the template is a private snapshot owned by a client (not in the catalog).
  userId?: string | null;
  // On a client's snapshot: the company that prepared it. Null on the member's
  // own content (see features/member).
  assignedByCompanyId?: string | null;
  status: ContentStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  goals?: GoalLink[];
  blocks?: WorkoutTemplateBlock[]; // present on detail responses
}

// Lightweight block summary returned on list responses (and nested in routines)
// so the UI can derive exercise/block counts and hover tooltips.
export interface WorkoutTemplateBlockSummary {
  id: string;
  /** Null = the loose exercises at the template level. */
  name: string | null;
  index: number;
  exercises: { customName: string | null; exercise: { name: string } }[];
}

export interface WorkoutTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  difficulty: Difficulty | null;
  companyId: string | null;
  userId?: string | null;
  status: ContentStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  goals?: GoalLink[];
  blocks: WorkoutTemplateBlockSummary[];
  // Only sent when nested under a routine workout: how many routines use this
  // template, so the finalize dialog can warn before cascading a lock onto a
  // template that other routines share.
  _count?: { routineEntries: number };
}

// ─── The workout editor's shape ──────────────────────────────────────────────
// What the shared editor, the TV and the board read — a plan's tree
// (WorkoutTemplate*) or a workout's (Workout*). Each concrete type extends
// these, so one component renders both.

/** One set: a plan's (any mode) or a workout's (what was done, exact). */
export interface EditorSet {
  id: string;
  /** Index within its own exercise. */
  order: number;
  /** Index within the exercise's super-set group, in the order the client
   *  performs it. One slot of a super-set sequence *is* one set, so this is the
   *  whole ordering model. Null when the exercise isn't in a group; always null
   *  on sub-sets, which live inside their parent set's slot. */
  superSetOrder: number | null;
  setType: SetType;
  metrics: SetMetrics;
  /** A coach's comment on this one set (a plan), or the member's (a workout). */
  notes?: string | null;
  /** A workout's: the plan's comment on it — the comment field's placeholder. */
  planNotes?: string | null;
  parentSetId?: string | null;
  subSets?: EditorSet[];
  /** A workout's: what the plan asked for — the field's placeholder. */
  targetMetrics?: SetMetrics | null;
  /** A workout's: when it was ticked as done. */
  completedAt?: string | null;
  /** A workout's: the personal records this set set. */
  records?: RecordKind[];
  /** The same records, with the new best and the one it beat. */
  recordDetails?: RecordDetail[];
}

/** A personal record as a set carries it (backend workout-stats.service). */
export interface RecordDetail {
  kind: RecordKind;
  /** The new best — kg, m, s, s/km, reps or RPE, by kind. */
  value: number;
  /** The best it beat. */
  previous: number | null;
  /** The load / time / distance a keyed record was set at. */
  at?: number;
}

/** One set of the last time an exercise was done — a workout's placeholders
 *  when no plan says what to do. */
export interface PreviousSet {
  setType: SetType;
  metrics: SetMetrics;
}

export interface EditorSuperSetGroup {
  id: string;
  color: string;
  order: number;
}

export interface EditorExercise {
  id: string;
  exerciseId: string;
  order: number;
  /** A plan's instructions, or — in a workout — the trainee's own note. */
  notes: string | null;
  /** A workout's: the plan's note, the notes field's placeholder. */
  planNotes?: string | null;
  /** Per-entry display name override. null = fall back to exercise.name. */
  customName: string | null;
  superSetGroupId: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Metrics selected for this exercise entry (subset of exercise.metrics) */
  metrics: Metric[];
  compositeMetrics: CompositeMetric[];
  /** Raw per-exercise column override. Empty means "follow the company order";
   *  echo it back untouched on save so an entry isn't accidentally pinned. */
  metricOrder: string[];
  /** Render order, derived server-side from `metricOrder` + the company order.
   *  Always populated, which is what lets the public TV — with no company
   *  context of its own — draw the same column order as the editor. */
  resolvedMetricOrder: string[];
  exercise: Pick<
    Exercise,
    | 'id'
    | 'name'
    | 'metrics'
    | 'compositeMetrics'
    | 'targetMuscles'
    | 'equipments'
    | 'imageUrls'
    | 'gifUrls'
  >;
  sets: EditorSet[];
  /** A workout's: done, skipped or still to do. */
  status?: ExerciseProgressStatus;
  completedAt?: string | null;
  /** A workout's: the whole-day records (session volume, distance). */
  records?: RecordKind[];
  recordDetails?: RecordDetail[];
  /** A workout's (while under way): what was logged the last time this
   *  exercise was done, before this workout. */
  previousSets?: PreviousSet[];
}

export interface EditorBlock {
  id: string;
  /** Null = no block: the loose exercises at the template's own level. */
  name: string | null;
  index: number;
  description?: string | null;
  color: string | null;
  mode: BlockMode;
  createdAt?: string;
  updatedAt?: string;
  exercises: EditorExercise[];
  superSetGroups?: EditorSuperSetGroup[];
}

// ─── Workout templates (the plan) ────────────────────────────────────────────

export interface WorkoutTemplateBlock extends EditorBlock {
  workoutTemplateId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  exercises: WorkoutTemplateExercise[];
  superSetGroups?: WorkoutTemplateSuperSetGroup[];
}

export interface WorkoutTemplateSuperSetGroup extends EditorSuperSetGroup {
  blockId: string;
}

export interface WorkoutTemplateExercise extends EditorExercise {
  workoutTemplateBlockId: string;
  createdAt: string;
  updatedAt: string;
  sets: WorkoutTemplateExerciseSet[];
}

/** A planned set: `metrics` may be a target in any mode (8–12 reps). */
export interface WorkoutTemplateExerciseSet extends EditorSet {
  subSets?: WorkoutTemplateExerciseSet[];
}

// ─── Workouts (what was actually trained) ────────────────────────────────────

/** The personal records a set or a day can set (backend personal-records.ts). */
export type RecordKind =
  | 'MAX_WEIGHT'
  | 'BEST_E1RM'
  | 'BEST_SET_VOLUME'
  | 'BEST_SESSION_VOLUME'
  | 'REPS_AT_WEIGHT'
  | 'EFFORT_AT_LOAD'
  | 'MAX_REPS'
  | 'MAX_DURATION'
  | 'MAX_DISTANCE'
  | 'BEST_SESSION_DISTANCE'
  | 'DISTANCE_AT_TIME'
  | 'TIME_AT_DISTANCE'
  | 'BEST_PACE';

/** A workout's set: what was done (exact values, no mode), the plan's target
 *  and the tick. */
export interface WorkoutExerciseSet extends EditorSet {
  targetMetrics: SetMetrics | null;
  completedAt: string | null;
  subSets?: WorkoutExerciseSet[];
}

export interface WorkoutExercise extends EditorExercise {
  workoutBlockId: string;
  /** The plan entry it was cloned from. */
  sourceTemplateExerciseId: string | null;
  status: ExerciseProgressStatus;
  completedAt: string | null;
  sets: WorkoutExerciseSet[];
}

export interface WorkoutBlock extends EditorBlock {
  workoutId: string;
  exercises: WorkoutExercise[];
}

/** The center session a workout records, when it was trained in one. */
export interface WorkoutSessionContext {
  id: string;
  sessionId: string;
  session: {
    id: string;
    startsAt: string;
    endsAt: string;
    service: Pick<Service, 'id' | 'name' | 'color'> | null;
    center: {
      id: string;
      name: string;
      companyId: string;
      company: { id: string; commercialName: string } | null;
    };
  };
}

/** One real training: GET /workouts/:id. */
export interface Workout {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  notes: string | null;
  workoutTemplateId: string | null;
  sessionUserId: string | null;
  startedAt: string;
  finishedAt: string | null;
  touchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workoutTemplate: {
    id: string;
    name: string;
    companyId: string | null;
    assignedByCompanyId: string | null;
  } | null;
  sessionUser: WorkoutSessionContext | null;
  blocks: WorkoutBlock[];
  /** Whether the caller may change it (a member: their own; staff: a session's
   *  of their company). */
  editable: boolean;
}

/** The TV's and the board's copy of a client's workout (the board's has no
 *  exercise media). */
export interface LiveWorkout extends Pick<
  Workout,
  'id' | 'name' | 'description' | 'startedAt' | 'finishedAt'
> {
  blocks: WorkoutBlock[];
}

/** A row of a workout history (GET /me/workouts, /users/:id/workouts). */
export interface WorkoutSummary {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  durationMinutes: number | null;
  workoutTemplate: { id: string; name: string } | null;
  session: {
    id: string;
    startsAt: string;
    endsAt: string;
    service: Pick<Service, 'id' | 'name' | 'color'> | null;
    center: {
      id: string;
      name: string;
      company: { id: string; name: string } | null;
    };
  } | null;
  exercises: number;
  exercisesDone: number;
  setsDone: number;
  /** Kilos moved: weight × reps over every ticked working set. */
  volume: number;
  records: number;
  exerciseNames: string[];
}

export interface ActiveWorkout extends WorkoutSummary {
  sessionUserId: string | null;
}

/** A set as a reference shows it: the plan's (any mode) or a past one's. */
export interface ReferenceSet {
  setType: SetType;
  metrics: SetMetrics;
  notes: string | null;
  completed?: boolean;
  subSets?: ReferenceSet[];
}

export interface WorkoutPerformance {
  workoutId: string;
  workoutName: string;
  performedAt: string;
  /** What the person wrote about the exercise that time. */
  notes: string | null;
  sets: ReferenceSet[];
}

/** GET /workouts/:id/exercises/:entryId/references */
export interface WorkoutReferences {
  plan: ReferenceSet[] | null;
  /** The plan's note on the exercise. */
  planNotes: string | null;
  last: WorkoutPerformance | null;
  lastInTemplate: WorkoutPerformance | null;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface BestValue {
  value: number;
  workoutId: string;
  performedAt: string;
  setId: string | null;
  weightKg?: number | null;
  reps?: number | null;
}

export interface ExerciseBests {
  maxWeight: BestValue | null;
  bestE1rm: BestValue | null;
  bestSetVolume: BestValue | null;
  bestSessionVolume: BestValue | null;
  maxReps: BestValue | null;
  maxDuration: BestValue | null;
  maxDistance: BestValue | null;
  bestSessionDistance: BestValue | null;
  bestPace: BestValue | null;
  repMaxes: {
    reps: number;
    weightKg: number;
    workoutId: string;
    performedAt: string;
  }[];
}

export interface RecordEvent {
  kind: RecordKind;
  value: number;
  previous: number | null;
  setId: string | null;
  workoutId: string;
  workoutName: string | null;
  entryId: string;
  performedAt: string;
  /** The load (kg), time (s) or distance (m) a keyed record was set at. */
  at?: number;
  weightKg?: number | null;
  reps?: number | null;
}

/** One workout's numbers for one exercise — a point on its charts. */
export interface ExerciseSessionPoint {
  workoutId: string;
  workoutName?: string | null;
  workoutTemplate?: { id: string; name: string } | null;
  performedAt: string;
  sets: number;
  totalReps: number | null;
  maxWeight: number | null;
  bestE1rm: number | null;
  bestSetVolume: number | null;
  volume: number | null;
  maxReps: number | null;
  totalDistance: number | null;
  maxDistance: number | null;
  totalDuration: number | null;
  bestPace: number | null;
  avgRpe: number | null;
}

export interface ExerciseProgressReport {
  exercise: Pick<Exercise, 'id' | 'name' | 'imageUrls' | 'targetMuscles'>;
  workouts: number;
  bests: ExerciseBests;
  records: RecordEvent[];
  series: ExerciseSessionPoint[];
}

export interface Routine extends CompanyOwned, Audit {
  id: string;
  name: string;
  description: string | null;
  // Set when the routine is a private snapshot owned by a client (not in the catalog).
  userId?: string | null;
  // Set when the routine was built for one of the client's roadmaps.
  roadmapId?: string | null;
  status: ContentStatus;
  isActive: boolean;
  goals?: GoalLink[];
  workouts?: RoutineWorkout[]; // present on detail responses
  services?: RoutineServiceLink[]; // present on user-routine responses
  _count?: { workouts: number }; // present on list responses
}

// Service associated with a user-owned routine. Drives session workout assignment.
export interface RoutineServiceLink {
  id: string;
  serviceId: string;
  service: Pick<Service, 'id' | 'name' | 'color'>;
}

export interface RoutineWorkout extends Audit {
  id: string;
  routineId: string;
  workoutTemplateId: string;
  order: number;
  notes: string | null;
  workoutTemplate: WorkoutTemplateListItem;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  name: string;
  capacity: number | null;
  color?: string | null;
  // Behaviour flags (also present on the session summary shape). `usesRoutines`:
  // clients follow a routine on the TV — drives the calendar's "no routine"
  // warning, the control board's walk-in sessions and the session dialog.
  hiddenByDefault?: boolean;
  usesRoutines?: boolean;
  // Present on the services CRUD endpoints (not on the session summary shape).
  description?: string | null;
  centerId?: string;
  companyId?: string;
  timpUuid?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { sessions: number };
}

// ─── Live session progress ──────────────────────────────────────────────────

export type ExerciseProgressStatus = 'PENDING' | 'COMPLETED' | 'SKIPPED';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** Present when staff have exactly one centre: it is already baked into the
   *  tokens, so the login skips the picker. */
  center?: SelectableCenter;
}

export interface LoginDto {
  email: string;
  password: string;
}

// A center the current user may select / switch into for their session.
export interface SelectableCenter {
  id: string;
  name: string;
  kind: CenterKind;
  companyId: string;
  company: { id: string; commercialName: string } | null;
}

// Response of POST /auth/select-center — re-issued tokens carrying the center.
export interface SelectCenterResponse {
  accessToken: string;
  refreshToken: string;
  center: SelectableCenter;
}

// ─── Member portal (/me) ──────────────────────────────────────────────────────
// What a CLIENT sees of themselves. A member can train with several companies,
// so everything here carries the company it belongs to.

export interface MemberCompany {
  id: string;
  commercialName: string;
  colorPalette: ColorPalette;
}

/** One company the member trains with; `centers` lists real sites only. */
export interface MemberAffiliation {
  company: MemberCompany;
  centers: { id: string; name: string }[];
  /** False for a solo trainer: no sessions, so no calendar. */
  hasSessions: boolean;
}

export interface MemberProfile {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  alias: string | null;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  avatarUrl: string | null;
  claimedAt: string | null;
  affiliations: MemberAffiliation[];
}

export interface MemberSession {
  id: string;
  startsAt: string;
  endsAt: string;
  center: {
    id: string;
    name: string;
    kind: CenterKind;
    company: MemberCompany;
  };
  service: { id: string; name: string; color: string | null } | null;
  professionals: {
    id: string;
    firstName: string;
    lastName: string;
    alias: string | null;
  }[];
  sessionUsers: { id: string; status: SessionUserStatus }[];
}

export interface MemberSessionDetail extends Omit<
  MemberSession,
  'sessionUsers'
> {
  isActive: boolean;
  sessionUser: {
    id: string;
    status: SessionUserStatus;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    /** The plan, for a session not trained (yet). */
    workoutTemplate: WorkoutTemplate | null;
    /** What the member trains — or trained — in it. */
    workout: Workout | null;
  };
}

/** A client routine, plus who made it: a company, or null for their own. */
export interface MemberRoutine extends Routine {
  assignedBy: { id: string; commercialName: string } | null;
}

/** An exercise as a member reads it: the catalog's, their own (userId), or
 *  one of their companies' (companyId) — readable, usable only once copied. */
export type MemberExercise = Exercise;

/** Which exercises GET /me/exercises lists; omitted = every readable one. */
export type MemberExerciseSource = 'catalog' | 'own' | 'centers' | 'usable';

export interface QueryMemberExercisesParams extends QueryExercisesParams {
  source?: MemberExerciseSource;
  /** Only this company's exercises (one the member trains with). */
  companyId?: string;
}

/** One of the member's workouts that uses an exercise. */
export interface MemberExerciseUsage {
  id: string;
  name: string;
  /** Null for the member's own workout. */
  assignedBy: { id: string; commercialName: string } | null;
  routine: { id: string; name: string } | null;
  entryIds: string[];
}

/** What a member may build on their own; null = unlimited. */
export interface MemberLimits {
  routines: number | null;
  workouts: number | null;
  exercises: number | null;
}

export type MemberLimitKey = keyof MemberLimits;

interface MemberPlanSummary {
  key: string;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
}

/** GET /me/plan */
export interface MemberPlan {
  plan: MemberPlanSummary;
  limits: MemberLimits;
  usage: Record<MemberLimitKey, number>;
  upgrade: MemberPlanSummary & {
    limits: MemberLimits;
    /** False until members can pay: the portal shows it as "coming soon". */
    available: boolean;
  };
  /** On a plan Bloom Board gave them (Pro for a friend), not one they pay. */
  comped?: boolean;
}

/** GET /me/sessions/active — the session the member is training in now. */
export interface MemberActiveSession extends Omit<
  MemberSessionDetail,
  'sessionUser'
> {
  sessionUser: MemberSessionDetail['sessionUser'];
  /** The center's TVs, and the one(s) showing the member. */
  screens: { id: string; name: string }[];
  screenIds: string[];
}
