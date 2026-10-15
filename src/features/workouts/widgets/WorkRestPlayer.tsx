import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Check,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Tv,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useUnitSystem } from '@features/units/useUnitSystem';
import { useUnitAcronym } from '@features/editor/hooks/useMetricsCatalog';
import { formatSetMetricChips } from '@features/editor/lib/metric-format';
import { rpeTone } from '@features/editor/lib/rpe';
import { EXERCISE_MEDIA_BG } from '@shared/lib/exercise-media';
import { displayWorkout, workoutInUnits } from '@shared/lib/workout-display';
import { alpha, fonts, radius } from '@shared/theme/theme';
import {
  makeStyles,
  SchemeOverride,
  useTheme,
} from '@shared/theme/ThemeProvider';
import type { EditorBlock } from '@shared/types/api.types';
import { IconButton } from '@shared/ui/Button';
import { Text } from '@shared/ui/Text';
import {
  runElapsedMs,
  skipTarget,
  workedSeconds,
  type ClockRun,
} from '../lib/work-rest-controls';
import { useWorkRestLog, type WorkRestTime } from '../lib/work-rest-log';
import {
  buildWorkRestSlots,
  countdownSeconds,
  isRunOver,
  LEAD_IN_MS,
  totalWorkRestMs,
  workRestStateAt,
  type WorkRestSlot,
} from '../lib/work-rest-timeline';

// The TV's colours (bloomboard-frontend WorkRestPanel): rest is a warm orange,
// never the accent, so the change of interval reads at a glance; done is green.
const REST_COLOR = '#fb923c';
const DONE_COLOR = '#34d399';
const TICK_MS = 100;

const SOUNDS = {
  tick: require('@assets/sounds/work-rest-tick.wav'),
  go: require('@assets/sounds/work-rest-go.wav'),
  rest: require('@assets/sounds/work-rest-rest.wav'),
  finish: require('@assets/sounds/work-rest-finish.wav'),
} as const;
type Cue = keyof typeof SOUNDS;

/**
 * A member running a Work/Rest block on their own: what the TV shows a client
 * when the trainer presses start — the 3-2-1, the work clock over the
 * exercise, the rest clock with the next one, the slot rail and the sounds —
 * full screen on the phone. The same timeline as the wall (work-rest-timeline,
 * ported), on a clock of the member's own; unlike the wall it can pause and
 * skip back or forward an interval (app 2.6.0).
 *
 * What was trained is logged when it closes: each work interval's time on
 * its set's TIME, the set ticked — the planned time when it ran to its end,
 * less when "Siguiente" cut it short (lib/work-rest-controls.ts). The cards
 * take the times into their drafts (lib/work-rest-log.ts). The web has the
 * same player (bloomboard-frontend WorkRestPlayer), without skipping or
 * logging.
 *
 * In a session (`sync`) it plays the session's run instead — the one the
 * board and the TV play: its clock is the server's, and pause and the skips
 * write it, so the trainer and the TV follow, and what they do arrives here.
 * Closing only hides it (the room's run goes on), and it logs nothing: the
 * run marks the block done when it retires (features/member/session-run.ts).
 */
export function WorkRestPlayer({
  block,
  sync,
  onClose,
}: {
  block: EditorBlock;
  sync?: RunSync;
  onClose: () => void;
}) {
  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <SchemeOverride scheme="dark">
        <PlayerBody block={block} sync={sync} onClose={onClose} />
      </SchemeOverride>
    </Modal>
  );
}

/** A session's run, as the player plays and drives it. */
export interface RunSync {
  startedAt: string;
  pausedAt: string | null;
  onPause: (paused: boolean) => void;
  onSeek: (elapsedMs: number) => void;
  /** The clock passed the end and its flourish. */
  onOver: () => void;
}

function PlayerBody({
  block,
  sync,
  onClose,
}: {
  block: EditorBlock;
  sync?: RunSync;
  onClose: () => void;
}) {
  const { t } = useTranslation(['workouts', 'common', 'app']);
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const unitAcronym = useUnitAcronym();
  const unitSystem = useUnitSystem();
  useKeepAwake();

  // A workout's sets start empty, the plan riding along as the target: read
  // them the way the wall does, logged value first and the plan where none —
  // in the member's own units.
  const [slots] = useState(() =>
    buildWorkRestSlots(
      displayWorkout(workoutInUnits({ blocks: [block] }, unitSystem))
        .blocks?.[0],
    ),
  );

  // The run's origin, moved forward by every pause so the clock resumes where
  // it stopped, and moved by a skip to land on another interval.
  const [origin, setOrigin] = useState(() => Date.now());
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The stretches the clock ran between skips, for what each work took.
  const [runs, setRuns] = useState<ClockRun[]>([]);
  const [runFrom, setRunFrom] = useState(0);
  // A session's run keeps ticking through a pause: a resume or a skip from
  // the board moves its origin, and a stale "now" would flash the wrong
  // interval (and its cue) for a frame.
  const ticking = !!sync || pausedAt === null;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [ticking]);
  const elapsedMs = sync
    ? (runElapsedMs(
        { workRestStartedAt: sync.startedAt, workRestPausedAt: sync.pausedAt },
        now,
      ) ?? 0)
    : Math.max(0, (pausedAt ?? now) - origin);
  const paused = sync ? sync.pausedAt !== null : pausedAt !== null;
  const toggleOwnPause = () => {
    if (pausedAt === null) {
      setPausedAt(Date.now());
    } else {
      setOrigin((o) => o + (Date.now() - pausedAt));
      setNow(Date.now());
      setPausedAt(null);
    }
  };
  const skipOwn = (direction: 'back' | 'forward') => {
    const at = Date.now();
    const current = Math.max(0, (pausedAt ?? at) - origin);
    const target = skipTarget(current, slots, direction);
    setRuns((r) => [...r, [runFrom, current]]);
    setRunFrom(target);
    setOrigin((pausedAt ?? at) - target);
    setNow(at);
  };
  // A session's run is the server's: pause and skips write it.
  const togglePause = sync ? () => sync.onPause(!paused) : toggleOwnPause;
  const skip = sync
    ? (direction: 'back' | 'forward') =>
        sync.onSeek(skipTarget(elapsedMs, slots, direction))
    : skipOwn;

  // Closing, by hand or at the end: what was trained goes to its sets. A
  // session's run is the room's: closing only hides it, and it logs nothing.
  const close = () => {
    if (sync) {
      onClose();
      return;
    }
    const trained = workedSeconds(slots, [...runs, [runFrom, elapsedMs]]);
    useWorkRestLog.getState().push(
      trained.flatMap(({ slot, seconds }): WorkRestTime[] => {
        const setId = slot.id.slice(slot.exerciseEntryId.length + 1);
        const entry = block.exercises.find(
          (e) => e.id === slot.exerciseEntryId,
        );
        if (!entry) return [];
        const setIndex = [...entry.sets]
          .sort((a, b) => a.order - b.order)
          .findIndex((s) => s.id === setId);
        return [{ entryId: entry.id, setId, setIndex, seconds }];
      }),
    );
    onClose();
  };

  const state = workRestStateAt(elapsedMs, slots);
  const { phase } = state;
  const slot = state.slotIndex >= 0 ? slots[state.slotIndex] : null;
  const seconds = countdownSeconds(state.remainingMs);
  const resting = phase === 'REST';
  const color =
    phase === 'DONE'
      ? DONE_COLOR
      : resting
        ? REST_COLOR
        : theme.colors.accentInk;
  const intervalMs =
    phase === 'LEAD_IN'
      ? LEAD_IN_MS
      : resting
        ? (slot?.restMs ?? 0)
        : (slot?.workMs ?? 0);
  const fraction = intervalMs > 0 ? state.remainingMs / intervalMs : 0;
  const progress = Math.min(1, elapsedMs / totalWorkRestMs(slots));

  // The same cue keys as the TV: per second in the lead-in (three ticks), per
  // slot in the run (every interval change), once when done.
  const cue: Cue | null =
    phase === 'LEAD_IN'
      ? 'tick'
      : phase === 'WORK'
        ? 'go'
        : phase === 'REST'
          ? 'rest'
          : phase === 'DONE'
            ? 'finish'
            : null;
  const cueKey =
    phase === 'LEAD_IN'
      ? `lead-${seconds}`
      : phase === 'WORK' || phase === 'REST'
        ? `${phase}-${state.slotIndex}`
        : 'done';
  useCueSound(cueKey, cue);

  const over = isRunOver(elapsedMs, slots);
  useEffect(() => {
    // A session's run closes when the server retires it (it leaves the
    // session's payload); asking is what makes it.
    if (over) {
      if (sync) sync.onOver();
      else close();
    }
    // Once, when the run is over: `close` is a new function every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <IconButton
          icon={X}
          size={40}
          accessibilityLabel={t('common:close')}
          onPress={close}
        />
        <View style={styles.headerTitle}>
          <Text
            variant="label"
            weight="bold"
            uppercase
            center
            numberOfLines={1}
          >
            {block.name ?? t('workouts:workRest.title')}
          </Text>
          {/* The run is the room's: the board and the TV play it too. */}
          {sync && (
            <View style={styles.synced}>
              <Tv size={12} color={theme.text(0.6)} />
              <Text variant="micro" muted={0.6} numberOfLines={1}>
                {t('app:workRest.synced')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Everything under the header: a pause covers this, never the close
          button, so the way out stays one tap away. */}
      <View style={styles.body}>
        {phase !== 'DONE' && (
          <SlotRail slots={slots} current={state.slotIndex} color={color} />
        )}

        <View style={styles.stage}>
          {phase === 'DONE' ? (
            <Finished name={block.name ?? ''} />
          ) : phase === 'LEAD_IN' ? (
            <>
              <Text
                style={[styles.countdown, { color: theme.colors.accentInk }]}
              >
                {seconds > 0 ? seconds : t('workouts:workRest.go')}
              </Text>
              {state.next && (
                <>
                  <Demo slot={state.next} widthPct={58} />
                  <ExerciseName slot={state.next} />
                </>
              )}
            </>
          ) : resting ? (
            <>
              <View style={styles.restTop}>
                <Text style={[styles.phase, { color: REST_COLOR }]}>
                  {t('workouts:workRest.rest')}
                </Text>
                <Ring
                  seconds={seconds}
                  fraction={fraction}
                  color={REST_COLOR}
                  size={190}
                />
              </View>
              {state.next && (
                <View style={styles.restBottom}>
                  <Text
                    variant="micro"
                    uppercase
                    muted={0.8}
                    style={styles.spaced}
                  >
                    {t('workouts:workRest.next')}
                  </Text>
                  <Demo slot={state.next} widthPct={52} />
                  <ExerciseName slot={state.next} muted />
                  <MetricChips slot={state.next} unitAcronym={unitAcronym} />
                </View>
              )}
            </>
          ) : slot ? (
            <>
              {/* With no demo to copy, the clock is the subject: rest size. */}
              <Ring
                seconds={seconds}
                fraction={fraction}
                color={theme.colors.accentInk}
                size={slot.media ? 116 : 190}
              />
              <Demo slot={slot} widthPct={100} />
              <MetricChips slot={slot} unitAcronym={unitAcronym} />
              <ExerciseName slot={slot} />
            </>
          ) : null}
        </View>

        <View
          style={[styles.progressTrack, { backgroundColor: alpha(color, 0.2) }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%` as `${number}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>

        {phase === 'WORK' && state.next && (
          <Text
            variant="caption"
            weight="bold"
            center
            muted={0.8}
            numberOfLines={1}
            style={styles.footer}
          >
            {`${t('workouts:workRest.next').toUpperCase()} · ${
              state.next.letter ? `${state.next.letter} · ` : ''
            }${state.next.name}`}
          </Text>
        )}

        {paused && (
          <Pressable
            style={[StyleSheet.absoluteFill, styles.paused]}
            onPress={togglePause}
            accessibilityRole="button"
            accessibilityLabel={t('workouts:workRest.resume')}
          >
            <View style={styles.pausedDisc}>
              <Play size={36} color={theme.colors.foreground} />
            </View>
            <Text variant="heading" uppercase>
              {t('workouts:workRest.paused')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Outside the body, so a pause never covers them: skipping while
          paused lands on the interval and stays paused there. */}
      {phase !== 'DONE' && (
        <View style={styles.controls}>
          <IconButton
            icon={SkipBack}
            size={52}
            accessibilityLabel={t('app:workRest.previous')}
            onPress={() => skip('back')}
          />
          <IconButton
            icon={paused ? Play : Pause}
            variant="primary"
            size={64}
            accessibilityLabel={
              paused
                ? t('workouts:workRest.resume')
                : t('workouts:workRest.pause')
            }
            onPress={togglePause}
          />
          <IconButton
            icon={SkipForward}
            size={52}
            accessibilityLabel={t('app:workRest.next')}
            onPress={() => skip('forward')}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Plays a cue once each time `key` changes, as the TV does. Each cue is its
 * own preloaded player so one landing on the second never waits on a load.
 * Mixes with the member's music instead of stopping it, and sounds with the
 * ringer off (iOS): a gym is where both happen.
 */
function useCueSound(key: string, cue: Cue | null) {
  const tick = useAudioPlayer(SOUNDS.tick);
  const go = useAudioPlayer(SOUNDS.go);
  const rest = useAudioPlayer(SOUNDS.rest);
  const finish = useAudioPlayer(SOUNDS.finish);
  const last = useRef<string | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!cue || key === last.current) return;
    last.current = key;
    const player = { tick, go, rest, finish }[cue];
    void player.seekTo(0).then(() => player.play());
    // The phone may be on the floor or in a pocket: a buzz carries the change
    // of interval too (one per second in the lead-in would be noise).
    if (cue === 'go' || cue === 'rest') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (cue === 'finish') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [key, cue, tick, go, rest, finish]);
}

// ─── Parts ───────────────────────────────────────────────────────────────────

/** The remaining time as a depleting clock face — the TV's WorkRestRing. */
function Ring({
  seconds,
  fraction,
  color,
  size,
}: {
  seconds: number;
  fraction: number;
  color: string;
  size: number;
}) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <View style={{ width: size, height: size }}>
      <Svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth={7}
          stroke={alpha(color, 0.2)}
        />
        <Circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth={7}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, ringStyles.center]}>
        <Text
          style={{
            color,
            fontFamily: fonts.monoBold,
            fontSize: size * 0.4,
            lineHeight: size * 0.5,
          }}
        >
          {seconds}
        </Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

/** The demo on its white ground, as large as the space left allows. An
 *  exercise with no media has none: the clock and the name close up. */
function Demo({ slot, widthPct }: { slot: WorkRestSlot; widthPct: number }) {
  const styles = useStyles();
  if (!slot.media) return null;
  return (
    <View style={styles.demoArea}>
      <Image
        source={{ uri: slot.media }}
        contentFit="contain"
        style={[styles.demo, { width: `${widthPct}%` as `${number}%` }]}
        recyclingKey={slot.id}
      />
    </View>
  );
}

/** Wraps rather than truncates, as on the TV: two lines of a long name beat
 *  one line and an ellipsis. */
function ExerciseName({
  slot,
  muted = false,
}: {
  slot: WorkRestSlot;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <Text variant="title" center muted={muted ? 0.85 : undefined}>
      {slot.letter ? (
        <Text variant="title" color={theme.colors.accentInk}>
          {`${slot.letter} · `}
        </Text>
      ) : null}
      {slot.name}
    </Text>
  );
}

/** The set's other metrics — reps, load, RPE — the prescription to hit. */
function MetricChips({
  slot,
  unitAcronym,
}: {
  slot: WorkRestSlot;
  unitAcronym: (key: string) => string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const chips = formatSetMetricChips(
    slot.extraMetrics,
    slot.metricDefs,
    slot.compositeDefs,
    unitAcronym,
    slot.metricOrder,
  ).slice(0, 4);
  if (!chips.length) return null;
  return (
    <View style={styles.chips}>
      {chips.map((chip) => {
        const tone =
          chip.key.toUpperCase() === 'RPE' ? rpeTone(chip.numeric) : null;
        return (
          <View
            key={chip.key}
            style={[
              styles.chip,
              tone && {
                backgroundColor: alpha(tone.hue, 0.15),
                borderColor: alpha(tone.hue, 0.4),
              },
            ]}
          >
            <Text
              variant="heading"
              color={tone ? tone.ink.dark : theme.colors.foreground}
            >
              {chip.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** One pip per interval, the current one lit — the super-set's sequence at a
 *  glance. Past ~14 it stops being countable; the progress bar carries it. */
function SlotRail({
  slots,
  current,
  color,
}: {
  slots: WorkRestSlot[];
  current: number;
  color: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  if (slots.length > 14) return null;
  return (
    <View style={styles.rail}>
      {slots.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <View
            key={s.id}
            style={[
              styles.pip,
              {
                backgroundColor: active
                  ? color
                  : done
                    ? alpha(color, 0.35)
                    : theme.fill(0.12),
                opacity: active || done ? 1 : 0.55,
                transform: [{ scale: active ? 1.15 : 1 }],
              },
            ]}
          >
            <Text
              variant="micro"
              color={active ? theme.colors.background : theme.colors.foreground}
            >
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Finished({ name }: { name: string }) {
  const { t } = useTranslation(['workouts']);
  const styles = useStyles();
  return (
    <View style={styles.finished}>
      <View style={styles.doneDisc}>
        <Check size={64} color="#ffffff" strokeWidth={4} />
      </View>
      <Text variant="title" center color={DONE_COLOR} uppercase>
        {t('workouts:workRest.finished')}
      </Text>
      {name ? (
        <Text variant="heading" center>
          {name}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerTitle: { flex: 1, alignItems: 'center', gap: 2 },
  headerSpacer: { width: 40 },
  synced: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 10,
  },
  rail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  pip: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  countdown: {
    fontFamily: fonts.monoBold,
    fontSize: 96,
    lineHeight: 112,
  },
  phase: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  restTop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  restBottom: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  spaced: { letterSpacing: 2 },
  demoArea: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demo: {
    maxHeight: '100%',
    aspectRatio: 1,
    borderRadius: radius['2xl'],
    backgroundColor: EXERCISE_MEDIA_BG,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.xl,
    borderWidth: 1,
    backgroundColor: t.fill(0.12),
    borderColor: t.line(0.3),
  },
  progressTrack: { height: 6, width: '100%' },
  progressFill: { height: '100%' },
  footer: { paddingHorizontal: 16, paddingVertical: 10, letterSpacing: 1 },
  paused: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: alpha(t.colors.background, 0.85),
  },
  pausedDisc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.fill(0.1),
  },
  finished: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  doneDisc: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DONE_COLOR,
    shadowColor: DONE_COLOR,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
}));
