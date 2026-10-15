import {
  ChevronDown,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react-native';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { fonts, radius } from '@shared/theme/theme';
import { makeStyles, useTheme } from '@shared/theme/ThemeProvider';
import type { MetricMode } from '@shared/types/api.types';
import { ActionSheet, type SheetAction } from '@shared/ui/ActionSheet';
import { Button } from '@shared/ui/Button';
import { Text } from '@shared/ui/Text';
import type { MetricColDef } from '../constants/metric-field-config';
import { FieldChain, FieldChainContext } from '../lib/field-chain';
import { GridContext } from '../lib/grid-context';
import { gridLayout } from '../lib/grid-layout';
import { METRIC_MODE_SYMBOL, ModeSheet, supportsMode } from './MetricCell';
import { MetricInfoSheet } from './MetricInfoSheet';

/** Fixed columns either side of the metrics, in points. */
export const COL = {
  label: 40,
  type: 44,
  tick: 46,
} as const;

/** How far a swiped set slides to show its Delete. */
const DELETE_WIDTH = 84;

/**
 * The frame of a sets table: one field chain for its inputs, fixed column
 * widths worked out from the room it has (lib/grid-layout.ts — never from the
 * text in them), and a sideways scroll that only engages when the exercise
 * has more columns than the phone is wide.
 */
export function SetGrid({
  cols,
  fixedWidth,
  children,
}: {
  cols: MetricColDef[];
  /** The fixed cells of one row (label, type, tick), together. */
  fixedWidth: number;
  children: ReactNode;
}) {
  const [chain] = useState(() => new FieldChain());
  const [available, setAvailable] = useState(0);
  const [openRow, setOpenRow] = useState<string | null>(null);
  // A column of fixed width (RPE) counts with the fixed cells; the others
  // share the rest.
  const flexible = cols.filter((c) => !c.fixedWidth);
  const fixedCols = cols.reduce(
    (sum, c) => sum + (c.fixedWidth ? c.width : 0),
    0,
  );
  const layout = gridLayout(
    flexible.map((c) => c.width),
    fixedWidth + fixedCols,
    available,
  );
  const widths = new Map<string, number>(
    cols.map((c) => [
      c.key,
      c.fixedWidth ? c.width : layout.widths[flexible.indexOf(c)],
    ]),
  );
  return (
    <FieldChainContext.Provider value={chain}>
      <GridContext.Provider value={{ widths, openRow, setOpenRow }}>
        <View
          onLayout={(e) => setAvailable(Math.floor(e.nativeEvent.layout.width))}
        >
          <ScrollView
            horizontal
            scrollEnabled={layout.overflow}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ width: Math.max(layout.total, available) }}>
              {children}
            </View>
          </ScrollView>
        </View>
      </GridContext.Provider>
    </FieldChainContext.Provider>
  );
}

/** A fixed-width cell (label, badge, tick). */
export function FixedCell({
  width,
  children,
}: {
  width: number;
  children?: ReactNode;
}) {
  return (
    <View style={{ width, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

/** A metric column's cell, as wide as the table gave the column. */
export function MetricColumn({
  col,
  children,
}: {
  col: MetricColDef;
  children?: ReactNode;
}) {
  const width = useContext(GridContext)?.widths.get(col.key) ?? col.width;
  return (
    <View
      style={{
        width,
        paddingHorizontal: 3,
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

/** A row of the table, tinted by its set type (or green once done). */
export function GridRow({
  tint,
  children,
  first,
  last,
}: {
  tint?: string;
  children: ReactNode;
  /** Rounds the tint's top / bottom: a compound set's rows share one. */
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: tint,
        borderTopLeftRadius: tint && first !== false ? radius['2xl'] : 0,
        borderTopRightRadius: tint && first !== false ? radius['2xl'] : 0,
        borderBottomLeftRadius: tint && last !== false ? radius['2xl'] : 0,
        borderBottomRightRadius: tint && last !== false ? radius['2xl'] : 0,
      }}
    >
      {children}
    </View>
  );
}

/**
 * A set (or a sub-set) that slides to the left to show Delete — the column
 * of trash cans it replaces took width every row needed, for an action a
 * member takes now and then. Swiping back, a field taking the focus, another
 * row opening or a tap on the row closes it. Off (`enabled` false) where a
 * set cannot go: read-only, or the last one.
 *
 * The gesture is claimed only for a clearly sideways drag, so the page still
 * scrolls; when the table itself scrolls sideways (more metrics than the
 * phone is wide) the scroll wins, and Delete is in the set type's sheet.
 */
export function SwipeRow({
  id,
  enabled,
  onDelete,
  children,
}: {
  id: string;
  enabled: boolean;
  onDelete: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['common']);
  const grid = useContext(GridContext);
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // What the gesture's handlers read: they are created once.
  const live = useRef({
    open: false,
    start: 0,
    enabled,
    id,
    setOpenRow: grid?.setOpenRow,
  });
  useEffect(() => {
    live.current.enabled = enabled;
    live.current.id = id;
    live.current.setOpenRow = grid?.setOpenRow;
  });

  const [settle] = useState(() => (toOpen: boolean) => {
    live.current.open = toOpen;
    setOpen(toOpen);
    if (toOpen) live.current.setOpenRow?.(live.current.id);
    Animated.spring(x, {
      toValue: toOpen ? -DELETE_WIDTH : 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  });

  // The handlers read `live` only while a finger moves, never in render; the
  // rule cannot tell a gesture callback from a render-time read.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        live.current.enabled &&
        Math.abs(g.dx) > 12 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderGrant: () => {
        x.stopAnimation();
        live.current.start = live.current.open ? -DELETE_WIDTH : 0;
      },
      onPanResponderMove: (_e, g) => {
        const next = live.current.start + g.dx;
        x.setValue(Math.max(-DELETE_WIDTH * 1.25, Math.min(0, next)));
      },
      onPanResponderRelease: (_e, g) => {
        const end = live.current.start + g.dx;
        settle(end < -DELETE_WIDTH / 2 || g.vx < -0.6);
      },
      onPanResponderTerminate: () => settle(live.current.open),
      // Once sideways, the row keeps the gesture: the page must not take it.
      onPanResponderTerminationRequest: () => false,
    }),
  );

  // Another row opened, or a field took the focus: this one closes.
  const openRow = grid?.openRow ?? null;
  useEffect(() => {
    if (openRow !== id && live.current.open) settle(false);
  }, [openRow, id, settle]);
  // Turned off while open (it became the last set, or read-only).
  useEffect(() => {
    if (!enabled && live.current.open) settle(false);
  }, [enabled, settle]);

  return (
    <View style={styles.swipe}>
      {open && (
        <View style={styles.behind}>
          <Pressable
            onPress={() => {
              settle(false);
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common:delete')}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
          >
            <Trash2 size={18} color="#ffffff" />
            <Text variant="caption" weight="bold" color="#ffffff">
              {t('common:delete')}
            </Text>
          </Pressable>
        </View>
      )}
      <Animated.View
        {...responder.panHandlers}
        style={[
          { backgroundColor: theme.colors.background },
          { transform: [{ translateX: x }] },
        ]}
      >
        {children}
        {open && (
          <Pressable
            onPress={() => settle(false)}
            style={StyleSheet.absoluteFill}
            accessibilityLabel={t('common:close')}
          />
        )}
      </Animated.View>
    </View>
  );
}

/**
 * A metric column's header: its acronym and unit ("KG (kg)"). A tap explains
 * the metric (what it measures, how to fill it in). While the mode editor is
 * open, the header doubles as the column's bulk control — a mode is nearly
 * always uniform down a column ("all sets are a rep range") — and shows "·"
 * when the rows disagree.
 */
export function MetricHeader({
  col,
  unitLabel,
  modes,
  onApplyMode,
}: {
  col: MetricColDef;
  unitLabel?: string;
  /** Set while the mode editor is open: the column's modes. */
  modes?: MetricMode[];
  onApplyMode?: (mode: MetricMode) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation(['templates', 'app']);
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);
  if (modes && onApplyMode && supportsMode(col)) {
    const first = modes[0] ?? 'EXACT';
    const mixed = modes.some((m) => m !== first);
    return (
      <MetricColumn col={col}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t(
            'templates:setsEditor.modeEditing.applyToColumn',
          )}
          style={{
            height: 26,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.ink(0.2),
          }}
        >
          <Text variant="micro" accent numberOfLines={1}>
            {col.acronym}
          </Text>
          <Text variant="caption" weight="bold" accent>
            {mixed ? '·' : METRIC_MODE_SYMBOL[first]}
          </Text>
          <ChevronDown size={10} color={theme.colors.accentInk} />
        </Pressable>
        <ModeSheet
          open={open}
          onClose={() => setOpen(false)}
          value={mixed ? null : first}
          title={`${col.label} · ${t('templates:setsEditor.modeEditing.applyToColumn')}`}
          onChange={onApplyMode}
        />
      </MetricColumn>
    );
  }
  return (
    <MetricColumn col={col}>
      <Pressable
        onPress={() => setInfo(true)}
        accessibilityRole="button"
        accessibilityLabel={col.label}
        accessibilityHint={t('app:metricInfo.hint')}
        hitSlop={{ top: 8, bottom: 8 }}
      >
        <Text variant="micro" muted={0.45} center numberOfLines={1} uppercase>
          {col.acronym}
          {unitLabel ? ` (${unitLabel})` : ''}
        </Text>
      </Pressable>
      <MetricInfoSheet
        open={info}
        onClose={() => setInfo(false)}
        col={col}
        unitLabel={unitLabel}
      />
    </MetricColumn>
  );
}

/** The mode editor's banner above the table, with its way out. */
export function ModeEditingBanner({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates', 'common']);
  return (
    <View style={styles.banner}>
      <SlidersHorizontal size={17} color={theme.colors.accentInk} />
      <View style={styles.flex}>
        <Text variant="caption" weight="bold" accent>
          {t('templates:setsEditor.modeEditing.title')}
        </Text>
        <Text variant="caption" muted={0.55}>
          {t('templates:setsEditor.modeEditing.hint')}
        </Text>
      </View>
      <Button label={t('common:done')} size="sm" onPress={onDone} />
    </View>
  );
}

/**
 * A comment on one set, drawn as a full-width row under it. Rare — mostly
 * online coaches programming in detail — so it takes no room until asked for
 * (⋯ → "Comentar series"); a set with a comment always shows it.
 */
export function SetCommentRow({
  value,
  planNotes,
  onChange,
  isReadOnly,
}: {
  value: string;
  /** A workout's: the plan's comment — the placeholder of the trainee's. */
  planNotes?: string | null;
  onChange: (value: string) => void;
  isReadOnly: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useTranslation(['templates']);
  if (isReadOnly) {
    return (
      <Text
        variant="caption"
        muted={value.trim() ? 0.6 : 0.4}
        style={styles.comment}
      >
        {value.trim() ? value : planNotes}
      </Text>
    );
  }
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={planNotes?.trim() || t('templates:setComment.placeholder')}
      placeholderTextColor={theme.text(0.3)}
      accessibilityLabel={t('templates:setComment.label')}
      maxLength={500}
      multiline
      style={[styles.comment, styles.commentInput]}
    />
  );
}

/**
 * The one "add" control under a table. Sets are only added at the end, so a
 * compound set (cluster, drop set…) can only grow while it is the last one:
 * then the button asks whether the new set goes inside it or after it. A
 * super-set adds a set to one of its members: `actions` lists them.
 */
export function AddRowButton({
  label,
  onPress,
  actions,
  sheetTitle,
}: {
  label: string;
  onPress?: () => void;
  actions?: SheetAction[];
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        label={label}
        icon={Plus}
        variant="secondary"
        size="sm"
        fullWidth
        onPress={() => (actions ? setOpen(true) : onPress?.())}
      />
      {actions && (
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title={sheetTitle ?? label}
          actions={actions}
        />
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: t.ink(0.2),
    backgroundColor: t.ink(0.1),
  },
  flex: { flex: 1 },
  comment: {
    paddingHorizontal: COL.type + 4,
    paddingBottom: 6,
  },
  commentInput: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: t.colors.foreground,
    paddingVertical: 2,
  },
  swipe: { overflow: 'hidden' },
  behind: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  delete: {
    width: DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: t.colors.danger,
    borderRadius: radius.xl,
  },
  pressed: { opacity: 0.8 },
}));
